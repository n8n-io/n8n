import { Service } from '@n8n/di';
import { Logger } from 'n8n-core';

import { ActivationErrorsService } from '@/activation-errors.service';
import type { User } from '@/databases/entities/user';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

@Service()
export class ActiveWorkflowsService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly activationErrorsService: ActivationErrorsService,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	async getAllActiveIdsInStorage() {
		const activationErrors = await this.activationErrorsService.getAll();
		const activeWorkflowIds = await this.workflowRepository.getActiveIds();
		return activeWorkflowIds.filter((workflowId) => !activationErrors[workflowId]);
	}

	async getAllActiveIdsFor(user: User) {
		const activationErrors = await this.activationErrorsService.getAll();
		const activeWorkflowIds = await this.workflowRepository.getActiveIds();

		const hasFullAccess = user.hasGlobalScope('workflow:list');
		if (hasFullAccess) {
			return activeWorkflowIds.filter((workflowId) => !activationErrors[workflowId]);
		}

		const sharedWorkflowIds =
			await this.sharedWorkflowRepository.getSharedWorkflowIds(activeWorkflowIds);
		return sharedWorkflowIds.filter((workflowId) => !activationErrors[workflowId]);
	}

	async getActivationError(workflowId: string, user: User) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);
		if (!workflow) {
			this.logger.warn('User attempted to access workflow errors without permissions', {
				workflowId,
				userId: user.id,
			});

			throw new BadRequestError(`Workflow with ID "${workflowId}" could not be found.`);
		}

		return await this.activationErrorsService.get(workflowId);
	}
}
