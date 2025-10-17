import type { DataTable } from '@/n8n-api-client/n8n-api-client.types';

import type { AuthenticatedN8nApiClient } from './authenticated-n8n-api-client';

export class DataTableApiClient {
	constructor(private readonly apiClient: AuthenticatedN8nApiClient) {}

	async getAllDataTables(): Promise<DataTable[]> {
		const response = await this.apiClient.get<{ data: { count: number; data: DataTable[] } }>(
			'/data-tables-global',
		);

		return response.data.data.data;
	}

	async deleteDataTable(projectId: string, dataTableId: DataTable['id']): Promise<void> {
		await this.apiClient.delete(`/projects/${projectId}/data-tables/${dataTableId}`);
	}

	async createDataTable(projectId: string, dataTable: DataTable): Promise<DataTable> {
		const response = await this.apiClient.post<{ data: DataTable }>(
			`/projects/${projectId}/data-tables`,
			{
				...dataTable,
			},
		);

		return response.data.data;
	}
}
