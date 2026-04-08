import type { IDataObject, ILoadOptionsFunctions } from 'n8n-workflow';

import { getProjects } from '../methods/listSearch';

describe('Currents listSearch', () => {
	describe('getProjects', () => {
		let mockContext: Partial<ILoadOptionsFunctions>;
		let mockHttpRequest: jest.Mock;

		beforeEach(() => {
			mockHttpRequest = jest.fn();
			mockContext = {
				helpers: {
					httpRequestWithAuthentication: mockHttpRequest,
				} as unknown as ILoadOptionsFunctions['helpers'],
			};
		});

		it('should return projects sorted by name', async () => {
			const mockProjects: IDataObject[] = [
				{ projectId: 'proj2', name: 'Zebra Project' },
				{ projectId: 'proj1', name: 'Alpha Project' },
				{ projectId: 'proj3', name: 'Beta Project' },
			];

			mockHttpRequest.mockResolvedValue({ data: mockProjects });

			const result = await getProjects.call(mockContext as ILoadOptionsFunctions);

			expect(result.results).toEqual([
				{ name: 'Alpha Project', value: 'proj1' },
				{ name: 'Beta Project', value: 'proj3' },
				{ name: 'Zebra Project', value: 'proj2' },
			]);
		});

		it('should filter projects by name (case-insensitive)', async () => {
			const mockProjects: IDataObject[] = [
				{ projectId: 'proj1', name: 'Test Project' },
				{ projectId: 'proj2', name: 'Production' },
				{ projectId: 'proj3', name: 'Testing Environment' },
			];

			mockHttpRequest.mockResolvedValue({ data: mockProjects });

			const result = await getProjects.call(mockContext as ILoadOptionsFunctions, 'test');

			expect(result.results).toEqual([
				{ name: 'Test Project', value: 'proj1' },
				{ name: 'Testing Environment', value: 'proj3' },
			]);
		});

		it('should filter projects by projectId (case-insensitive)', async () => {
			const mockProjects: IDataObject[] = [
				{ projectId: 'ABC123', name: 'Project A' },
				{ projectId: 'DEF456', name: 'Project B' },
				{ projectId: 'abc789', name: 'Project C' },
			];

			mockHttpRequest.mockResolvedValue({ data: mockProjects });

			const result = await getProjects.call(mockContext as ILoadOptionsFunctions, 'abc');

			expect(result.results).toEqual([
				{ name: 'Project A', value: 'ABC123' },
				{ name: 'Project C', value: 'abc789' },
			]);
		});

		it('should handle empty project list', async () => {
			mockHttpRequest.mockResolvedValue({ data: [] });

			const result = await getProjects.call(mockContext as ILoadOptionsFunctions);

			expect(result.results).toEqual([]);
		});

		it('should handle missing data property', async () => {
			mockHttpRequest.mockResolvedValue({});

			const result = await getProjects.call(mockContext as ILoadOptionsFunctions);

			expect(result.results).toEqual([]);
		});

		it('should call API with correct parameters', async () => {
			mockHttpRequest.mockResolvedValue({ data: [] });

			await getProjects.call(mockContext as ILoadOptionsFunctions);

			expect(mockHttpRequest).toHaveBeenCalledWith('currentsApi', {
				method: 'GET',
				url: 'https://api.currents.dev/v1/projects',
			});
		});

		it('should handle projects with missing name gracefully', async () => {
			const mockProjects: IDataObject[] = [
				{ projectId: 'proj1', name: 'Valid Project' },
				{ projectId: 'proj2' }, // missing name - should use projectId as fallback
			];

			mockHttpRequest.mockResolvedValue({ data: mockProjects });

			const result = await getProjects.call(mockContext as ILoadOptionsFunctions);

			// Should use projectId as name fallback when name is missing
			expect(result.results).toEqual([
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'proj2', value: 'proj2' }, // projectId used as name
				{ name: 'Valid Project', value: 'proj1' },
			]);
		});
	});
});
