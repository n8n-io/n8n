import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { WorkflowsApiV1 } from '@n8n/hooks-api';

@Service()
export class PublicWorkflowsService implements WorkflowsApiV1 {
	readonly version = 1;

	constructor(private readonly executionRepository: ExecutionRepository) {}

	async getWorkflowIdForExecution(executionId: string): Promise<string | null> {
		return await this.executionRepository.findWorkflowIdByExecutionId(executionId);
	}
}
