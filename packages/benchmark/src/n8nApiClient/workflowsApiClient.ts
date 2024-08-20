import { Workflow } from '@/n8nApiClient/n8nApiClient.types';
import { AuthenticatedN8nApiClient } from './authenticatedN8nApiClient';

export class WorkflowApiClient {
	private readonly apiEndpoint = '/workflows';

	constructor(private readonly apiClient: AuthenticatedN8nApiClient) {}

	async getAllWorkflows(): Promise<Workflow[]> {
		const response = await this.apiClient.get<{ count: number; data: Workflow[] }>(
			this.apiEndpoint,
		);

		return response.data.data;
	}

	async createWorkflow(workflow: unknown): Promise<Workflow> {
		const response = await this.apiClient.post<{ data: Workflow }>(this.apiEndpoint, workflow);

		return response.data.data;
	}

	async activateWorkflow(workflow: Workflow): Promise<Workflow> {
		const response = await this.apiClient.patch<{ data: Workflow }>(
			`${this.apiEndpoint}/${workflow.id}`,
			{
				...workflow,
				active: true,
			},
		);

		return response.data.data;
	}

	async deleteWorkflow(workflowId: Workflow['id']): Promise<void> {
		await this.apiClient.delete(`${this.apiEndpoint}/${workflowId}`);
	}
}
