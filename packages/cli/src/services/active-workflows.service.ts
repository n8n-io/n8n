import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

import { ActivationErrorsService } from '@/activation-errors.service';
import { BadRequestError } from '@n8n/errors';
import { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowSharingService } from '@n8n/backend-services';

@Service()
export class ActiveWorkflowsService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly activationErrorsService: ActivationErrorsService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly workflowPublicationStatusService: WorkflowPublicationStatusService,
	) {}

	async getAllActiveIdsInStorage() {
		return await this.dropActivationFailures(await this.workflowRepository.getActiveIds());
	}

	async getAllActiveIdsFor(user: User) {
		const activeWorkflowIds = await this.workflowRepository.getActiveIds();

		const hasFullAccess = hasGlobalScope(user, 'workflow:read');
		if (hasFullAccess) {
			return await this.dropActivationFailures(activeWorkflowIds);
		}

		// Every ID here is a workflow the requesting user specifically has
		// workflow:read access to.
		const accessibleWorkflowIds = new Set(
			await this.workflowSharingService.getSharedWorkflowIds(user, { scopes: ['workflow:read'] }),
		);
		return await this.dropActivationFailures(
			activeWorkflowIds.filter((workflowId) => accessibleWorkflowIds.has(workflowId)),
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

		// A failed republish never clears the legacy cache. Read the publication error first
		// so a stale runtime error cannot mask it.
		if (this.workflowsConfig.useWorkflowPublicationService) {
			const publicationError = await this.workflowPublicationStatusService.getFailedActivationError(
				workflowId,
				workflow.nodes,
			);
			if (publicationError !== null) return publicationError;
		}
		return await this.activationErrorsService.get(workflowId);
	}

	/**
	 * Drops the ids with a recorded activation failure. A partial publication keeps
	 * its triggers running, so only a failed publication is dropped. Its rows mean
	 * zero live triggers on every path but one. A policy-refused republish marks
	 * every trigger failed, and the previous version keeps running until a restart
	 * or the next publish.
	 */
	private async dropActivationFailures(workflowIds: string[]) {
		const activationErrors = await this.activationErrorsService.getAll();
		const candidates = workflowIds.filter((workflowId) => !activationErrors[workflowId]);
		if (!this.workflowsConfig.useWorkflowPublicationService) return candidates;

		const statuses =
			await this.workflowPublicationStatusService.getListStatusesByWorkflowIds(candidates);
		return candidates.filter((workflowId) => statuses.get(workflowId) !== 'failed');
	}
}
