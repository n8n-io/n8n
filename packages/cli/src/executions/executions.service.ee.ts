import type { User } from '@db/entities/User';
import { getSharedWorkflowIds } from '@/WorkflowHelpers';
import { ExecutionsService } from './executions.service';
import type { ExecutionRequest } from '@/requests';
import type { IExecutionResponse, IExecutionFlattedResponse } from '@/Interfaces';
import { EnterpriseWorkflowService } from '../workflows/workflow.service.ee';
import type { WorkflowWithSharingsAndCredentials } from '@/workflows/workflows.types';
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

		const relations = ['shared', 'shared.user', 'shared.role'];
		const enterpriseWorkflowService = Container.get(EnterpriseWorkflowService);

		const workflow = (await enterpriseWorkflowService.get(
			{ id: execution.workflowId },
			{ relations },
		)) as WorkflowWithSharingsAndCredentials;
		if (!workflow) return;

		enterpriseWorkflowService.addOwnerAndSharings(workflow);
		await enterpriseWorkflowService.addCredentialsToWorkflow(workflow, req.user);

		execution.workflowData = {
			...execution.workflowData,
			ownedBy: workflow.ownedBy,
			sharedWith: workflow.sharedWith,
			usedCredentials: workflow.usedCredentials,
		} as WorkflowWithSharingsAndCredentials;

		return execution;
	}
}
