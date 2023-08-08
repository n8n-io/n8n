import type { User } from '@db/entities/User';
import { getSharedWorkflowIds } from '@/WorkflowHelpers';
import { ExecutionsService } from './executions.service';
import type { ExecutionRequest } from '@/requests';
import type { IExecutionResponse, IExecutionFlattedResponse } from '@/Interfaces';
import { EEWorkflowsService as EEWorkflows } from '../workflows/workflows.services.ee';
import { WorkflowRepository } from '@/databases/repositories';
import Container from 'typedi';

export class EEExecutionsService extends ExecutionsService {
	/**
	 * Function to get the workflow Ids for a User regardless of role
	 */
	static async getWorkflowIdsForUser(user: User): Promise<string[]> {
		// Get all workflows
		return getSharedWorkflowIds(user);
	}

	static async getExecution(
		req: ExecutionRequest.Get,
	): Promise<IExecutionResponse | IExecutionFlattedResponse | undefined> {
		const execution = await super.getExecution(req);

		if (!execution) return;

		const workflow = Container.get(WorkflowRepository).create(execution.workflowData);

		EEWorkflows.addOwnerAndSharings(workflow);
		await EEWorkflows.addCredentialsToWorkflow(workflow, req.user);

		execution.workflowData = workflow;

		return execution;
	}
}
