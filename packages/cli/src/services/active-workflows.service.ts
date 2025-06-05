import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

import { ActivationErrorsService } from '@/activation-errors.service';
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

		const hasFullAccess = hasGlobalScope(user, 'workflow:list');
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
