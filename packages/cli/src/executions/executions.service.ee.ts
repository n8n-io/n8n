import Container from 'typedi';
import type { User } from '@db/entities/User';
import { ExecutionsService } from './executions.service';
import type { ExecutionRequest } from './execution.request';
import type { IExecutionResponse, IExecutionFlattedResponse } from '@/Interfaces';
import { EnterpriseWorkflowService } from '../workflows/workflow.service.ee';
import type { WorkflowWithSharingsAndCredentials } from '@/workflows/workflows.types';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { WorkflowSharingService } from '@/workflows/workflowSharing.service';

export class EnterpriseExecutionsService extends ExecutionsService {
	/**
	 * Function to get the workflow Ids for a User regardless of role
	 */
	static async getWorkflowIdsForUser(user: User): Promise<string[]> {
		// Get all workflows
		return Container.get(WorkflowSharingService).getSharedWorkflowIds(user);
	}

	static async getExecution(
		req: ExecutionRequest.Get,
	): Promise<IExecutionResponse | IExecutionFlattedResponse | undefined> {
		const execution = await super.getExecution(req);

		if (!execution) return;

		const relations = ['shared', 'shared.user', 'shared.role'];

		const workflow = (await Container.get(WorkflowRepository).get(
			{ id: execution.workflowId },
			{ relations },
		)) as WorkflowWithSharingsAndCredentials;
		if (!workflow) return;

		const enterpriseWorkflowService = Container.get(EnterpriseWorkflowService);

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
