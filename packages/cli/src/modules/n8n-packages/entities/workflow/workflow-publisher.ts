import { Logger } from '@n8n/backend-common';
import type { User, WorkflowEntity } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from 'n8n-workflow';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ProjectService } from '@/services/project.service.ee';
import { WorkflowService } from '@/workflows/workflow.service';

import type { PersistedWorkflowPlanItem } from './workflow-import.types';
import { decideWorkflowPublishingAction } from './workflow-publishing-policy';
import {
	WorkflowPublishingPolicy,
	type WorkflowPublishingContext,
} from './workflow-publishing-policy.types';

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
	) {}

	/**
	 * Fail the import before any writes when {@link WorkflowPublishingPolicy.PublishAll}
	 * is selected and the actor lacks `workflow:publish`. Other policies skip this check;
	 * publish permission is checked per workflow in workflowService
	 */
	async assertCanPublish(
		user: User,
		projectId: string,
		policy: WorkflowPublishingPolicy,
	): Promise<void> {
		if (policy !== WorkflowPublishingPolicy.PublishAll) {
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
	): Promise<WorkflowEntity> {
		const action = decideWorkflowPublishingAction(policy, toPublishingContext(item, workflow));

		if (action === 'noop') {
			return workflow;
		}

		try {
			if (action === 'publish') {
				return await this.workflowService.activateWorkflow(user, workflow.id, {
					versionId: workflow.versionId,
					source: 'import',
				});
			}

			return await this.workflowService.deactivateWorkflow(user, workflow.id, {
				source: 'import',
			});
		} catch (error) {
			// Content import already succeeded; a publish/unpublish failure (e.g. a
			// triggerless workflow under `publish-all`) must not fail the import.
			// Keep the post-save state and surface the reason for diagnostics.
			this.logger.warn('Failed to apply publishing policy to imported workflow', {
				workflowId: workflow.id,
				action,
				error: ensureError(error).message,
			});
			return workflow;
		}
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
