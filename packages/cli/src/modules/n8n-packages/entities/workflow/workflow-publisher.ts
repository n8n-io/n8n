import { Logger } from '@n8n/backend-common';
import type { User, WorkflowEntity } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ProjectService } from '@/services/project.service.ee';
import { WEBHOOK_CONFLICT_MESSAGE } from '@/webhooks/constants';
import { WebhookService } from '@/webhooks/webhook.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { orderBySubWorkflowDependencies } from './sub-workflow-ordering';
import type { PersistedWorkflowOutcome, PersistedWorkflowPlanItem } from './workflow-import.types';
import { decideWorkflowPublishingAction } from './workflow-publishing-policy';
import {
	WorkflowPublishingPolicy,
	type PublishingAction,
	type WorkflowPublishingBlockedReason,
	type WorkflowPublishingContext,
	type WorkflowPublishingOutcome,
} from './workflow-publishing-policy.types';
import type { PackageWorkflowRequirement } from '../../spec/requirements.schema';

export interface WorkflowPublishingResult {
	workflow: WorkflowEntity;
	publishing: WorkflowPublishingOutcome;
}

/** What the publish sweep decided for each workflow, keyed by source workflow id. */
export type PackagePublishingResults = ReadonlyMap<string, WorkflowPublishingResult>;

export interface PackagePublishingRequest {
	user: User;
	/** Every workflow the package wrote, across all of its projects. */
	persisted: PersistedWorkflowOutcome[];
	policy: WorkflowPublishingPolicy;
	/** Package-wide sub-workflow graph, used to publish dependencies first. */
	subWorkflowRequirements: PackageWorkflowRequirement[] | undefined;
}

/**
 * Owns the publish lifecycle of imported workflows: an upfront permission check for
 * {@link WorkflowPublishingPolicy.PublishAll}, and per-workflow publish/unpublish
 * for every policy once the workflow is persisted.
 */
@Service()
export class WorkflowPublisher {
	constructor(
		private readonly logger: Logger,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly workflowService: WorkflowService,
		private readonly webhookService: WebhookService,
	) {}

	/**
	 * Publishes a whole package's freshly written workflows, sub-workflows first.
	 *
	 * Activation rejects a parent whose referenced sub-workflow is not itself published, so this
	 * order is load-bearing — and it can only be resolved once every workflow in the package
	 * exists, which is why publishing is a package-wide sweep rather than part of each write.
	 */
	async applyToPackage({
		user,
		persisted,
		policy,
		subWorkflowRequirements,
	}: PackagePublishingRequest): Promise<PackagePublishingResults> {
		const results = new Map<string, WorkflowPublishingResult>();
		const claimedPaths = new Set<string>();

		for (const outcome of orderBySubWorkflowDependencies(persisted, subWorkflowRequirements)) {
			if (outcome.status === 'skipped') continue;

			const webhookKeys = this.webhookKeysOnPublish(outcome, policy);

			const result = await this.apply(
				user,
				outcome.item,
				outcome.workflow,
				policy,
				outcome.blockedFromPublish,
				webhookKeys.some((key) => claimedPaths.has(key)),
			);

			if (result.publishing.state === 'published') {
				for (const key of webhookKeys) claimedPaths.add(key);
			}

			// Publish reloads the workflow without parentFolder; restore it for the import summary.
			result.workflow.parentFolder =
				result.workflow.parentFolder ??
				outcome.workflow.parentFolder ??
				(outcome.item.action === 'update' ? outcome.item.existing.parentFolder : null) ??
				null;
			results.set(outcome.sourceWorkflowId, result);
		}

		return results;
	}

	/**
	 * Webhooks the workflow would register, empty unless the policy will publish it. The sweep
	 * tracks these itself because activation checks `webhook_entity`, whose rows the publication
	 * service writes asynchronously: a workflow published moments earlier isn't there yet, so the
	 * check passes and the workflow is reported published while its registration fails after.
	 */
	private webhookKeysOnPublish(
		outcome: Extract<PersistedWorkflowOutcome, { status: 'created' | 'updated' }>,
		policy: WorkflowPublishingPolicy,
	): string[] {
		if (outcome.blockedFromPublish) return [];

		const action = decideWorkflowPublishingAction(
			policy,
			toPublishingContext(outcome.item, outcome.workflow),
		);
		if (action !== 'publish') return [];

		return this.webhookService.getStaticWebhookKeys(outcome.workflow.nodes);
	}

