import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import {
	activityDataMaxLength,
	ActivityEventRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
} from '@n8n/db';
import type { ActivityEventInput } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IDataObject, INode, IWorkflowBase } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { EventRelay } from '@/events/relays/event-relay';

/** Carried by nearly every core node type. Dropping it buys room inside the `data` budget. */
const CORE_NODE_TYPE_PREFIX = 'n8n-nodes-base.';

/** Enough distinct types to show what a user reached for, few enough to leave room for the rest. */
const maxListedNodeTypes = 5;

/** An entry that resolves no project, since one written without a project could never be read. */
type UnresolvedProject = { projectId: string | undefined };

/**
 * Records recent instance activity to `activity_event`, so a consumer can be handed what has been
 * happening rather than spending a round trip discovering it.
 *
 * Registered from `BaseCommand` as a core relay. Every event it listens for is emitted from a
 * request path, so today only a main writes rows — but the record itself is not specific to one
 * consumer, and keeping the writer beside the core table it fills means a later consumer does not
 * have to reach across a module boundary. On a process that emits none of these, the flag check
 * below is the entire cost.
 *
 * Not recorded, because the events carry too little to render a useful entry: data tables and
 * folders (no name, no acting user), agents (only an id), projects and source control. Executions
 * are not recorded either, by decision — `execution_entity` already holds every run and indexes the
 * read a feed wants, so a row per run would duplicate it at the same cardinality and pay for it
 * with an insert on the execution hot path.
 */
