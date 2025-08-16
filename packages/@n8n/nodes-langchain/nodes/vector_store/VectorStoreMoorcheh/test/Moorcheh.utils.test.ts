import { MoorchehClient, createMoorchehClient, type MoorchehCredential } from '../Moorcheh.utils';

// Mock fetch globally
global.fetch = jest.fn();

describe('MoorchehClient', () => {
	let client: MoorchehClient;
	const mockCredentials: MoorchehCredential = {
		apiKey: 'test-api-key',
		baseUrl: 'https://api.moorcheh.ai/v1',
	};

	beforeEach(() => {
		jest.resetAllMocks();
		client = new MoorchehClient(mockCredentials);
	});

	describe('constructor', () => {
		it('should initialize with provided credentials', () => {
			expect(client).toBeInstanceOf(MoorchehClient);
		});

		it('should use default baseUrl when not provided', () => {
			const credentialsWithoutUrl = { apiKey: 'test-key' };
			const clientWithoutUrl = new MoorchehClient(credentialsWithoutUrl);
			expect(clientWithoutUrl).toBeInstanceOf(MoorchehClient);
		});
	});

	describe('makeRequest', () => {
		it('should make successful API request', async () => {
			const mockResponse = { success: true, data: [] };
			(fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue(mockResponse),
			});

			const result = await client.listNamespaces();

			expect(fetch).toHaveBeenCalledWith('https://api.moorcheh.ai/v1/namespaces', {
				method: 'GET',
				headers: {
					'x-api-key': 'test-api-key',
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: undefined,
			});
			expect(result).toEqual([]);
		});

		it('should handle API error', async () => {
			(fetch as jest.Mock).mockResolvedValue({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
			});

			await expect(client.listNamespaces()).rejects.toThrow('Moorcheh API error: 401 Unauthorized');
		});
	});

	describe('createNamespace', () => {
		it('should create vector namespace with dimension', async () => {
			(fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ success: true }),
			});

			await client.createNamespace('test-namespace', 'vector', 1536);

			expect(fetch).toHaveBeenCalledWith('https://api.moorcheh.ai/v1/namespaces', {
				method: 'POST',
				headers: {
					'x-api-key': 'test-api-key',
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: JSON.stringify({
					namespace_name: 'test-namespace',
					type: 'vector',
					vector_dimension: 1536,
				}),
			});
		});

		it('should create text namespace without dimension', async () => {
			(fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ success: true }),
			});

			await client.createNamespace('test-namespace', 'text');

			expect(fetch).toHaveBeenCalledWith('https://api.moorcheh.ai/v1/namespaces', {
				method: 'POST',
				headers: {
					'x-api-key': 'test-api-key',
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: JSON.stringify({
					namespace_name: 'test-namespace',
					type: 'text',
				}),
			});
		});
	});

	describe('listNamespaces', () => {
		it('should return namespaces from direct array response', async () => {
			const mockNamespaces = [
				{ name: 'ns1', type: 'vector' as const, vector_dimension: 1536 },
				{ name: 'ns2', type: 'text' as const },
			];
			(fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue(mockNamespaces),
			});

			const result = await client.listNamespaces();

			expect(result).toEqual(mockNamespaces);
		});

		it('should return namespaces from nested namespaces property', async () => {
			const mockNamespaces = [{ name: 'ns1', type: 'vector' as const }];
			(fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ namespaces: mockNamespaces }),
			});

			const result = await client.listNamespaces();

			expect(result).toEqual(mockNamespaces);
		});

		it('should return namespaces from nested data property', async () => {
			const mockNamespaces = [{ name: 'ns1', type: 'vector' as const }];
			(fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ data: mockNamespaces }),
			});

			const result = await client.listNamespaces();

			expect(result).toEqual(mockNamespaces);
		});

		it('should return empty array for malformed response', async () => {
			(fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ unexpected: 'format' }),
			});

			const result = await client.listNamespaces();

			expect(result).toEqual([]);
		});
	});

	describe('uploadVectors', () => {
		it('should upload vectors to namespace', async () => {
			const vectors = [
				{
					id: 'vec1',
					vector: [1, 2, 3],
					metadata: { content: 'test content' },
				},
			];

			(fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ success: true }),
			});

			await client.uploadVectors('test-namespace', vectors);

			expect(fetch).toHaveBeenCalledWith(
				'https://api.moorcheh.ai/v1/namespaces/test-namespace/vectors',
				{
					method: 'POST',
					headers: {
						'x-api-key': 'test-api-key',
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body: JSON.stringify({
						vectors: [
							{
								id: 'vec1',
								vector: [1, 2, 3],
								metadata: { content: 'test content' },
							},
						],
					}),
				},
			);
		});

		it('should handle vectors without metadata', async () => {
			const vectors = [
				{
					id: 'vec1',
					vector: [1, 2, 3],
				},
			];

			(fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ success: true }),
			});

			await client.uploadVectors('test-namespace', vectors);

			expect(fetch).toHaveBeenCalledWith(
				'https://api.moorcheh.ai/v1/namespaces/test-namespace/vectors',
				{
					method: 'POST',
					headers: {
						'x-api-key': 'test-api-key',
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body: JSON.stringify({
						vectors: [
							{
								id: 'vec1',
								vector: [1, 2, 3],
								metadata: {},
							},
						],
					}),
				},
			);
		});
	});

	describe('deleteVectors', () => {
		it('should delete vectors by ids', async () => {
			(fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ success: true }),
			});

			await client.deleteVectors('test-namespace', ['id1', 'id2']);

			expect(fetch).toHaveBeenCalledWith(
				'https://api.moorcheh.ai/v1/namespaces/test-namespace/vectors/delete',
				{
					method: 'POST',
					headers: {
						'x-api-key': 'test-api-key',
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body: JSON.stringify({
						ids: ['id1', 'id2'],
					}),
				},
			);
		});
	});

	describe('search', () => {
		it('should search with vector query', async () => {
			const mockResults = [
				{
					id: 'result1',
					score: 0.95,
					metadata: { content: 'test result' },
				},
			];

			(fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue(mockResults),
			});

			const result = await client.search([1, 2, 3], ['namespace1'], 5);

			expect(fetch).toHaveBeenCalledWith('https://api.moorcheh.ai/v1/search', {
				method: 'POST',
				headers: {
					'x-api-key': 'test-api-key',
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: JSON.stringify({
					query: [1, 2, 3],
					namespaces: ['namespace1'],
					top_k: 5,
				}),
			});
			expect(result).toEqual(mockResults);
		});

		it('should search with string query', async () => {
			const mockResults = [{ id: 'result1', score: 0.95 }];

			(fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ results: mockResults }),
			});

			const result = await client.search('test query', ['namespace1']);

			expect(fetch).toHaveBeenCalledWith('https://api.moorcheh.ai/v1/search', {
				method: 'POST',
				headers: {
					'x-api-key': 'test-api-key',
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: JSON.stringify({
					query: 'test query',
					namespaces: ['namespace1'],
					top_k: 10,
				}),
			});
			expect(result).toEqual(mockResults);
		});

		it('should handle different response formats', async () => {
			const mockResults = [{ id: 'result1', score: 0.95 }];

			// Test nested data property
			(fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ data: mockResults }),
			});

			const result = await client.search([1, 2, 3], ['namespace1']);

			expect(result).toEqual(mockResults);
		});

		it('should return empty array for malformed response', async () => {
			(fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ unexpected: 'format' }),
			});

			const result = await client.search([1, 2, 3], ['namespace1']);

			expect(result).toEqual([]);
		});
	});

	describe('deleteNamespace', () => {
		it('should delete namespace', async () => {
			(fetch as jest.Mock).mockResolvedValue({
				ok: true,
				json: jest.fn().mockResolvedValue({ success: true }),
			});

			await client.deleteNamespace('test-namespace');

			expect(fetch).toHaveBeenCalledWith('https://api.moorcheh.ai/v1/namespaces/test-namespace', {
				method: 'DELETE',
				headers: {
					'x-api-key': 'test-api-key',
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: undefined,
			});
		});
	});
});

describe('createMoorchehClient', () => {
	it('should create MoorchehClient instance', () => {
		const credentials: MoorchehCredential = {
			apiKey: 'test-key',
			baseUrl: 'https://custom.api.com',
		};

		const client = createMoorchehClient(credentials);

		expect(client).toBeInstanceOf(MoorchehClient);
	});
});
