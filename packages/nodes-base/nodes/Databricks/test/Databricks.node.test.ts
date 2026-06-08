import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type * as nWorkflow from 'n8n-workflow';
import nock from 'nock';

// Mock sleep from n8n-workflow so polling tests run without real delays
jest.mock('n8n-workflow', () => {
	const actual = jest.requireActual<typeof nWorkflow>('n8n-workflow');
	return {
		...actual,
		sleep: jest.fn().mockResolvedValue(undefined),
	};
});

const HOST = 'https://adb-1234567890.1.azuredatabricks.net';

describe('Databricks', () => {
	const credentials = {
		databricksApi: {
			host: HOST,
			token: 'dapixxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
		},
	};

	describe('Databricks SQL -> Execute Query', () => {
		beforeAll(() => {
			nock(HOST)
				.post('/api/2.0/sql/statements', {
					warehouse_id: 'warehouse123',
					statement: 'SELECT id, name FROM test_table',
					wait_timeout: '50s',
					on_wait_timeout: 'CONTINUE',
				})
				.reply(200, {
					statement_id: 'stmt-abc123',
					status: { state: 'SUCCEEDED' },
					manifest: {
						total_chunk_count: 1,
						schema: {
							columns: [
								{ name: 'id', type: 'INT' },
								{ name: 'name', type: 'STRING' },
							],
						},
					},
					result: {
						data_array: [
							['1', 'Alice'],
							['2', 'Bob'],
						],
					},
				});
		});

		afterAll(() => nock.cleanAll());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['databricks-sql.workflow.json'],
		});
	});

	describe('Databricks SQL -> Execute Query (async polling)', () => {
		// This test exercises the PENDING → RUNNING → SUCCEEDED polling path.
		// The initial POST returns PENDING, the first poll returns RUNNING, and
		// the second poll returns the completed result with manifest and data.
		beforeAll(() => {
			nock(HOST)
				.post('/api/2.0/sql/statements', {
					warehouse_id: 'warehouse123',
					statement: 'SELECT id, name FROM test_table',
					wait_timeout: '50s',
					on_wait_timeout: 'CONTINUE',
				})
				.reply(200, {
					statement_id: 'stmt-001',
					status: { state: 'PENDING' },
				});

			nock(HOST)
				.get('/api/2.0/sql/statements/stmt-001')
				.reply(200, {
					statement_id: 'stmt-001',
					status: { state: 'RUNNING' },
				});

			nock(HOST)
				.get('/api/2.0/sql/statements/stmt-001')
				.reply(200, {
					statement_id: 'stmt-001',
					status: { state: 'SUCCEEDED' },
					manifest: {
						total_chunk_count: 1,
						schema: {
							columns: [
								{ name: 'id', type: 'INT' },
								{ name: 'name', type: 'STRING' },
							],
						},
					},
					result: {
						data_array: [
							['1', 'Alice'],
							['2', 'Bob'],
						],
					},
				});
		});

		afterAll(() => nock.cleanAll());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['databricks-sql-polling.workflow.json'],
		});
	});

	describe('Files -> Operations', () => {
		beforeAll(() => {
			const databricksNock = nock(HOST);

			databricksNock
				.delete('/api/2.0/fs/files/Volumes/main/default/my_volume/data/test.csv')
				.reply(200, {});

			databricksNock.get('/api/2.0/fs/directories/Volumes/main/default/my_volume/data').reply(200, {
				contents: [
					{
						name: 'test.csv',
						path: '/Volumes/main/default/my_volume/data/test.csv',
						type: 'FILE',
					},
				],
				next_page_token: null,
			});

			databricksNock
				.put('/api/2.0/fs/directories/Volumes/main/default/my_volume/new_dir')
				.reply(200, {});

			databricksNock
				.delete('/api/2.0/fs/directories/Volumes/main/default/my_volume/old_dir')
				.reply(200, {});
		});

		afterAll(() => nock.cleanAll());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['files.workflow.json'],
		});
	});

	describe('Genie -> Operations', () => {
		beforeAll(() => {
			const databricksNock = nock(HOST);

			databricksNock
				.post('/api/2.0/genie/spaces/space123/start-conversation', {
					content: 'Show me sales data for Q1 2024',
				})
				.reply(200, {
					conversation_id: 'conv-456',
					message_id: 'msg-789',
					space_id: 'space123',
				});

			databricksNock
				.post('/api/2.0/genie/spaces/space123/conversations/conv-456/messages', {
					content: 'What were the total sales?',
				})
				.reply(200, {
					id: 'msg-new',
					conversation_id: 'conv-456',
					content: 'What were the total sales?',
					status: 'COMPLETED',
				});

			databricksNock
				.get('/api/2.0/genie/spaces/space123/conversations/conv-456/messages/msg-789')
				.reply(200, {
					id: 'msg-789',
					conversation_id: 'conv-456',
					content: 'Show me sales data for Q1 2024',
					status: 'COMPLETED',
				});

			databricksNock.get('/api/2.0/genie/spaces/space123').reply(200, {
				id: 'space123',
				display_name: 'Sales Analytics',
				description: 'AI-powered sales data assistant',
			});
		});

		afterAll(() => nock.cleanAll());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['genie.workflow.json'],
		});
	});

	describe('Model Serving -> Query Endpoint', () => {
		beforeAll(() => {
			const databricksNock = nock(HOST);

			// Return empty array so no schema detection/validation happens - avoids
			// issues with requestBody being a raw JSON string vs parsed object
			databricksNock.get('/api/2.0/serving-endpoints/my-llm-endpoint/openapi').reply(200, []);

			databricksNock.post('/serving-endpoints/my-llm-endpoint/invocations').reply(200, {
				id: 'chatcmpl-123',
				choices: [
					{
						message: { role: 'assistant', content: 'Hello! How can I help you today?' },
						finish_reason: 'stop',
						index: 0,
					},
				],
				model: 'my-llm-endpoint',
				usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
			});
		});

		afterAll(() => nock.cleanAll());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['model-serving.workflow.json'],
		});
	});

	describe('Model Serving -> Query Endpoint (chat format detection)', () => {
		// This test verifies that the node correctly identifies the 'chat' format when
		// the OpenAPI schema contains a requestBody with a 'messages' property, and
		// that _metadata.detectedFormat reflects the detected format in the output.
		beforeAll(() => {
			const databricksNock = nock(HOST);

			// Return a realistic chat-format OpenAPI schema so the format-detection
			// logic runs and identifies the 'messages' property as 'chat'.
			databricksNock.get('/api/2.0/serving-endpoints/my-chat-endpoint/openapi').reply(200, [
				{
					servers: [
						{
							url: `${HOST}/serving-endpoints/my-chat-endpoint/invocations`,
						},
					],
					paths: {
						'/serving-endpoints/my-chat-endpoint/invocations': {
							post: {
								requestBody: {
									content: {
										'application/json': {
											schema: {
												oneOf: [
													{
														type: 'object',
														properties: {
															messages: {
																type: 'array',
																items: {
																	type: 'object',
																	properties: {
																		role: { type: 'string' },
																		content: { type: 'string' },
																	},
																},
															},
															max_tokens: { type: 'integer' },
															temperature: { type: 'number' },
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
				},
			]);

			databricksNock.post('/serving-endpoints/my-chat-endpoint/invocations').reply(200, {
				id: 'chatcmpl-456',
				choices: [
					{
						message: { role: 'assistant', content: 'Hi there! How can I assist you?' },
						finish_reason: 'stop',
						index: 0,
					},
				],
				model: 'my-chat-endpoint',
				usage: { prompt_tokens: 8, completion_tokens: 12, total_tokens: 20 },
			});
		});

		afterAll(() => nock.cleanAll());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['model-serving-chat.workflow.json'],
		});
	});

	describe('Model Serving -> Query Endpoint (blocks external server URL from schema)', () => {
		// This test verifies that the node refuses to send authenticated requests to a URL
		// returned in the OpenAPI schema's servers[0].url if that URL belongs to a different
		// host than the configured Databricks credential (credential-exfiltration prevention).
		beforeAll(() => {
			nock(HOST)
				.get('/api/2.0/serving-endpoints/malicious-endpoint/openapi')
				.reply(200, [
					{
						servers: [
							{
								url: 'https://attacker.example.com/collect',
							},
						],
						paths: {
							'/collect': {
								post: {
									requestBody: {
										content: {
											'application/json': {
												schema: {
													type: 'object',
													properties: {
														messages: { type: 'array' },
													},
												},
											},
										},
									},
								},
							},
						},
					},
				]);
		});

		afterAll(() => nock.cleanAll());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['model-serving-ssrf-block.workflow.json'],
		});
	});

	describe('Unity Catalog -> Catalog Operations', () => {
		beforeAll(() => {
			const databricksNock = nock(HOST);

			databricksNock.get('/api/2.1/unity-catalog/catalogs').reply(200, {
				catalogs: [
					{ name: 'main', comment: 'Main catalog' },
					{ name: 'sandbox', comment: 'Sandbox catalog' },
				],
			});

			databricksNock.get('/api/2.1/unity-catalog/catalogs/main').reply(200, {
				name: 'main',
				comment: 'Main catalog',
				created_at: 1704067200000,
				owner: 'admin@example.com',
			});

			databricksNock
				.post('/api/2.1/unity-catalog/catalogs', {
					name: 'new-catalog',
					comment: 'Test catalog',
				})
				.reply(201, {
					name: 'new-catalog',
					comment: 'Test catalog',
					created_at: 1704067200000,
				});

			databricksNock
				.patch('/api/2.1/unity-catalog/catalogs/main', { comment: 'Updated catalog description' })
				.reply(200, {
					name: 'main',
					comment: 'Updated catalog description',
					updated_at: 1704067200000,
					owner: 'admin@example.com',
				});

			databricksNock.delete('/api/2.1/unity-catalog/catalogs/old-catalog').reply(200, {});
		});

		afterAll(() => nock.cleanAll());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['unity-catalog-catalogs.workflow.json'],
		});
	});

	describe('Unity Catalog -> Volume Operations', () => {
		beforeAll(() => {
			const databricksNock = nock(HOST);

			databricksNock
				.get('/api/2.1/unity-catalog/volumes')
				.query({ catalog_name: 'main', schema_name: 'default' })
				.reply(200, {
					volumes: [
						{
							name: 'my_volume',
							volume_type: 'MANAGED',
							catalog_name: 'main',
							schema_name: 'default',
						},
					],
				});

			databricksNock
				.post('/api/2.1/unity-catalog/volumes', {
					catalog_name: 'main',
					schema_name: 'default',
					name: 'new_volume',
					volume_type: 'MANAGED',
				})
				.reply(201, {
					name: 'new_volume',
					catalog_name: 'main',
					schema_name: 'default',
					volume_type: 'MANAGED',
					full_name: 'main.default.new_volume',
				});

			databricksNock
				.delete('/api/2.1/unity-catalog/volumes/main.default.old_volume')
				.reply(200, {});
		});

		afterAll(() => nock.cleanAll());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['unity-catalog-volumes.workflow.json'],
		});
	});

	describe('Unity Catalog -> Table Operations', () => {
		beforeAll(() => {
			const databricksNock = nock(HOST);

			databricksNock
				.get('/api/2.1/unity-catalog/tables')
				.query({ catalog_name: 'main', schema_name: 'default' })
				.reply(200, {
					tables: [
						{
							name: 'my_table',
							table_type: 'EXTERNAL',
							catalog_name: 'main',
							schema_name: 'default',
							full_name: 'main.default.my_table',
						},
					],
				});

			databricksNock.get('/api/2.1/unity-catalog/tables/main.default.my_table').reply(200, {
				name: 'my_table',
				table_type: 'EXTERNAL',
				catalog_name: 'main',
				schema_name: 'default',
				full_name: 'main.default.my_table',
				created_at: 1704067200000,
			});

			databricksNock
				.post('/api/2.1/unity-catalog/tables', {
					catalog_name: 'main',
					schema_name: 'default',
					name: 'new_table',
					table_type: 'EXTERNAL',
					data_source_format: 'DELTA',
					storage_location: 's3://my-bucket/main/default/new_table',
				})
				.reply(200, {
					name: 'new_table',
					table_type: 'EXTERNAL',
					data_source_format: 'DELTA',
					catalog_name: 'main',
					schema_name: 'default',
					full_name: 'main.default.new_table',
					storage_location: 's3://my-bucket/main/default/new_table',
					created_at: 1704067200000,
				});

			databricksNock.delete('/api/2.1/unity-catalog/tables/main.default.old_table').reply(200, {});
		});

		afterAll(() => nock.cleanAll());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['unity-catalog-tables.workflow.json'],
		});
	});

	describe('Vector Search -> Operations', () => {
		beforeAll(() => {
			const databricksNock = nock(HOST);

			databricksNock
				.post('/api/2.0/vector-search/indexes', {
					name: 'main.default.search_index',
					endpoint_name: 'vs-endpoint',
					primary_key: 'id',
					index_type: 'DELTA_SYNC',
					delta_sync_index_spec: {
						source_table: 'main.default.source_table',
						pipeline_type: 'TRIGGERED',
						embedding_source_columns: [
							{ name: 'text', embedding_model_endpoint_name: 'e5-small-v2' },
						],
						columns_to_sync: ['id', 'text'],
					},
				})
				.reply(200, {
					name: 'main.default.search_index',
					endpoint_name: 'vs-endpoint',
					primary_key: 'id',
					index_type: 'DELTA_SYNC',
					status: { ready: false, index_url: 'https://example.com/index' },
				});

			databricksNock.get('/api/2.0/vector-search/indexes/main.default.search_index').reply(200, {
				name: 'main.default.search_index',
				endpoint_name: 'vs-endpoint',
				primary_key: 'id',
				index_type: 'DELTA_SYNC',
				status: { ready: true, index_url: 'https://example.com/index' },
			});

			databricksNock
				.get('/api/2.0/vector-search/indexes')
				.query({ endpoint_name: 'vs-endpoint' })
				.reply(200, {
					vector_indexes: [
						{
							name: 'main.default.search_index',
							endpoint_name: 'vs-endpoint',
							status: { ready: true },
						},
					],
					next_page_token: null,
				});

			databricksNock
				.post('/api/2.0/vector-search/indexes/main.default.search_index/query', {
					num_results: 5,
					query_type: 'HYBRID',
					query_text: 'machine learning',
					columns: ['id', 'text'],
				})
				.reply(200, {
					result: {
						row_count: 2,
						data_array: [
							['1', 'Introduction to machine learning', '0.95'],
							['2', 'Deep learning fundamentals', '0.88'],
						],
						manifest: {
							columns: [{ name: 'id' }, { name: 'text' }, { name: 'score' }],
						},
					},
					next_page_token: null,
				});

			databricksNock
				.post('/api/2.0/vector-search/indexes/main.default.search_index/query', {
					num_results: 5,
					query_type: 'ANN',
					query_vector: [0.1, 0.2, 0.3],
					columns: ['id', 'text'],
				})
				.reply(200, {
					result: {
						row_count: 1,
						data_array: [['1', 'Nearest neighbour result', '0.99']],
						manifest: {
							columns: [{ name: 'id' }, { name: 'text' }, { name: 'score' }],
						},
					},
					next_page_token: null,
				});
		});

		afterAll(() => nock.cleanAll());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['vector-search.workflow.json'],
		});
	});
});
