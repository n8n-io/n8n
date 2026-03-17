import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';

import { Databricks } from '../Databricks.node';

const HOST = 'https://adb-123.azuredatabricks.net';
const TOKEN = 'dapi_test_token';

const mockNode: INode = {
	id: 'test-id',
	name: 'Databricks',
	type: 'n8n-nodes-base.databricks',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('Databricks', () => {
	let node: Databricks;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	function setupNodeParameters(params: Record<string, unknown>) {
		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
			(paramName: string, _i: number, fallback?: unknown, options?: { extractValue?: boolean }) => {
				if (options?.extractValue) {
					return params[`${paramName}.value`] ?? params[paramName] ?? fallback;
				}
				return params[paramName] ?? fallback;
			},
		);
	}

	beforeEach(() => {
		node = new Databricks();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();

		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		mockExecuteFunctions.getCredentials.mockResolvedValue({ host: HOST, token: TOKEN });
		(mockExecuteFunctions.helpers.constructExecutionMetaData as jest.Mock).mockImplementation(
			(data: unknown[], opts: { itemData?: { item: number } }) =>
				data.map((item, i) => ({
					...(item as object),
					pairedItem: { item: opts?.itemData?.item ?? i },
				})),
		);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	// ─────────────────────────────────────────────────────────
	// Databricks SQL
	// ─────────────────────────────────────────────────────────

	describe('execute() — Databricks SQL > executeQuery', () => {
		beforeEach(() => {
			setupNodeParameters({
				resource: 'databricksSql',
				operation: 'executeQuery',
				warehouseId: { mode: 'list', value: 'wh-abc123' },
				query: 'SELECT id, name FROM my_table',
			});
		});

		it('returns rows mapped to objects using column names on immediate success', async () => {
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValueOnce({
				statement_id: 'stmt-1',
				status: { state: 'SUCCEEDED' },
				manifest: {
					total_chunk_count: 1,
					schema: { columns: [{ name: 'id' }, { name: 'name' }] },
				},
				result: {
					data_array: [
						['1', 'Alice'],
						['2', 'Bob'],
					],
				},
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([
				[
					{ json: { id: '1', name: 'Alice' }, pairedItem: { item: 0 } },
					{ json: { id: '2', name: 'Bob' }, pairedItem: { item: 0 } },
				],
			]);
			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: `${HOST}/api/2.0/sql/statements`,
					body: { warehouse_id: 'wh-abc123', statement: 'SELECT id, name FROM my_table' },
				}),
			);
		});

		it('polls until SUCCEEDED', async () => {
			jest.spyOn(global, 'setTimeout').mockImplementation((fn: TimerHandler) => {
				(fn as () => void)();
				return 0 as unknown as ReturnType<typeof setTimeout>;
			});

			(mockExecuteFunctions.helpers.httpRequest as jest.Mock)
				.mockResolvedValueOnce({
					statement_id: 'stmt-1',
					status: { state: 'PENDING' },
					manifest: { total_chunk_count: 0 },
				})
				.mockResolvedValueOnce({
					statement_id: 'stmt-1',
					status: { state: 'RUNNING' },
					manifest: { total_chunk_count: 0 },
				})
				.mockResolvedValueOnce({
					statement_id: 'stmt-1',
					status: { state: 'SUCCEEDED' },
					manifest: { total_chunk_count: 1, schema: { columns: [{ name: 'x' }] } },
					result: { data_array: [['42']] },
				});

			const result = await node.execute.call(mockExecuteFunctions);

			// 1 execute POST + 2 status GETs
			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledTimes(3);
			expect(result[0][0].json).toEqual({ x: '42' });
		});

		it('throws when query FAILED', async () => {
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValueOnce({
				statement_id: 'stmt-1',
				status: {
					state: 'FAILED',
					error: { error_code: 'SYNTAX_ERROR', message: 'Bad SQL syntax' },
				},
				manifest: { total_chunk_count: 0 },
			});

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow('FAILED');
		});

		it('fetches additional chunks beyond the first', async () => {
			jest.spyOn(global, 'setTimeout').mockImplementation((fn: TimerHandler) => {
				(fn as () => void)();
				return 0 as unknown as ReturnType<typeof setTimeout>;
			});

			(mockExecuteFunctions.helpers.httpRequest as jest.Mock)
				.mockResolvedValueOnce({
					statement_id: 'stmt-multi',
					status: { state: 'SUCCEEDED' },
					manifest: {
						total_chunk_count: 2,
						schema: { columns: [{ name: 'val' }] },
					},
					result: { data_array: [['chunk0row1']] },
				})
				.mockResolvedValueOnce({ data_array: [['chunk1row1']] });

			const result = await node.execute.call(mockExecuteFunctions);

			// 1 execute POST + 1 chunk GET (chunk 0 is inline, chunk 1 is fetched)
			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledTimes(2);
			expect(result[0]).toHaveLength(2);
			expect(result[0][0].json).toEqual({ val: 'chunk0row1' });
			expect(result[0][1].json).toEqual({ val: 'chunk1row1' });
		});

		it('returns error item when continueOnFail is true and request throws', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockRejectedValue(
				new Error('Network timeout'),
			);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toMatchObject({ error: 'Network timeout' });
		});
	});

	// ─────────────────────────────────────────────────────────
	// Files
	// ─────────────────────────────────────────────────────────

	describe('execute() — Files > uploadFile', () => {
		beforeEach(() => {
			setupNodeParameters({
				resource: 'files',
				operation: 'uploadFile',
				dataFieldName: 'data',
				volumePath: 'main.default.my_volume',
				filePath: 'folder/test.csv',
			});
			mockExecuteFunctions.getInputData.mockReturnValue([
				{
					json: {},
					binary: { data: { mimeType: 'text/csv', data: '', fileName: 'test.csv' } },
				},
			]);
			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(
				Buffer.from('col1,col2\n1,2'),
			);
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue(undefined);
		});

		it('PUTs binary file to the correct Volumes URL', async () => {
			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'PUT',
					url: `${HOST}/api/2.0/fs/files/Volumes/main/default/my_volume/folder/test.csv`,
					encoding: 'arraybuffer',
				}),
			);
		});

		it('uses mimeType from binary item as Content-Type header', async () => {
			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: expect.objectContaining({ 'Content-Type': 'text/csv' }),
				}),
			);
		});

		it('returns success message on upload', async () => {
			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toMatchObject({ success: true });
		});

		it('throws when volumePath has wrong format', async () => {
			setupNodeParameters({
				resource: 'files',
				operation: 'uploadFile',
				dataFieldName: 'data',
				volumePath: 'invalid-path',
				filePath: 'test.csv',
			});

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Volume path must be in format',
			);
		});
	});

	describe('execute() — Files > downloadFile', () => {
		beforeEach(() => {
			setupNodeParameters({
				resource: 'files',
				operation: 'downloadFile',
				volumePath: 'main.default.my_volume',
				filePath: 'report.csv',
			});
		});

		it('returns item with binary data and metadata', async () => {
			const fileContent = Buffer.from('col1,col2\n1,2');
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				headers: {
					'content-type': 'text/csv',
					'content-length': String(fileContent.length),
				},
				body: fileContent,
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toMatchObject({
				fileName: 'report.csv',
				contentType: 'text/csv',
			});
			expect(result[0][0].binary?.data?.mimeType).toBe('text/csv');
		});

		it('detects MIME type from file extension when content-type is generic', async () => {
			setupNodeParameters({
				resource: 'files',
				operation: 'downloadFile',
				volumePath: 'main.default.my_volume',
				filePath: 'image.png',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				headers: { 'content-type': 'application/octet-stream' },
				body: Buffer.from(''),
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toMatchObject({ contentType: 'image/png' });
		});

		it('returns error item when download fails and continueOnFail is true', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockRejectedValue(
				new Error('File not found'),
			);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toMatchObject({ error: 'File not found' });
		});
	});

	describe('execute() — Files > deleteFile', () => {
		it('sends DELETE to correct URL and returns success', async () => {
			setupNodeParameters({
				resource: 'files',
				operation: 'deleteFile',
				volumePath: 'main.default.vol',
				filePath: 'path/to/file.txt',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue(undefined);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'DELETE',
					url: `${HOST}/api/2.0/fs/files/Volumes/main/default/vol/path/to/file.txt`,
				}),
			);
			expect(result[0][0].json).toMatchObject({ success: true });
		});
	});

	describe('execute() — Files > getFileInfo', () => {
		it('returns file headers in json output', async () => {
			setupNodeParameters({
				resource: 'files',
				operation: 'getFileInfo',
				volumePath: 'main.default.vol',
				filePath: 'report.pdf',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				headers: {
					'content-type': 'application/pdf',
					'content-length': '1024',
					'last-modified': 'Mon, 01 Jan 2024 00:00:00 GMT',
				},
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toMatchObject({
				contentType: 'application/pdf',
				contentLength: '1024',
			});
		});
	});

	describe('execute() — Files > listDirectory', () => {
		it('returns directory listing response', async () => {
			setupNodeParameters({
				resource: 'files',
				operation: 'listDirectory',
				volumePath: 'main.default.vol',
				directoryPath: 'data/',
				additionalFields: {},
			});
			const listing = { contents: [{ name: 'file1.csv', is_directory: false }] };
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue(listing);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toEqual(listing);
			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: `${HOST}/api/2.0/fs/directories/Volumes/main/default/vol/data/`,
				}),
			);
		});
	});

	describe('execute() — Files > createDirectory', () => {
		it('PUTs to directories URL and returns success', async () => {
			setupNodeParameters({
				resource: 'files',
				operation: 'createDirectory',
				volumePath: 'main.default.vol',
				directoryPath: 'new_folder',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue(undefined);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'PUT',
					url: `${HOST}/api/2.0/fs/directories/Volumes/main/default/vol/new_folder`,
				}),
			);
			expect(result[0][0].json).toMatchObject({ success: true });
		});
	});

	// ─────────────────────────────────────────────────────────
	// Genie
	// ─────────────────────────────────────────────────────────

	describe('execute() — Genie', () => {
		it('startConversation POSTs to correct URL with initial message', async () => {
			setupNodeParameters({
				resource: 'genie',
				operation: 'startConversation',
				spaceId: 'space-abc',
				initialMessage: 'Show me sales data',
			});
			const mockResponse = { conversation_id: 'conv-1', message_id: 'msg-1' };
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: `${HOST}/api/2.0/genie/spaces/space-abc/start-conversation`,
					body: { content: 'Show me sales data' },
				}),
			);
			expect(result[0][0].json).toEqual(mockResponse);
		});

		it('createMessage POSTs to conversation URL', async () => {
			setupNodeParameters({
				resource: 'genie',
				operation: 'createMessage',
				spaceId: 'space-abc',
				conversationId: 'conv-1',
				message: 'Follow-up question',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				message_id: 'msg-2',
			});

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: `${HOST}/api/2.0/genie/spaces/space-abc/conversations/conv-1/messages`,
					body: { content: 'Follow-up question' },
				}),
			);
		});

		it('getMessage GETs from correct URL', async () => {
			setupNodeParameters({
				resource: 'genie',
				operation: 'getMessage',
				spaceId: 'space-abc',
				conversationId: 'conv-1',
				messageId: 'msg-1',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				status: 'COMPLETED',
			});

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: `${HOST}/api/2.0/genie/spaces/space-abc/conversations/conv-1/messages/msg-1`,
				}),
			);
		});

		it('getQueryResults GETs from attachment query-result URL', async () => {
			setupNodeParameters({
				resource: 'genie',
				operation: 'getQueryResults',
				spaceId: 'space-abc',
				conversationId: 'conv-1',
				messageId: 'msg-1',
				attachmentId: 'att-1',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				statement_response: {},
			});

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: `${HOST}/api/2.0/genie/spaces/space-abc/conversations/conv-1/messages/msg-1/attachments/att-1/query-result`,
				}),
			);
		});
	});

	// ─────────────────────────────────────────────────────────
	// Unity Catalog — Catalogs
	// ─────────────────────────────────────────────────────────

	describe('execute() — Unity Catalog > Catalogs', () => {
		it('createCatalog POSTs with name and comment', async () => {
			setupNodeParameters({
				resource: 'unityCatalog',
				operation: 'createCatalog',
				catalogName: 'my_catalog',
				comment: 'Test catalog',
			});
			const mockResponse = { name: 'my_catalog', metastore_id: 'meta-1' };
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: `${HOST}/api/2.1/unity-catalog/catalogs`,
					body: { name: 'my_catalog', comment: 'Test catalog' },
				}),
			);
			expect(result[0][0].json).toEqual(mockResponse);
		});

		it('getCatalog GETs by name', async () => {
			setupNodeParameters({
				resource: 'unityCatalog',
				operation: 'getCatalog',
				catalogName: 'my_catalog',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				name: 'my_catalog',
			});

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: `${HOST}/api/2.1/unity-catalog/catalogs/my_catalog`,
				}),
			);
		});

		it('updateCatalog PATCHes with comment', async () => {
			setupNodeParameters({
				resource: 'unityCatalog',
				operation: 'updateCatalog',
				catalogName: 'my_catalog',
				comment: 'Updated comment',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				name: 'my_catalog',
			});

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'PATCH',
					url: `${HOST}/api/2.1/unity-catalog/catalogs/my_catalog`,
					body: { comment: 'Updated comment' },
				}),
			);
		});

		it('deleteCatalog DELETEs and returns success', async () => {
			setupNodeParameters({
				resource: 'unityCatalog',
				operation: 'deleteCatalog',
				catalogName: 'old_catalog',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue(undefined);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'DELETE',
					url: `${HOST}/api/2.1/unity-catalog/catalogs/old_catalog`,
				}),
			);
			expect(result[0][0].json).toMatchObject({ success: true });
		});

		it('listCatalogs GETs catalog list', async () => {
			setupNodeParameters({ resource: 'unityCatalog', operation: 'listCatalogs' });
			const mockResponse = { catalogs: [{ name: 'cat1' }, { name: 'cat2' }] };
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toEqual(mockResponse);
		});
	});

	// ─────────────────────────────────────────────────────────
	// Unity Catalog — Volumes
	// ─────────────────────────────────────────────────────────

	describe('execute() — Unity Catalog > Volumes', () => {
		it('createVolume POSTs with correct body', async () => {
			setupNodeParameters({
				resource: 'unityCatalog',
				operation: 'createVolume',
				catalogName: 'main',
				schemaName: 'default',
				volumeName: 'test_vol',
				volumeType: 'MANAGED',
				additionalFields: {},
			});
			const mockResponse = { name: 'test_vol', volume_type: 'MANAGED' };
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue(mockResponse);

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: `${HOST}/api/2.1/unity-catalog/volumes`,
					body: expect.objectContaining({
						catalog_name: 'main',
						schema_name: 'default',
						name: 'test_vol',
						volume_type: 'MANAGED',
					}),
				}),
			);
		});

		it('listVolumes passes catalog_name and schema_name as query params', async () => {
			setupNodeParameters({
				resource: 'unityCatalog',
				operation: 'listVolumes',
				catalogName: 'main',
				schemaName: 'default',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({ volumes: [] });

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: `${HOST}/api/2.1/unity-catalog/volumes`,
					qs: { catalog_name: 'main', schema_name: 'default' },
				}),
			);
		});

		it('deleteVolume DELETEs by full name and returns success', async () => {
			setupNodeParameters({
				resource: 'unityCatalog',
				operation: 'deleteVolume',
				catalogName: 'main',
				schemaName: 'default',
				volumeName: 'old_vol',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue(undefined);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'DELETE',
					url: `${HOST}/api/2.1/unity-catalog/volumes/main.default.old_vol`,
				}),
			);
			expect(result[0][0].json).toMatchObject({ success: true });
		});
	});

	// ─────────────────────────────────────────────────────────
	// Unity Catalog — Tables
	// ─────────────────────────────────────────────────────────

	describe('execute() — Unity Catalog > Tables', () => {
		it('listTables passes catalog_name and schema_name as query params', async () => {
			setupNodeParameters({
				resource: 'unityCatalog',
				operation: 'listTables',
				catalogName: 'main',
				schemaName: 'default',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({ tables: [] });

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: `${HOST}/api/2.1/unity-catalog/tables`,
					qs: { catalog_name: 'main', schema_name: 'default' },
				}),
			);
		});

		it('getTable GETs by full name', async () => {
			setupNodeParameters({
				resource: 'unityCatalog',
				operation: 'getTable',
				fullName: 'main.default.my_table',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				name: 'my_table',
			});

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: `${HOST}/api/2.1/unity-catalog/tables/main.default.my_table`,
				}),
			);
		});
	});

	// ─────────────────────────────────────────────────────────
	// Model Serving
	// ─────────────────────────────────────────────────────────

	describe('execute() — Model Serving > queryEndpoint', () => {
		const chatOpenApiSchema = {
			servers: [
				{
					url: 'https://adb-123.azuredatabricks.net/serving-endpoints/my-model/invocations',
				},
			],
			paths: {
				'/invocations': {
					post: {
						requestBody: {
							content: {
								'application/json': {
									schema: {
										oneOf: [
											{
												properties: {
													messages: { type: 'array' },
													max_tokens: { type: 'integer' },
												},
											},
										],
									},
								},
							},
						},
					},
				},
			},
		};

		beforeEach(() => {
			setupNodeParameters({
				resource: 'modelServing',
				operation: 'queryEndpoint',
				endpointName: 'my-model',
				'endpointName.value': 'my-model',
				requestBody: { messages: [{ role: 'user', content: 'Hello' }] },
			});
		});

		it('detects chat format from OpenAPI schema and queries invocation URL', async () => {
			const invocationResponse = { choices: [{ message: { content: 'Hi!' } }] };
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock)
				.mockResolvedValueOnce([chatOpenApiSchema])
				.mockResolvedValueOnce(invocationResponse);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					url: `${HOST}/api/2.0/serving-endpoints/my-model/openapi`,
				}),
			);
			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					url: 'https://adb-123.azuredatabricks.net/serving-endpoints/my-model/invocations',
					method: 'POST',
				}),
			);
			expect(result[0][0].json).toMatchObject({ _metadata: { detectedFormat: 'chat' } });
		});

		it('falls back to default invocation URL when schema fetch fails', async () => {
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock)
				.mockRejectedValueOnce(new Error('Schema endpoint not available'))
				.mockResolvedValueOnce({ choices: [] });

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					url: `${HOST}/serving-endpoints/my-model/invocations`,
				}),
			);
		});

		it('throws validation error with example when request body does not match detected format', async () => {
			setupNodeParameters({
				resource: 'modelServing',
				operation: 'queryEndpoint',
				endpointName: 'my-model',
				'endpointName.value': 'my-model',
				requestBody: { wrong_field: 'value' },
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValueOnce([
				chatOpenApiSchema,
			]);

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'Detected format: chat',
			);
		});
	});

	// ─────────────────────────────────────────────────────────
	// Vector Search
	// ─────────────────────────────────────────────────────────

	describe('execute() — Vector Search', () => {
		it('createIndex (DELTA_SYNC) sends correct body', async () => {
			const deltaSpec = { source_table: 'main.default.embeddings', pipeline_type: 'TRIGGERED' };
			setupNodeParameters({
				resource: 'vectorSearch',
				operation: 'createIndex',
				indexName: 'main.default.my_index',
				endpointName: 'vs-endpoint',
				primaryKey: 'id',
				indexType: 'DELTA_SYNC',
				deltaSyncIndexSpec: JSON.stringify(deltaSpec),
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				name: 'main.default.my_index',
			});

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: `${HOST}/api/2.0/vector-search/indexes`,
					body: expect.objectContaining({
						name: 'main.default.my_index',
						index_type: 'DELTA_SYNC',
						delta_sync_index_spec: deltaSpec,
					}),
				}),
			);
		});

		it('createIndex (DIRECT_ACCESS) sends direct_access_index_spec', async () => {
			const directSpec = { embedding_source_columns: [{ name: 'text' }] };
			setupNodeParameters({
				resource: 'vectorSearch',
				operation: 'createIndex',
				indexName: 'main.default.direct_idx',
				endpointName: 'vs-endpoint',
				primaryKey: 'id',
				indexType: 'DIRECT_ACCESS',
				directAccessIndexSpec: JSON.stringify(directSpec),
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({});

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.objectContaining({
						index_type: 'DIRECT_ACCESS',
						direct_access_index_spec: directSpec,
					}),
				}),
			);
		});

		it('queryIndex (text mode) sends query_text in body', async () => {
			setupNodeParameters({
				resource: 'vectorSearch',
				operation: 'queryIndex',
				indexName: 'main.default.my_index',
				queryType: 'text',
				queryText: 'find similar documents',
				searchMode: 'HYBRID',
				numResults: 5,
				columns: 'id, content',
				options: {},
				enableReranking: false,
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				result: { data_array: [] },
			});

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: `${HOST}/api/2.0/vector-search/indexes/main.default.my_index/query`,
					body: expect.objectContaining({
						query_text: 'find similar documents',
						num_results: 5,
						query_type: 'HYBRID',
					}),
				}),
			);
		});

		it('queryIndex (vector mode) sends query_vector in body', async () => {
			const vector = [0.1, 0.2, 0.3];
			setupNodeParameters({
				resource: 'vectorSearch',
				operation: 'queryIndex',
				indexName: 'main.default.my_index',
				queryType: 'vector',
				queryVector: vector,
				searchMode: 'ANN',
				numResults: 10,
				columns: 'id',
				options: {},
				enableReranking: false,
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({});

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.objectContaining({ query_vector: vector }),
				}),
			);
		});

		it('queryIndex applies reranker when enabled', async () => {
			setupNodeParameters({
				resource: 'vectorSearch',
				operation: 'queryIndex',
				indexName: 'main.default.my_index',
				queryType: 'text',
				queryText: 'query',
				searchMode: 'HYBRID',
				numResults: 10,
				columns: 'id',
				options: {},
				enableReranking: true,
				rerankerModel: 'databricks_reranker',
				columnsToRerank: 'content, title',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({});

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					body: expect.objectContaining({
						reranker: {
							model: 'databricks_reranker',
							parameters: { columns_to_rerank: ['content', 'title'] },
						},
					}),
				}),
			);
		});

		it('getIndex GETs from correct URL', async () => {
			setupNodeParameters({
				resource: 'vectorSearch',
				operation: 'getIndex',
				indexName: 'main.default.my_index',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				name: 'main.default.my_index',
			});

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: `${HOST}/api/2.0/vector-search/indexes/main.default.my_index`,
				}),
			);
		});

		it('listIndexes GETs with endpoint_name query param', async () => {
			setupNodeParameters({
				resource: 'vectorSearch',
				operation: 'listIndexes',
				endpointName: 'my-endpoint',
			});
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				vector_indexes: [],
			});

			await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					qs: { endpoint_name: 'my-endpoint' },
				}),
			);
		});
	});

	// ─────────────────────────────────────────────────────────
	// Global error handling
	// ─────────────────────────────────────────────────────────

	describe('execute() — error handling', () => {
		beforeEach(() => {
			setupNodeParameters({
				resource: 'vectorSearch',
				operation: 'getIndex',
				indexName: 'my_index',
			});
		});

		it('rethrows error when continueOnFail is false', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(false);
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockRejectedValue(
				new Error('API down'),
			);

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow('API down');
		});

		it('returns error item when continueOnFail is true', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			(mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockRejectedValue(
				new Error('Timeout'),
			);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result[0][0].json).toMatchObject({ error: 'Timeout' });
		});
	});

	// ─────────────────────────────────────────────────────────
	// listSearch methods
	// ─────────────────────────────────────────────────────────

	describe('methods.listSearch — getWarehouses', () => {
		let mockLoadOptions: jest.Mocked<ILoadOptionsFunctions>;

		beforeEach(() => {
			mockLoadOptions = mockDeep<ILoadOptionsFunctions>();
			// Use a unique host per suite to prevent cross-test cache hits
			mockLoadOptions.getCredentials.mockResolvedValue({
				host: 'https://warehouses-host.databricks.com',
				token: TOKEN,
			});
		});

		it('returns warehouse list in correct dropdown format', async () => {
			(mockLoadOptions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				warehouses: [
					{ id: 'wh-1', name: 'Small Warehouse' },
					{ id: 'wh-2', name: 'Large Warehouse' },
				],
			});

			const result = await node.methods.listSearch.getWarehouses.call(mockLoadOptions);

			expect(result.results).toEqual([
				expect.objectContaining({ name: 'Small Warehouse', value: 'wh-1' }),
				expect.objectContaining({ name: 'Large Warehouse', value: 'wh-2' }),
			]);
			expect(mockLoadOptions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: 'https://warehouses-host.databricks.com/api/2.0/sql/warehouses',
				}),
			);
		});

		it('filters results by name when filter is provided', async () => {
			(mockLoadOptions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				warehouses: [
					{ id: 'wh-1', name: 'Small Warehouse' },
					{ id: 'wh-2', name: 'Large Warehouse' },
				],
			});

			const result = await node.methods.listSearch.getWarehouses.call(mockLoadOptions, 'small');

			expect(result.results).toHaveLength(1);
			expect(result.results[0].name).toBe('Small Warehouse');
		});

		it('handles empty warehouses response', async () => {
			// Use a unique host to avoid picking up cache entries from previous tests
			mockLoadOptions.getCredentials.mockResolvedValue({
				host: 'https://wh-empty-test.databricks.com',
				token: TOKEN,
			});
			(mockLoadOptions.helpers.httpRequest as jest.Mock).mockResolvedValue({});

			const result = await node.methods.listSearch.getWarehouses.call(mockLoadOptions);

			expect(result.results).toEqual([]);
		});

		it('caches results and avoids duplicate API calls within TTL', async () => {
			// Use a dedicated host to guarantee no pre-existing cache entry
			mockLoadOptions.getCredentials.mockResolvedValue({
				host: 'https://cache-test-wh.databricks.com',
				token: TOKEN,
			});
			(mockLoadOptions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				warehouses: [{ id: 'wh-1', name: 'Cached Warehouse' }],
			});

			await node.methods.listSearch.getWarehouses.call(mockLoadOptions);
			await node.methods.listSearch.getWarehouses.call(mockLoadOptions);

			expect(mockLoadOptions.helpers.httpRequest).toHaveBeenCalledTimes(1);
		});
	});

	describe('methods.listSearch — getEndpoints', () => {
		let mockLoadOptions: jest.Mocked<ILoadOptionsFunctions>;

		beforeEach(() => {
			mockLoadOptions = mockDeep<ILoadOptionsFunctions>();
			mockLoadOptions.getCredentials.mockResolvedValue({
				host: 'https://endpoints-host.databricks.com',
				token: TOKEN,
			});
		});

		it('returns endpoint list with model description extracted from served_entities', async () => {
			(mockLoadOptions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				endpoints: [
					{
						name: 'my-llm',
						config: {
							served_entities: [{ external_model: { name: 'gpt-4' } }],
						},
					},
				],
			});

			const result = await node.methods.listSearch.getEndpoints.call(mockLoadOptions);

			expect(result.results[0]).toMatchObject({
				name: 'my-llm',
				value: 'my-llm',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-lowercase-first-char
				description: 'gpt-4',
			});
		});

		it('filters by name and description', async () => {
			// Use a unique host to avoid picking up cache entries from previous tests
			mockLoadOptions.getCredentials.mockResolvedValue({
				host: 'https://ep-filter-test.databricks.com',
				token: TOKEN,
			});
			(mockLoadOptions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				endpoints: [
					{
						name: 'llama-endpoint',
						config: {
							served_entities: [{ foundation_model: { name: 'meta-llama-3' } }],
						},
					},
					{
						name: 'gpt-endpoint',
						config: {
							served_entities: [{ external_model: { name: 'gpt-4' } }],
						},
					},
				],
			});

			const result = await node.methods.listSearch.getEndpoints.call(mockLoadOptions, 'llama');

			expect(result.results).toHaveLength(1);
			expect(result.results[0].name).toBe('llama-endpoint');
		});
	});

	describe('methods.listSearch — getCatalogs', () => {
		let mockLoadOptions: jest.Mocked<ILoadOptionsFunctions>;

		beforeEach(() => {
			mockLoadOptions = mockDeep<ILoadOptionsFunctions>();
			mockLoadOptions.getCredentials.mockResolvedValue({
				host: 'https://catalogs-host.databricks.com',
				token: TOKEN,
			});
		});

		it('returns catalog list with correct format', async () => {
			(mockLoadOptions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				catalogs: [{ name: 'main' }, { name: 'hive_metastore' }],
			});

			const result = await node.methods.listSearch.getCatalogs.call(mockLoadOptions);

			expect(result.results).toHaveLength(2);
			expect(result.results[0]).toMatchObject({ name: 'main', value: 'main' });
		});
	});

	describe('methods.listSearch — getSchemas', () => {
		let mockLoadOptions: jest.Mocked<ILoadOptionsFunctions>;

		beforeEach(() => {
			mockLoadOptions = mockDeep<ILoadOptionsFunctions>();
			mockLoadOptions.getCredentials.mockResolvedValue({
				host: 'https://schemas-host.databricks.com',
				token: TOKEN,
			});
		});

		it('fetches schemas for the selected catalog', async () => {
			mockLoadOptions.getCurrentNodeParameter.mockReturnValue('main');
			(mockLoadOptions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				schemas: [{ name: 'default' }, { name: 'bronze' }],
			});

			const result = await node.methods.listSearch.getSchemas.call(mockLoadOptions);

			expect(result.results).toHaveLength(2);
			expect(result.results[0]).toMatchObject({ name: 'default', value: 'default' });
			expect(mockLoadOptions.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://schemas-host.databricks.com/api/2.1/unity-catalog/schemas?catalog_name=main',
				}),
			);
		});

		it('handles resourceLocator object for catalogName', async () => {
			mockLoadOptions.getCurrentNodeParameter.mockReturnValue({ value: 'main', mode: 'list' });
			(mockLoadOptions.helpers.httpRequest as jest.Mock).mockResolvedValue({
				schemas: [{ name: 'default' }],
			});

			const result = await node.methods.listSearch.getSchemas.call(mockLoadOptions);

			expect(result.results[0].name).toBe('default');
		});

		it('returns error message when schema fetch for catalog fails', async () => {
			mockLoadOptions.getCurrentNodeParameter.mockReturnValue('bad_catalog');
			(mockLoadOptions.helpers.httpRequest as jest.Mock).mockRejectedValue(new Error('Not found'));

			const result = await node.methods.listSearch.getSchemas.call(mockLoadOptions);

			expect(result.results[0].name).toContain('Error loading schemas');
		});
	});
});
