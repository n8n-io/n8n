import { paginatedRequest } from '@/utils/strapi-utils';

import { McpRegistryApiClient } from '../mcp-registry-api.client';

jest.mock('@/utils/strapi-utils', () => ({
	paginatedRequest: jest.fn(),
}));

const mockPaginatedRequest = paginatedRequest as jest.MockedFunction<typeof paginatedRequest>;

const PRODUCTION_URL = 'https://api.n8n.io/api/mcp-servers';
const STAGING_URL = 'https://api-staging.n8n.io/api/mcp-servers';
const DEV_DEFAULT_URL = 'http://127.0.0.1:1337/api/mcp-servers';

describe('McpRegistryApiClient', () => {
	let client: McpRegistryApiClient;
	const originalEnv = process.env.ENVIRONMENT;
	const originalDevUrl = process.env.N8N_MCP_SERVERS_DEV_URL;

	beforeEach(() => {
		jest.clearAllMocks();
		delete process.env.ENVIRONMENT;
		delete process.env.N8N_MCP_SERVERS_DEV_URL;
		client = new McpRegistryApiClient();
	});

	afterEach(() => {
		if (originalEnv !== undefined) {
			process.env.ENVIRONMENT = originalEnv;
		} else {
			delete process.env.ENVIRONMENT;
		}
		if (originalDevUrl !== undefined) {
			process.env.N8N_MCP_SERVERS_DEV_URL = originalDevUrl;
		} else {
			delete process.env.N8N_MCP_SERVERS_DEV_URL;
		}
	});

	describe('getUrl', () => {
		it('should use production URL by default', async () => {
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchAllServers();

			expect(mockPaginatedRequest).toHaveBeenCalledWith(
				PRODUCTION_URL,
				expect.any(Object),
				expect.any(Object),
			);
		});

		it('should use staging URL when ENVIRONMENT is staging', async () => {
			process.env.ENVIRONMENT = 'staging';
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchAllServers();

			expect(mockPaginatedRequest).toHaveBeenCalledWith(
				STAGING_URL,
				expect.any(Object),
				expect.any(Object),
			);
		});

		it('should use production URL when ENVIRONMENT is production', async () => {
			process.env.ENVIRONMENT = 'production';
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchAllServers();

			expect(mockPaginatedRequest).toHaveBeenCalledWith(
				PRODUCTION_URL,
				expect.any(Object),
				expect.any(Object),
			);
		});

		it('should use the default dev URL when ENVIRONMENT is dev', async () => {
			process.env.ENVIRONMENT = 'dev';
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchAllServers();

			expect(mockPaginatedRequest).toHaveBeenCalledWith(
				DEV_DEFAULT_URL,
				expect.any(Object),
				expect.any(Object),
			);
		});

		it('should use N8N_MCP_SERVERS_DEV_URL override when ENVIRONMENT is dev', async () => {
			process.env.ENVIRONMENT = 'dev';
			process.env.N8N_MCP_SERVERS_DEV_URL = 'http://localhost:9999/api/mcp-servers';
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchAllServers();

			expect(mockPaginatedRequest).toHaveBeenCalledWith(
				'http://localhost:9999/api/mcp-servers',
				expect.any(Object),
				expect.any(Object),
			);
		});

		it('should ignore N8N_MCP_SERVERS_DEV_URL when ENVIRONMENT is not dev', async () => {
			process.env.N8N_MCP_SERVERS_DEV_URL = 'http://localhost:9999/api/mcp-servers';
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchAllServers();

			expect(mockPaginatedRequest).toHaveBeenCalledWith(
				PRODUCTION_URL,
				expect.any(Object),
				expect.any(Object),
			);
		});
	});

	describe('fetchAllServers', () => {
		it('should call paginatedRequest with pageSize 25', async () => {
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchAllServers();

			expect(mockPaginatedRequest).toHaveBeenCalledWith(
				PRODUCTION_URL,
				{
					pagination: { page: 1, pageSize: 25 },
				},
				{ throwOnError: true },
			);
		});

		it('should return servers from paginatedRequest', async () => {
			const mockServers = [{ name: 'server-a' }, { name: 'server-b' }];
			mockPaginatedRequest.mockResolvedValue(mockServers);

			const result = await client.fetchAllServers();

			expect(result).toEqual(mockServers);
		});
	});

	describe('fetchServersMetadata', () => {
		it('should request only slug, version and updatedAt fields with pageSize 500', async () => {
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchServersMetadata();

			expect(mockPaginatedRequest).toHaveBeenCalledWith(
				PRODUCTION_URL,
				{
					fields: ['slug', 'version', 'updatedAt'],
					pagination: { page: 1, pageSize: 500 },
				},
				{ throwOnError: true },
			);
		});

		it('should return metadata from paginatedRequest', async () => {
			const mockMetadata = [
				{ slug: 'server-a', version: '1.0.0', updatedAt: '2025-01-01' },
				{ slug: 'server-b', version: '2.0.0', updatedAt: '2025-01-02' },
			];
			mockPaginatedRequest.mockResolvedValue(mockMetadata);

			const result = await client.fetchServersMetadata();

			expect(result).toEqual(mockMetadata);
		});
	});

	describe('fetchServersBySlugs', () => {
		it('should fetch servers using filter query built from slugs', async () => {
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchServersBySlugs(['server-a', 'server-b', 'server-c']);

			expect(mockPaginatedRequest).toHaveBeenCalledWith(
				PRODUCTION_URL,
				{
					filters: {
						slug: {
							$in: ['server-a', 'server-b', 'server-c'],
						},
					},
					pagination: { page: 1, pageSize: 25 },
				},
				{ throwOnError: true },
			);
		});

		it('should return fetched servers', async () => {
			const mockServers = [{ name: 'server-a' }];
			mockPaginatedRequest.mockResolvedValue(mockServers);

			const result = await client.fetchServersBySlugs(['server-a']);

			expect(result).toEqual(mockServers);
		});

		it('should return empty array for empty slugs', async () => {
			const result = await client.fetchServersBySlugs([]);

			expect(result).toEqual([]);
			expect(mockPaginatedRequest).not.toHaveBeenCalled();
		});

		it('should batch slugs in chunks of 100', async () => {
			const slugs = Array.from({ length: 250 }, (_, i) => `server-${i + 1}`);
			mockPaginatedRequest.mockResolvedValue([]);

			await client.fetchServersBySlugs(slugs);

			expect(mockPaginatedRequest).toHaveBeenCalledTimes(3);

			// First batch: slugs 1-100
			expect(mockPaginatedRequest).toHaveBeenNthCalledWith(
				1,
				PRODUCTION_URL,
				{
					filters: {
						slug: {
							$in: slugs.slice(0, 100),
						},
					},
					pagination: { page: 1, pageSize: 25 },
				},
				{ throwOnError: true },
			);

			// Second batch: slugs 101-200
			expect(mockPaginatedRequest).toHaveBeenNthCalledWith(
				2,
				PRODUCTION_URL,
				{
					filters: {
						slug: {
							$in: slugs.slice(100, 200),
						},
					},
					pagination: { page: 1, pageSize: 25 },
				},
				{ throwOnError: true },
			);

			// Third batch: slugs 201-250
			expect(mockPaginatedRequest).toHaveBeenNthCalledWith(
				3,
				PRODUCTION_URL,
				{
					filters: {
						slug: {
							$in: slugs.slice(200, 250),
						},
					},
					pagination: { page: 1, pageSize: 25 },
				},
				{ throwOnError: true },
			);
		});

		it('should concatenate results from all batches', async () => {
			const slugs = Array.from({ length: 150 }, (_, i) => `server-${i + 1}`);
			const batch1 = [{ name: 'server-1' }];
			const batch2 = [{ name: 'server-101' }];
			mockPaginatedRequest.mockResolvedValueOnce(batch1).mockResolvedValueOnce(batch2);

			const result = await client.fetchServersBySlugs(slugs);

			expect(result).toEqual([...batch1, ...batch2]);
		});
	});
});
