import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { ActivationErrorsService } from '@/activation-errors.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ProjectScopeService } from '@/permissions.ee/project-scope.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

@Service()
export class ActiveWorkflowsService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly activationErrorsService: ActivationErrorsService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly projectScopeService: ProjectScopeService,
	) {}

	async getAllActiveIdsInStorage() {
		const activationErrors = await this.activationErrorsService.getAll();
		const activeWorkflowIds = await this.workflowRepository.getActiveIds();
		return activeWorkflowIds.filter((workflowId) => !activationErrors[workflowId]);
	}

	async getAllActiveIdsFor(user: User) {
		const activationErrors = await this.activationErrorsService.getAll();
		const activeWorkflowIds = await this.workflowRepository.getActiveIds();

		const projectIds = await this.projectScopeService.getProjectIds(user, ['workflow:list']);

		const listableWorkflowIds =
			// `null` means the user's global role can list workflows in every project
			projectIds === null
				? new Set(activeWorkflowIds)
				: await this.sharedWorkflowRepository.findWorkflowIdsInProjects(
						activeWorkflowIds,
						projectIds,
					);

		return activeWorkflowIds.filter(
			(workflowId) => listableWorkflowIds.has(workflowId) && !activationErrors[workflowId],
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
