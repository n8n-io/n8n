import { paginatedRequest, buildStrapiUpdateQuery } from '@/utils/strapi-utils';

import { McpRegistryApiClient } from '../mcp-registry-api.client';

jest.mock('@/utils/strapi-utils', () => ({
	paginatedRequest: jest.fn(),
	buildStrapiUpdateQuery: jest.requireActual('@/utils/strapi-utils').buildStrapiUpdateQuery,
}));

const mockPaginatedRequest = paginatedRequest as jest.MockedFunction<typeof paginatedRequest>;

const PRODUCTION_URL = 'https://api.n8n.io/api/mcp-servers';
const STAGING_URL = 'https://api-staging.n8n.io/api/mcp-servers';

describe('McpRegistryApiClient', () => {
	let client: McpRegistryApiClient;
	const originalEnv = process.env.ENVIRONMENT;

	beforeEach(() => {
		jest.clearAllMocks();
		delete process.env.ENVIRONMENT;
		client = new McpRegistryApiClient();
	});

	afterEach(() => {
		if (originalEnv !== undefined) {
			process.env.ENVIRONMENT = originalEnv;
		} else {
			delete process.env.ENVIRONMENT;
		}
	});

	describe('getUrl', () => {
		it('should use production URL by default', async () => {
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchAllServers();

			expect(mockPaginatedRequest).toHaveBeenCalledWith(PRODUCTION_URL, expect.any(Object));
		});

		it('should use staging URL when ENVIRONMENT is staging', async () => {
			process.env.ENVIRONMENT = 'staging';
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchAllServers();

			expect(mockPaginatedRequest).toHaveBeenCalledWith(STAGING_URL, expect.any(Object));
		});

		it('should use production URL when ENVIRONMENT is production', async () => {
			process.env.ENVIRONMENT = 'production';
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchAllServers();

			expect(mockPaginatedRequest).toHaveBeenCalledWith(PRODUCTION_URL, expect.any(Object));
		});
	});

	describe('fetchAllServers', () => {
		it('should call paginatedRequest with pageSize 25', async () => {
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchAllServers();

			expect(mockPaginatedRequest).toHaveBeenCalledWith(PRODUCTION_URL, {
				pagination: { page: 1, pageSize: 25 },
			});
		});

		it('should return servers from paginatedRequest', async () => {
			const mockServers = [
				{ id: 1, name: 'server-a' },
				{ id: 2, name: 'server-b' },
			];
			mockPaginatedRequest.mockResolvedValue(mockServers);

			const result = await client.fetchAllServers();

			expect(result).toEqual(mockServers);
		});
	});

	describe('fetchServersMetadata', () => {
		it('should request only version and updatedAt fields with pageSize 500', async () => {
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchServersMetadata();

			expect(mockPaginatedRequest).toHaveBeenCalledWith(
				PRODUCTION_URL,
				{
					fields: ['version', 'updatedAt'],
					pagination: { page: 1, pageSize: 500 },
				},
				{ throwOnError: true },
			);
		});

		it('should return metadata from paginatedRequest', async () => {
			const mockMetadata = [
				{ id: 1, version: '1.0.0', updatedAt: '2025-01-01' },
				{ id: 2, version: '2.0.0', updatedAt: '2025-01-02' },
			];
			mockPaginatedRequest.mockResolvedValue(mockMetadata);

			const result = await client.fetchServersMetadata();

			expect(result).toEqual(mockMetadata);
		});
	});

	describe('fetchServersByIds', () => {
		it('should fetch servers using filter query built from ids', async () => {
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchServersByIds([1, 2, 3]);

			expect(mockPaginatedRequest).toHaveBeenCalledWith(PRODUCTION_URL, {
				...buildStrapiUpdateQuery([1, 2, 3]),
				pagination: { page: 1, pageSize: 25 },
			});
		});

		it('should return fetched servers', async () => {
			const mockServers = [{ id: 1, name: 'server-a' }];
			mockPaginatedRequest.mockResolvedValue(mockServers);

			const result = await client.fetchServersByIds([1]);

			expect(result).toEqual(mockServers);
		});

		it('should return empty array for empty ids', async () => {
			const result = await client.fetchServersByIds([]);

			expect(result).toEqual([]);
			expect(mockPaginatedRequest).not.toHaveBeenCalled();
		});

		it('should batch ids in chunks of 100', async () => {
			const ids = Array.from({ length: 250 }, (_, i) => i + 1);
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchServersByIds(ids);

			expect(mockPaginatedRequest).toHaveBeenCalledTimes(3);

			// First batch: ids 1-100
			expect(mockPaginatedRequest).toHaveBeenNthCalledWith(1, PRODUCTION_URL, {
				...buildStrapiUpdateQuery(ids.slice(0, 100)),
				pagination: { page: 1, pageSize: 25 },
			});

			// Second batch: ids 101-200
			expect(mockPaginatedRequest).toHaveBeenNthCalledWith(2, PRODUCTION_URL, {
				...buildStrapiUpdateQuery(ids.slice(100, 200)),
				pagination: { page: 1, pageSize: 25 },
			});

			// Third batch: ids 201-250
			expect(mockPaginatedRequest).toHaveBeenNthCalledWith(3, PRODUCTION_URL, {
				...buildStrapiUpdateQuery(ids.slice(200, 250)),
				pagination: { page: 1, pageSize: 25 },
			});
		});

		it('should concatenate results from all batches', async () => {
			const ids = Array.from({ length: 150 }, (_, i) => i + 1);
			const batch1 = [{ id: 1, name: 'server-1' }];
			const batch2 = [{ id: 101, name: 'server-101' }];
			mockPaginatedRequest.mockResolvedValueOnce(batch1).mockResolvedValueOnce(batch2);

			const result = await client.fetchServersByIds(ids);

			expect(result).toEqual([...batch1, ...batch2]);
		});
	});
});
