import { getCommunityNodeTypes, getCommunityNodesMetadata } from '../community-node-types-utils';
import { paginatedRequest } from '../strapi-utils';

jest.mock('../strapi-utils', () => ({
	paginatedRequest: jest.fn(),
}));

const mockPaginatedRequest = paginatedRequest as jest.MockedFunction<typeof paginatedRequest>;

const AI_SDK_VERSION = 1;

describe('community-node-types-utils', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getCommunityNodeTypes', () => {
		it('should call paginatedRequest with correct URL for production', async () => {
			mockPaginatedRequest.mockResolvedValue([]);

			await getCommunityNodeTypes('production', {}, AI_SDK_VERSION);

			expect(mockPaginatedRequest).toHaveBeenCalledWith('https://api.n8n.io/api/community-nodes', {
				includeAiNodesSdkVersion: AI_SDK_VERSION,
				pagination: {
					page: 1,
					pageSize: 25,
				},
			});
		});

		it('should call paginatedRequest with correct URL for staging', async () => {
			mockPaginatedRequest.mockResolvedValue([]);

			await getCommunityNodeTypes('staging', {}, AI_SDK_VERSION);

			expect(mockPaginatedRequest).toHaveBeenCalledWith(
				'https://api-staging.n8n.io/api/community-nodes',
				{
					includeAiNodesSdkVersion: AI_SDK_VERSION,
					pagination: {
						page: 1,
						pageSize: 25,
					},
				},
			);
		});

		it('should pass query string parameters to paginatedRequest', async () => {
			mockPaginatedRequest.mockResolvedValue([]);

			const qs = {
				filters: { packageName: { $eq: 'test-package' } },
				fields: ['name', 'version'],
			};

			await getCommunityNodeTypes('production', qs, AI_SDK_VERSION);

			expect(mockPaginatedRequest).toHaveBeenCalledWith('https://api.n8n.io/api/community-nodes', {
				filters: { packageName: { $eq: 'test-package' } },
				fields: ['name', 'version'],
				includeAiNodesSdkVersion: AI_SDK_VERSION,
				pagination: {
					page: 1,
					pageSize: 25,
				},
			});
		});

		it('should return data from paginatedRequest', async () => {
			const mockData = [
				{ name: 'node1', packageName: 'package1', npmVersion: '1.0.0' },
				{ name: 'node2', packageName: 'package2', npmVersion: '2.0.0' },
			];
			mockPaginatedRequest.mockResolvedValue(mockData as any);

			const result = await getCommunityNodeTypes('production', {}, AI_SDK_VERSION);

			expect(result).toEqual(mockData);
		});
	});

	describe('getCommunityNodesMetadata', () => {
		it('should call paginatedRequest with correct URL for production', async () => {
			mockPaginatedRequest.mockResolvedValue([]);

			await getCommunityNodesMetadata('production', AI_SDK_VERSION);

			expect(mockPaginatedRequest).toHaveBeenCalledWith(
				'https://api.n8n.io/api/community-nodes',
				{
					fields: ['npmVersion', 'name', 'updatedAt'],
					includeAiNodesSdkVersion: AI_SDK_VERSION,
					pagination: {
						page: 1,
						pageSize: 500,
					},
				},
				{ throwOnError: true },
			);
		});

		it('should call paginatedRequest with correct URL for staging', async () => {
			mockPaginatedRequest.mockResolvedValue([]);

			await getCommunityNodesMetadata('staging', AI_SDK_VERSION);

			expect(mockPaginatedRequest).toHaveBeenCalledWith(
				'https://api-staging.n8n.io/api/community-nodes',
				{
					fields: ['npmVersion', 'name', 'updatedAt'],
					includeAiNodesSdkVersion: AI_SDK_VERSION,
					pagination: {
						page: 1,
						pageSize: 500,
					},
				},
				{ throwOnError: true },
			);
		});

		it('should use larger pageSize than getCommunityNodeTypes', async () => {
			mockPaginatedRequest.mockResolvedValue([]);

			await getCommunityNodesMetadata('production', AI_SDK_VERSION);

			const metadataCall = mockPaginatedRequest.mock.calls[0];
			expect(metadataCall[1].pagination.pageSize).toBe(500);

			mockPaginatedRequest.mockClear();

			await getCommunityNodeTypes('production', {}, AI_SDK_VERSION);

			const nodeTypesCall = mockPaginatedRequest.mock.calls[0];
			expect(nodeTypesCall[1].pagination.pageSize).toBe(25);
		});

		it('should request only specific fields', async () => {
			mockPaginatedRequest.mockResolvedValue([]);

			await getCommunityNodesMetadata('production', AI_SDK_VERSION);

			expect(mockPaginatedRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					fields: ['npmVersion', 'name', 'updatedAt'],
				}),
				expect.any(Object),
			);
		});

		it('should return metadata from paginatedRequest', async () => {
			const mockMetadata = [
				{ id: 1, name: 'node1', npmVersion: '1.0.0', updatedAt: '2024-01-01' },
				{ id: 2, name: 'node2', npmVersion: '2.0.0', updatedAt: '2024-01-02' },
			];
			mockPaginatedRequest.mockResolvedValue(mockMetadata as any);

			const result = await getCommunityNodesMetadata('production', AI_SDK_VERSION);

			expect(result).toEqual(mockMetadata);
		});
	});
});