@Service()
export class ActivityEventRelay extends EventRelay {
	constructor(
		eventService: EventService,
		private readonly activityEventRepository: ActivityEventRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {
		super(eventService);
		this.logger = this.logger.scoped('activity-log');
	}

	init() {
		// Checked once, so a disabled instance registers no listeners and pays nothing per event.
		if (!this.globalConfig.activityLog.enabled) return;

		this.setupListeners({
			'workflow-created': this.guard(async (e) => await this.onWorkflowCreated(e)),
			'workflow-saved': this.guard(async (e) => await this.onWorkflowSaved(e)),
			'workflow-activated': this.guard(async (e) => await this.onPublishToggled(e, 'published')),
			'workflow-deactivated': this.guard(
				async (e) => await this.onPublishToggled(e, 'unpublished'),
			),
			'workflow-archived': this.guard(async (e) => await this.onWorkflowFlagged(e, 'archived')),
			'workflow-unarchived': this.guard(async (e) => await this.onWorkflowFlagged(e, 'unarchived')),
			'workflow-deleted': this.guard(async (e) => await this.onWorkflowDeleted(e)),
			'workflow-version-updated': this.guard(async (e) => await this.onWorkflowVersionUpdated(e)),
			'credentials-created': this.guard(async (e) => await this.onCredentialCreated(e)),
			'credentials-updated': this.guard(async (e) => await this.onCredentialUpdated(e)),
			'credentials-deleted': this.guard(async (e) => await this.onCredentialDeleted(e)),
		});
	}

	/**
	 * Wraps a listener so nothing it does can escape. Shaping an entry has to be as safe as writing
	 * one — a malformed payload throwing while a delta is computed would reject inside an async
	 * listener that nobody awaits, which is an unhandled rejection rather than a lost row.
	 */
	private guard<T>(handle: (event: T) => Promise<void>) {
		return async (event: T) => {
			try {
				await handle(event);
			} catch (error) {
				this.logger.warn('Failed to handle an event for the activity log', { error });
			}
		};
	}

	// #region Workflows

	private async onWorkflowCreated({
		user,
		workflow,
		projectId,
		source,
	}: RelayEventMap['workflow-created']) {
		await this.record({
			category: 'workflow',
			action: 'created',
			userId: user.id,
			projectId,
			resourceType: 'workflow',
			resourceId: workflow.id,
			resourceName: workflow.name,
			data: { ...provenance(source), nodeCount: nodeCount(workflow) },
		});
	}

	/**
	 * The entry the "remember what I changed by hand" case rests on, so it carries provenance and a
	 * node-type delta rather than a bare count: two saves that differ completely would otherwise
	 * look identical.
	 */
	private async onWorkflowSaved(event: RelayEventMap['workflow-saved']) {
		const { user, workflow } = event;

		await this.record({
			category: 'workflow',
			action: 'saved',
			userId: user.id,
			projectId: await this.resolveWorkflowProject(workflow.id),
			resourceType: 'workflow',
			resourceId: workflow.id,
			resourceName: workflow.name,
			data: savedDetail(event),
		});
	}

	private async onPublishToggled(
		{
			user,
			workflowId,
			workflow,
			source,
		}: RelayEventMap['workflow-activated'] | RelayEventMap['workflow-deactivated'],
		action: 'published' | 'unpublished',
	) {
		await this.record({
			category: 'workflow',
			action,
			userId: user.id,
			projectId: await this.resolveWorkflowProject(workflowId),
			resourceType: 'workflow',
			resourceId: workflowId,
			resourceName: workflow.name,
			data: provenance(source),
		});
	}

	/**
	 * Neither event carries a name, and the workflow still exists — so a reader can resolve one at
	 * render time. `resourceName` is the fallback for resources that are gone.
	 */
	private async onWorkflowFlagged(
		{ user, workflowId }: RelayEventMap['workflow-archived'] | RelayEventMap['workflow-unarchived'],
		action: 'archived' | 'unarchived',
	) {
		await this.record({
			category: 'workflow',
			action,
			userId: user.id,
			projectId: await this.resolveWorkflowProject(workflowId),
			resourceType: 'workflow',
			resourceId: workflowId,
		});
	}

	/**
	 * The entry that justifies the table: `workflow_history` cascades on delete, so once a workflow
	 * is gone nothing else records that it existed. Name and project come off the event because both
	 * are resolved before the delete — neither can be recovered here.
	 */
	private async onWorkflowDeleted({
		user,
		workflowId,
		workflowName,
		projectId,
	}: RelayEventMap['workflow-deleted']) {
		await this.record({
			category: 'workflow',
			action: 'deleted',
			userId: user.id,
			projectId,
			resourceType: 'workflow',
			resourceId: workflowId,
			resourceName: workflowName,
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
			projectId: await this.resolveWorkflowProject(workflowId),
			resourceType: 'workflow',
			resourceId: workflowId,
			resourceName: workflowName,
			data: { versionId, ...(versionName ? { versionName } : {}) },
		});
	}

	// #endregion

	// #region Credentials

	private async onCredentialCreated({
		user,
		credentialId,
		credentialName,
		credentialType,
		projectId,
	}: RelayEventMap['credentials-created']) {
		await this.record({
			category: 'credential',
			action: 'created',
			userId: user.id,
			// The public API resolves a project and the UI controller does too, but the field is
			// optional on the event, so fall back rather than drop the entry.
			projectId: projectId ?? (await this.resolveCredentialProject(credentialId)),
			resourceType: 'credential',
			resourceId: credentialId,
			resourceName: credentialName,
			data: { credentialType },
		});
	}

	private async onCredentialUpdated({
		user,
		credentialId,
		credentialName,
		credentialType,
	}: RelayEventMap['credentials-updated']) {
		await this.record({
			category: 'credential',
			action: 'updated',
			userId: user.id,
			projectId: await this.resolveCredentialProject(credentialId),
			resourceType: 'credential',
			resourceId: credentialId,
			resourceName: credentialName,
			data: { credentialType },
		});
	}

	/**
	 * Instance-scoped credentials are not an exception. What is instance-level is the *assignment*
	 * of a credential to a use slot, not the credential, which lives in a project like any other.
	 */
	private async onCredentialDeleted({
		user,
		credentialId,
		credentialName,
		credentialType,
		projectId,
	}: RelayEventMap['credentials-deleted']) {
		await this.record({
			category: 'credential',
			action: 'deleted',
			userId: user.id,
			projectId,
			resourceType: 'credential',
			resourceId: credentialId,
			resourceName: credentialName,
			data: { credentialType },
		});
	}

	// #endregion

	/**
	 * Failing to record activity must never fail the thing being recorded — a full disk should not
	 * lose a workflow save. Logged at warn rather than error: rows are being dropped, which is worth
	 * knowing about, but a broken activity log is not an incident.
	 */
	private async record(input: Omit<ActivityEventInput, 'projectId'> & UnresolvedProject) {
		const { projectId, ...rest } = input;

		if (!projectId) {
			// Writing the row anyway is not an option: every read filters on the project, so an
			// unattributed entry would be stored and then never shown to anybody.
			this.logger.warn('Dropped an activity entry with no project to attribute it to', {
				category: rest.category,
				action: rest.action,
				resourceId: rest.resourceId,
			});
			return;
		}

		try {
			await this.activityEventRepository.record({ ...rest, projectId });
		} catch (error) {
			this.logger.warn('Failed to record an activity entry', {
				category: rest.category,
				action: rest.action,
				error,
			});
		}
	}

	/** One indexed lookup. Only reached for events whose resource still exists. */
	private async resolveWorkflowProject(workflowId: string): Promise<string | undefined> {
		try {
			const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(workflowId);
			return project?.id;
		} catch (error) {
			this.logger.warn('Failed to resolve the project owning a workflow', { workflowId, error });
			return undefined;
		}
	}

	private async resolveCredentialProject(credentialId: string): Promise<string | undefined> {
		try {
			const project =
				await this.sharedCredentialsRepository.findCredentialOwningProject(credentialId);
			return project?.id;
		} catch (error) {
			this.logger.warn('Failed to resolve the project owning a credential', {
				credentialId,
				error,
			});
			return undefined;
		}
	}
}

function nodeCount(workflow: Pick<IWorkflowBase, 'nodes'>): number {
	return workflow.nodes?.length ?? 0;
}

/**
 * `source` is server-set per code path, so it is the authoritative answer to "was this the
 * assistant or the user". `aiBuilderAssisted` comes off the request body, so it is recorded only
 * when set and is the weaker of the two when they disagree.
 */
function provenance(source: string | undefined, aiBuilderAssisted?: boolean): IDataObject {
	return {
		...(source ? { source } : {}),
		...(aiBuilderAssisted ? { aiBuilderAssisted: true } : {}),
	};
}

function shortNodeType(node: INode): string {
	const type = node?.type;
	if (typeof type !== 'string') return 'unknown';

	return type.startsWith(CORE_NODE_TYPE_PREFIX) ? type.slice(CORE_NODE_TYPE_PREFIX.length) : type;
}

function distinctNodeTypes(nodes: INode[] | undefined): Set<string> {
	return new Set((nodes ?? []).map(shortNodeType));
}

/**
 * A delta over the *set of types*, not over node instances: adding a second Slack node says nothing
 * new about what the user reaches for, and `nodeCount` already records that the shape changed.
 */
function nodeTypeDelta(after: INode[] | undefined, before: INode[] | undefined) {
	const beforeTypes = distinctNodeTypes(before);
	const afterTypes = distinctNodeTypes(after);

	return {
		added: [...afterTypes].filter((type) => !beforeTypes.has(type)).sort(),
		removed: [...beforeTypes].filter((type) => !afterTypes.has(type)).sort(),
	};
}

/** Caps a list to the budget, keeping the true size when it had to cut. */
function listNodeTypes(types: string[], listKey: string, totalKey: string): IDataObject {
	if (types.length === 0) return {};
	if (types.length <= maxListedNodeTypes) return { [listKey]: types };

	return { [listKey]: types.slice(0, maxListedNodeTypes), [totalKey]: types.length };
}

function fitsBudget(data: IDataObject): boolean {
	return JSON.stringify(data).length <= activityDataMaxLength;
}

/**
 * Built to fit rather than handed over oversized. The repository replaces an over-budget payload
 * *wholesale* with a truncation marker, which would take `source` with it — and provenance is the
 * one field this entry exists to carry. So detail is shed in order, cheapest signal first, until
 * what is left fits.
 */
function savedDetail(event: RelayEventMap['workflow-saved']): IDataObject {
	const { workflow, previousWorkflow, source, aiBuilderAssisted, settingsChanged } = event;

	const base: IDataObject = {
		...provenance(source, aiBuilderAssisted),
		nodeCount: nodeCount(workflow),
	};

	if (!previousWorkflow) return base;

	const { added, removed } = nodeTypeDelta(workflow.nodes, previousWorkflow.nodes);
	const types = {
		...listNodeTypes(added, 'nodesAdded', 'nodesAddedTotal'),
		...listNodeTypes(removed, 'nodesRemoved', 'nodesRemovedTotal'),
	};
	// Keys only. The before/after values are unbounded, and which settings moved is the signal.
	const changedSettings = Object.keys(settingsChanged ?? {}).sort();

	const candidates: IDataObject[] = [
		{ ...base, ...types, ...(changedSettings.length ? { settingsChanged: changedSettings } : {}) },
		{ ...base, ...types },
		{
			...base,
			...(added.length ? { nodesAddedTotal: added.length } : {}),
			...(removed.length ? { nodesRemovedTotal: removed.length } : {}),
		},
	];

	return candidates.find(fitsBudget) ?? base;
}
