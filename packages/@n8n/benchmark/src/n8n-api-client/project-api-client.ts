import type { AuthenticatedN8nApiClient } from './authenticated-n8n-api-client';

export class ProjectApiClient {
	constructor(private readonly apiClient: AuthenticatedN8nApiClient) {}

	async getPersonalProject(): Promise<string> {
		const response = await this.apiClient.get<{ data: { id: string } }>('/projects/personal');

		return response.data.data.id;
	}
}
