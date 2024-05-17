import { ExecutionService } from './execution.service';
import type { ExecutionRequest } from './execution.types';
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

	async findOne(
		req: ExecutionRequest.GetOne,
		sharedWorkflowIds: string[],
	): Promise<IExecutionResponse | IExecutionFlattedResponse | undefined> {
		const execution = await this.executionService.findOne(req, sharedWorkflowIds);

		if (!execution) return;

		const workflow = (await this.workflowRepository.get({
			id: execution.workflowId,
		})) as WorkflowWithSharingsAndCredentials;

		if (!workflow) return;

		const workflowWithSharingsMetaData =
			this.enterpriseWorkflowService.addOwnerAndSharings(workflow);
		await this.enterpriseWorkflowService.addCredentialsToWorkflow(
			workflowWithSharingsMetaData,
			req.user,
		);

		execution.workflowData = {
			...execution.workflowData,
			homeProject: workflowWithSharingsMetaData.homeProject,
			sharedWithProjects: workflowWithSharingsMetaData.sharedWithProjects,
			usedCredentials: workflowWithSharingsMetaData.usedCredentials,
		} as WorkflowWithSharingsAndCredentials;

		return execution;
	}
}
