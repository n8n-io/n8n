import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

import { ActivationErrorsService } from '@/activation-errors.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

@Service()
export class ActiveWorkflowsService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowSharingService: WorkflowSharingService,
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

		const hasFullAccess = hasGlobalScope(user, 'workflow:read');
		if (hasFullAccess) {
			return activeWorkflowIds.filter((workflowId) => !activationErrors[workflowId]);
		}

		// Every ID here is a workflow the requesting user specifically has
		// workflow:read access to.
		const accessibleWorkflowIds = new Set(
			await this.workflowSharingService.getSharedWorkflowIds(user, { scopes: ['workflow:read'] }),
		);
		return activeWorkflowIds.filter(
			(workflowId) => accessibleWorkflowIds.has(workflowId) && !activationErrors[workflowId],
		);
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
