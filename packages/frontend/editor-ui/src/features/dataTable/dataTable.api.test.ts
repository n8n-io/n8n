import { deleteDataTableRowsApi } from '@/features/dataTable/dataTable.api';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { expect } from 'vitest';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

describe('dataTable.api', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('deleteDataTableRowsApi', () => {
		it('should make DELETE request with correct parameters', async () => {
			const dataTableId = 'test-dataTable-id';
			const projectId = 'test-project-id';
			const rowIds = [1, 2, 3];

			vi.mocked(makeRestApiRequest).mockResolvedValue(true);

			const result = await deleteDataTableRowsApi(
				{ baseUrl: '/rest', pushRef: 'test-push-ref' },
				dataTableId,
				rowIds,
				projectId,
			);

			expect(makeRestApiRequest).toHaveBeenCalledWith(
				expect.anything(),
				'DELETE',
				`/projects/${projectId}/data-tables/${dataTableId}/rows`,
				{
					filter: {
						type: 'or',
						filters: [
							{ columnName: 'id', condition: 'eq', value: 1 },
							{ columnName: 'id', condition: 'eq', value: 2 },
							{ columnName: 'id', condition: 'eq', value: 3 },
						],
					},
				},
			);
			expect(result).toBe(true);
		});
	});
});
