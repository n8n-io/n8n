import { Service } from '@n8n/di';
import type { User } from '@n8n/db';

import { TriggerServiceClient } from './trigger-service-client.stub';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/**
 * Stub service that wraps TriggerServiceClient for active workflows queries
 * This maintains the same interface as the original ActiveWorkflowsService
 */
@Service()
export class ActiveWorkflowsService {
	constructor(private readonly triggerService: TriggerServiceClient) {}

	async getAllActiveIdsInStorage() {
		return await this.triggerService.getAllActiveWorkflowIds();
	}

	async getAllActiveIdsFor(_user: User) {
		// TODO: Filter by user permissions once trigger service supports it
		return await this.triggerService.getAllActiveWorkflowIds();
	}

	async getActivationError(workflowId: string, _user: User) {
		// TODO: Add permission check
		const error = await this.triggerService.getActivationError(workflowId);
		if (!error) {
			throw new BadRequestError(`Workflow with ID "${workflowId}" could not be found.`);
		}
		return error;
	}
}
