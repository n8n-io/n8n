import {
	SharedWorkflowRepository,
	WorkflowRepository,
	type OperationContext,
	type WorkflowReviewRequest,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

type BlockedAction = 'submit' | 'review' | 'update';

const BLOCKED_ACTION_TEXT: Record<BlockedAction, string> = {
	submit: 'submitted for review',
	review: 'reviewed',
	update: 'submitted as a new review version',
};

export function assertWorkflowReviewRequestUpdatable(request: WorkflowReviewRequest): void {
	if (request.state === 'closed' || request.decision === 'approved') {
		throw new ConflictError('The review request is no longer open');
	}
}

@Service()
export class WorkflowReviewRequestMutationGuard {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	/** Checks under the lock that the workflow still exists and remains reviewable here. */
	async assertWorkflowStillReviewable(
		workflowId: string,
		expectedProjectId: string,
		ctx: OperationContext,
		action: BlockedAction,
	): Promise<void> {
		const blockedAction = BLOCKED_ACTION_TEXT[action];
		const workflow = await this.workflowRepository.findArchivedState(workflowId, ctx);
		if (!workflow) {
			throw new NotFoundError('Could not find workflow');
		}

		if (workflow.isArchived) {
			throw new BadRequestError(
				`The workflow '${workflowId}' is archived and cannot be ${blockedAction}`,
			);
		}

		const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(workflowId, ctx);
		if (!project) {
			throw new NotFoundError('Could not find workflow');
		}

		if (project.id !== expectedProjectId) {
			throw new ConflictError(
				`The workflow '${workflowId}' moved to another project and cannot be ${blockedAction} here`,
				'Retry from the project that now owns the workflow',
			);
		}
	}
}