	/**
	 * Fail the import before any writes when {@link WorkflowPublishingPolicy.PublishAll}
	 * is selected and the actor lacks `workflow:publish`. Other policies skip this check;
	 * publish permission is checked per workflow in workflowService
	 *
	 * `projectPendingCreation` lets this run before the target project exists: a project the
	 * user is importing as new will be created with them as admin, so they can always publish
	 * in it and there is nothing to look up yet.
	 */
	async assertCanPublish(
		user: User,
		projectId: string,
		policy: WorkflowPublishingPolicy,
		projectPendingCreation = false,
	): Promise<void> {
		if (policy !== WorkflowPublishingPolicy.PublishAll) {
			return;
		}

		if (projectPendingCreation) {
			return;
		}

		const project = await this.projectService.getProjectWithScope(user, projectId, [
			'workflow:publish',
		]);
		if (project) {
			return;
		}

		if (!(await this.projectRepository.existsBy({ id: projectId }))) {
			throw new NotFoundError(`Project not found: ${projectId}`);
		}
		throw new ForbiddenError('You do not have permission to publish workflows in this project.');
	}

	/**
	 * Brings a freshly persisted workflow to the publish state its policy requires.
	 * Returns the workflow as left by the publish action, or unchanged on `noop`.
	 */
	async apply(
		user: User,
		item: PersistedWorkflowPlanItem,
		workflow: WorkflowEntity,
		policy: WorkflowPublishingPolicy,
		blockedReason?: WorkflowPublishingBlockedReason,
		webhookContested = false,
	): Promise<WorkflowPublishingResult> {
		const action = decideWorkflowPublishingAction(policy, toPublishingContext(item, workflow));

		if (action === 'noop') {
			return { workflow, publishing: { state: 'unchanged' } };
		}

		if (action === 'publish' && blockedReason) {
			// A prior published version may still be active after an update; report
			// that the live publish state is unchanged rather than "blocked".
			if (workflow.activeVersionId) {
				return {
					workflow,
					publishing: {
						state: 'unchanged',
						skippedPublishReason: blockedReason,
					},
				};
			}

			return {
				workflow,
				publishing: { state: 'blocked', blockedReason },
			};
		}

		if (action === 'publish' && webhookContested) {
			return this.failed(workflow, action, WEBHOOK_CONFLICT_MESSAGE);
		}

		try {
			if (action === 'publish') {
				return {
					workflow: await this.workflowService.activateWorkflow(user, workflow.id, {
						versionId: workflow.versionId,
						source: 'import',
					}),
					publishing: { state: 'published' },
				};
			}

			return {
				workflow: await this.workflowService.deactivateWorkflow(user, workflow.id, {
					source: 'import',
				}),
				publishing: { state: 'unpublished' },
			};
		} catch (error) {
			return this.failed(workflow, action, ensureError(error).message);
		}
	}

	/**
	 * Content import already succeeded; a publish/unpublish failure (e.g. a triggerless workflow
	 * under `publish-all`) must not fail the import. Keep the post-save state and surface the
	 * reason for diagnostics.
	 */
	private failed(
		workflow: WorkflowEntity,
		action: PublishingAction,
		error: string,
	): WorkflowPublishingResult {
		this.logger.warn('Failed to apply publishing policy to imported workflow', {
			workflowId: workflow.id,
			action,
			error,
		});
		return { workflow, publishing: { state: 'failed', error } };
	}
}

function toPublishingContext(
	item: PersistedWorkflowPlanItem,
	workflow: WorkflowEntity,
): WorkflowPublishingContext {
	return {
		status: item.action === 'create' ? 'created' : 'updated',
		sourcePublished: item.sourcePublished,
		currentlyPublished: !!workflow.activeVersionId,
		isArchived: workflow.isArchived,
	};
}
