import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ActivityEventRepository, SharedWorkflowRepository } from '@n8n/db';
import type { ActivityEventInput } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ExecutionStatus, IRun, IWorkflowBase } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { EventRelay } from '@/events/relays/event-relay';
import { determineFinalExecutionStatus } from '@/execution-lifecycle/shared/shared-hook-functions';

/**
 * Records recent instance activity to `activity_event`, so the instance agent can be handed what
 * the user has been doing instead of spending a turn discovering it.
 *
 * Registered from `BaseCommand`, not from the instance-ai module: `workflow-post-execute` is
 * emitted wherever the execution ran, which in scaling mode is the worker — and that module loads
 * on `main` only. Registering here covers main, worker and webhook, and one emission still reaches
 * exactly one process, so entries are not duplicated in multi-main.
 *
 * Not yet recorded, because the events carry too little to render a useful entry: data tables and
 * folders (no name, no acting user), agents (`agent-saved` carries only an id), projects and source
 * control. Each needs a richer payload or a resolve step before it earns a row.
 */
@Service()
export class ActivityLogEventRelay extends EventRelay {
	constructor(
		eventService: EventService,
		private readonly activityEventRepository: ActivityEventRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {
		super(eventService);
	}

	init() {
		// Checked once, so a disabled instance carries no listeners and no per-event cost at all.
		if (!this.globalConfig.instanceAi.activityLogEnabled) return;

		this.setupListeners({
			'workflow-created': async (event) => await this.onWorkflowCreated(event),
			'workflow-saved': async (event) => await this.onWorkflowSaved(event),
			'workflow-activated': async (event) =>
				await this.onWorkflowPublishToggled(event, 'published'),
			'workflow-deactivated': async (event) =>
				await this.onWorkflowPublishToggled(event, 'unpublished'),
			'workflow-archived': async (event) => await this.onWorkflowFlagged(event, 'archived'),
			'workflow-unarchived': async (event) => await this.onWorkflowFlagged(event, 'unarchived'),
			'workflow-deleted': async (event) => await this.onWorkflowDeleted(event),
			'workflow-version-updated': async (event) => await this.onWorkflowVersionUpdated(event),
			'workflow-post-execute': async (event) => await this.onWorkflowPostExecute(event),
			'credentials-created': async (event) => await this.onCredentialChanged(event, 'created'),
			'credentials-updated': async (event) => await this.onCredentialChanged(event, 'updated'),
			'credentials-deleted': async (event) => await this.onCredentialChanged(event, 'deleted'),
		});
	}

	// #region Workflows

	private async onWorkflowCreated({
		user,
		workflow,
		projectId,
	}: RelayEventMap['workflow-created']) {
		await this.record({
			category: 'workflow',
			action: 'created',
			userId: user.id,
			projectId,
			resourceType: 'workflow',
			resourceId: workflow.id,
			resourceName: workflow.name,
			data: { nodeCount: nodeCount(workflow) },
		});
	}

	private async onWorkflowSaved({
		user,
		workflow,
		previousWorkflow,
	}: RelayEventMap['workflow-saved']) {
		const before = previousWorkflow ? nodeCount(previousWorkflow) : undefined;
		const after = nodeCount(workflow);

		await this.record({
			category: 'workflow',
			action: 'saved',
			userId: user.id,
			projectId: await this.resolveProjectId(workflow.id),
			resourceType: 'workflow',
			resourceId: workflow.id,
			resourceName: workflow.name,
			// The delta is what tells a reader whether this was a real edit or a rename.
			data: { nodeCount: after, ...(before !== undefined ? { nodeDelta: after - before } : {}) },
		});
	}

	private async onWorkflowPublishToggled(
		{
			user,
			workflowId,
			workflow,
		}: RelayEventMap['workflow-activated'] | RelayEventMap['workflow-deactivated'],
		action: 'published' | 'unpublished',
	) {
		await this.record({
			category: 'workflow',
			action,
			userId: user.id,
			projectId: await this.resolveProjectId(workflowId),
			resourceType: 'workflow',
			resourceId: workflowId,
			resourceName: workflow.name,
		});
	}

	/**
	 * Archiving carries no name on the event, and the workflow still exists — so a reader can
	 * resolve one at render time. `resourceName` is the fallback for resources that are gone.
	 */
	private async onWorkflowFlagged(
		{ user, workflowId }: RelayEventMap['workflow-archived'] | RelayEventMap['workflow-unarchived'],
		action: 'archived' | 'unarchived',
	) {
		await this.record({
			category: 'workflow',
			action,
			userId: user.id,
			projectId: await this.resolveProjectId(workflowId),
			resourceType: 'workflow',
			resourceId: workflowId,
		});
	}

	/**
	 * The one entry whose name can never be recovered later, and no project can be resolved: by the
	 * time this fires the workflow and its sharing rows are gone. It lands at instance level, which
	 * is the honest place for it.
	 */
	private async onWorkflowDeleted({ user, workflowId }: RelayEventMap['workflow-deleted']) {
		await this.record({
			category: 'workflow',
			action: 'deleted',
			userId: user.id,
			resourceType: 'workflow',
			resourceId: workflowId,
		});
	}

	private async onWorkflowVersionUpdated({
		user,
		workflowId,
		workflowName,
		versionId,
		versionName,
	}: RelayEventMap['workflow-version-updated']) {
		await this.record({
			category: 'workflow',
			action: 'version-updated',
			userId: user.id,
			projectId: await this.resolveProjectId(workflowId),
			resourceType: 'workflow',
			resourceId: workflowId,
			resourceName: workflowName,
			data: { versionId, ...(versionName ? { versionName } : {}) },
		});
	}

	// #endregion

	// #region Executions

	/**
	 * Every finished run gets an entry, including the routine successes. Filtering them out here
	 * would throw away the denominator a reader needs to say "ran 43 times, 2 of them failed" —
	 * collapsing repetition is a read-side concern, where the whole window is visible.
	 */
	private async onWorkflowPostExecute({
		executionId,
		userId,
		workflow,
		runData,
		projectId,
	}: RelayEventMap['workflow-post-execute']) {
		if (!workflow.id || !runData) return;

		const status = determineFinalExecutionStatus(runData);
		// A run that is waiting or still going has not happened yet, so it is not activity.
		if (status === 'running' || status === 'waiting' || status === 'new') return;

		await this.record({
			// An evaluation run is a different intent from a production run, and a reader caps them
			// separately: a suite of 50 cases would otherwise bury everything else in the window.
			category: runData.mode === 'evaluation' ? 'eval' : 'execution',
			action: executionAction(status),
			userId: userId ?? null,
			projectId: projectId ?? (await this.resolveProjectId(workflow.id)),
			resourceType: 'workflow',
			resourceId: workflow.id,
			resourceName: workflow.name,
			data: {
				executionId,
				status,
				mode: runData.mode,
				...failureDetail(runData),
			},
		});
	}

	// #endregion

	// #region Credentials

	/**
	 * The events carry a type but never a name, so the type is what a row displays. It is also the
	 * more useful of the two for the agent: "a Slack credential appeared" is the context clue.
	 */
	private async onCredentialChanged(
		event:
			| RelayEventMap['credentials-created']
			| RelayEventMap['credentials-updated']
			| RelayEventMap['credentials-deleted'],
		action: 'created' | 'updated' | 'deleted',
	) {
		await this.record({
			category: 'credential',
			action,
			userId: event.user.id,
			// Only creation carries a project; an update or delete lands at instance level. Resolving
			// one would mean reading the credential's sharing rows on a path that gains little from it.
			projectId: 'projectId' in event ? event.projectId : undefined,
			resourceType: 'credential',
			resourceId: event.credentialId,
			resourceName: event.credentialType,
		});
	}

	// #endregion

	/**
	 * Failing to record activity must never fail the thing being recorded — a full disk should not
	 * lose a workflow save. Logged at debug, because a broken activity log is not an incident.
	 */
	private async record(input: ActivityEventInput) {
		try {
			await this.activityEventRepository.record(input);
		} catch (error) {
			this.logger.debug('Failed to record activity entry', {
				category: input.category,
				action: input.action,
				error,
			});
		}
	}

	/**
	 * Most workflow events carry no project, so it is resolved here — one indexed lookup on
	 * `shared_workflow`. Executions usually carry their own and skip this, but not always: the
	 * project reaches `workflow-post-execute` from the execution data, which not every entry point
	 * populates. Scoping correctly is worth the query on the paths that need it, since a
	 * project-scoped read would otherwise silently miss exactly the runs worth surfacing.
	 * Null when the workflow is already gone, or unowned.
	 */
	private async resolveProjectId(workflowId: string): Promise<string | undefined> {
		try {
			const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(workflowId);
			return project?.id;
		} catch {
			return undefined;
		}
	}
}

function nodeCount(workflow: Pick<IWorkflowBase, 'nodes'>): number {
	return workflow.nodes?.length ?? 0;
}

function executionAction(status: ExecutionStatus): 'succeeded' | 'cancelled' | 'failed' {
	if (status === 'success') return 'succeeded';
	if (status === 'canceled') return 'cancelled';
	return 'failed';
}

/** Which node broke, when one did — the single most useful thing about a failed run. */
function failureDetail(runData: IRun): { failedNode?: string } {
	const { error, lastNodeExecuted } = runData.data.resultData;
	if (!error) return {};

	const errorNode = 'node' in error ? error.node?.name : undefined;
	const failedNode = errorNode ?? lastNodeExecuted;
	return failedNode ? { failedNode } : {};
}
