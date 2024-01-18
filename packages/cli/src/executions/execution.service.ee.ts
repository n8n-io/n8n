import { ExecutionService } from './execution.service';
import type { ExecutionRequest } from './execution.request';
import type { IExecutionResponse, IExecutionFlattedResponse } from '@/Interfaces';
import { EnterpriseWorkflowService } from '../workflows/workflow.service.ee';
import type { WorkflowWithSharingsAndCredentials } from '@/workflows/workflows.types';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { Service } from 'typedi';

@Service()
export class EnterpriseExecutionsService {
	constructor(
		private readonly executionService: ExecutionService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly enterpriseWorkflowService: EnterpriseWorkflowService,
	) {}

	async getExecution(
		req: ExecutionRequest.Get,
		sharedWorkflowIds: string[],
	): Promise<IExecutionResponse | IExecutionFlattedResponse | undefined> {
		const execution = await this.executionService.getExecution(req, sharedWorkflowIds);

		if (!execution) return;

		const relations = ['shared', 'shared.user', 'shared.role'];

		const workflow = (await this.workflowRepository.get(
			{ id: execution.workflowId },
			{ relations },
		)) as WorkflowWithSharingsAndCredentials;

		if (!workflow) return;

		this.enterpriseWorkflowService.addOwnerAndSharings(workflow);
		await this.enterpriseWorkflowService.addCredentialsToWorkflow(workflow, req.user);

		execution.workflowData = {
			...execution.workflowData,
			ownedBy: workflow.ownedBy,
			sharedWith: workflow.sharedWith,
			usedCredentials: workflow.usedCredentials,
		} as WorkflowWithSharingsAndCredentials;

		return execution;
	}
}
