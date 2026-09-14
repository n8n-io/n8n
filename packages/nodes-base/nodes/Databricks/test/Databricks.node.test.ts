import { sleep } from '@n8n/utils/sleep';
import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { NodeApiError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	JsonObject,
	NodeParameterValueType,
	WorkflowTestData,
} from 'n8n-workflow';
import nock from 'nock';
import { mockDeep } from 'vitest-mock-extended';

import { execute as executeQuery } from '../actions/databricksSql/executeQuery.operation';
import { makePermissionErrorLegible } from '../actions/helpers';
import { execute as runJob } from '../actions/job/run.operation';
import { getCatalogs, getJobs, getSchemas } from '../methods/listSearch';
import { jobParameters } from '../resources/job/parameters';

// The operation is imported from source, so this mock replaces the real poll delay
vi.mock('@n8n/utils/sleep', () => ({
	sleep: vi.fn().mockResolvedValue(undefined),
}));

const HOST = 'https://adb-1234567890.1.azuredatabricks.net';

const PERMISSION_MESSAGE = "User does not have USE CATALOG on Catalog 'main'.";

const node: INode = {
	id: '1',
	name: 'Databricks',
	type: 'n8n-nodes-base.databricks',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

// Mirrors what core's httpRequest throws and authentication.ts wraps: an axios
// error with the response body under `response.data`
class AxiosError extends Error {
	constructor(
		message: string,
		readonly response: { status: number; data: unknown },
	) {
		super(message);
	}
}

const apiErrorFromBody = (status: number, data: unknown) =>
	new NodeApiError(
		node,
		new AxiosError(`Request failed with status code ${status}`, {
			status,
			data,
		}) as unknown as JsonObject,
	);

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
				// Proves the UA comes from the node helper: the harness only invokes a
				// function-style `authenticate`, and this credential's is a generic object,
				// so the credential contributes no headers here.
				.matchHeader('user-agent', 'n8n_DatabricksNode')
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

	describe('Files -> Download File', () => {
		// Guards the one call site whose options must survive the shared request helper
		// intact: dropping `encoding: 'arraybuffer'` or `returnFullResponse` still
		// compiles (the helper returns `any`) but breaks at runtime. The reply bytes are
		// deliberately not valid UTF-8, so a string round-trip would change the output.
		beforeAll(() => {
			nock(HOST)
				.get('/api/2.0/fs/files/Volumes/main/default/my_volume/data/logo.png')
				.matchHeader('user-agent', 'n8n_DatabricksNode')
				.reply(200, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe]), {
					'content-type': 'application/octet-stream',
				});
		});

		afterAll(() => nock.cleanAll());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['files-download.workflow.json'],
			assertBinaryData: true,
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

	describe('Job -> Run', () => {
		beforeAll(() => {
			nock(HOST)
				.post('/api/2.2/jobs/run-now', {
					job_id: 281874479417551,
					job_parameters: { environment: 'staging' },
				})
				.matchHeader('user-agent', 'n8n_DatabricksNode')
				.reply(200, { run_id: 41847992357943, number_in_job: 41847992357943 });
		});

		afterAll(() => nock.cleanAll());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['job-run.workflow.json'],
		});
	});

	describe('Router -> PERMISSION_DENIED surfaces the Databricks message', () => {
		// A 403 PERMISSION_DENIED body must surface its legible Databricks message
		// instead of the generic "Forbidden - perhaps check your credentials?" —
		// deleting the makePermissionErrorLegible call in the router must fail this
		beforeAll(() => {
			nock(HOST)
				.get('/api/2.1/unity-catalog/catalogs')
				.reply(403, { error_code: 'PERMISSION_DENIED', message: PERMISSION_MESSAGE });
		});

		afterAll(() => nock.cleanAll());

		const harness = new NodeTestHarness();
		const testData: WorkflowTestData = {
			description: 'permission-denied.workflow',
			input: { workflowData: harness.readWorkflowJSON('permission-denied.workflow.json') },
			output: { nodeData: {}, error: PERMISSION_MESSAGE },
			credentials,
		};
		harness.setupTest(testData, { credentials });
	});
});

describe('makePermissionErrorLegible', () => {
	it('should promote the PERMISSION_DENIED body message and add a remediation description', () => {
		const error = apiErrorFromBody(403, {
			error_code: 'PERMISSION_DENIED',
			message: PERMISSION_MESSAGE,
		});
		// Without the helper the user sees a generic status-code message instead
		expect(error.message).not.toBe(PERMISSION_MESSAGE);

		makePermissionErrorLegible(error);

		expect(error.message).toBe(PERMISSION_MESSAGE);
		expect(error.description).toBe(
			'Grant the named permission to the signed-in user or service principal in Databricks, then retry.',
		);
	});

	it('should strip control characters and truncate the promoted message to 500 characters', () => {
		const error = apiErrorFromBody(403, {
			error_code: 'PERMISSION_DENIED',
			message: `bad\x00\x1f\x7fmessage${'x'.repeat(600)}`,
		});

		makePermissionErrorLegible(error);

		expect(error.message).toBe(`bad message${'x'.repeat(600)}`.slice(0, 500));
	});

	// encoding: 'arraybuffer' requests (file downloads) get their 403 JSON body
	// as raw bytes — the helper must parse it before reading error_code
	it('should parse a Buffer body from arraybuffer requests', () => {
		const error = apiErrorFromBody(
			403,
			Buffer.from(JSON.stringify({ error_code: 'PERMISSION_DENIED', message: PERMISSION_MESSAGE })),
		);

		makePermissionErrorLegible(error);

		expect(error.message).toBe(PERMISSION_MESSAGE);
	});

	it('should leave errors with a non-JSON Buffer body untouched', () => {
		const error = apiErrorFromBody(403, Buffer.from('not json'));
		const messageBefore = error.message;

		makePermissionErrorLegible(error);

		expect(error.message).toBe(messageBefore);
	});

	it('should leave non-PERMISSION_DENIED errors untouched', () => {
		const error = apiErrorFromBody(403, {
			error_code: 'IP_ACCESS_DENIED',
			message: 'Source IP is blocked',
		});
		const messageBefore = error.message;

		makePermissionErrorLegible(error);

		expect(error.message).toBe(messageBefore);
	});

	it.each([
		['missing', { error_code: 'PERMISSION_DENIED' }],
		['non-string', { error_code: 'PERMISSION_DENIED', message: 123 }],
	])('should leave PERMISSION_DENIED errors with a %s body message untouched', (_case, body) => {
		const error = apiErrorFromBody(403, body);
		const messageBefore = error.message;

		makePermissionErrorLegible(error);

		expect(error.message).toBe(messageBefore);
	});
});

describe('listSearch -> PERMISSION_DENIED surfaces the Databricks message', () => {
	// One dropdown suffices: all five listSearch call sites share the listRequest
	// wrapper this exercises
	it('should reject with the legible message from getCatalogs', async () => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getNodeParameter.mockReturnValue('accessToken');
		context.getCredentials.mockResolvedValue({ host: HOST });
		context.helpers.httpRequestWithAuthentication.mockRejectedValue(
			apiErrorFromBody(403, { error_code: 'PERMISSION_DENIED', message: PERMISSION_MESSAGE }),
		);

		await expect(getCatalogs.call(context)).rejects.toMatchObject({
			message: PERMISSION_MESSAGE,
		});
	});

	// getSchemas swallows the error into a placeholder row instead of throwing —
	// the legible message must still be wired into that row
	it('should append the legible message to the placeholder row from getSchemas', async () => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getNodeParameter.mockReturnValue('accessToken');
		context.getCredentials.mockResolvedValue({ host: HOST });
		context.getCurrentNodeParameter.mockReturnValue('main');
		context.helpers.httpRequestWithAuthentication.mockRejectedValue(
			apiErrorFromBody(403, { error_code: 'PERMISSION_DENIED', message: PERMISSION_MESSAGE }),
		);

		const { results } = await getSchemas.call(context);

		expect(results[0].name).toContain(PERMISSION_MESSAGE);
	});
});

describe('Databricks SQL -> Execute Query (FAILED/CANCELED statement)', () => {
	const setupContext = (status: unknown) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getNodeParameter.mockImplementation((name) => {
			if (name === 'warehouseId') return 'warehouse123';
			if (name === 'query') return 'SELECT * FROM x';
			return [];
		});
		context.getCredentials.mockResolvedValue({ host: HOST });
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({
			statement_id: 'stmt-403',
			status,
		});
		return context;
	};

	it.each(['FAILED', 'CANCELED'])(
		'should surface the in-band error message of a %s statement',
		async (state) => {
			// SQL permission failures arrive on an HTTP 200 with the legible text in
			// status.error.message — the raw JSON blob must not be the whole story
			const context = setupContext({
				state,
				error: {
					error_code: 'PERMISSION_DENIED',
					message: "User does not have SELECT on Table 'x'.",
				},
			});

			await expect(executeQuery.call(context, 0)).rejects.toThrow(
				`Query ${state.toLowerCase()}: User does not have SELECT on Table 'x'.`,
			);
		},
	);

	it('should strip control characters and truncate the in-band error message', async () => {
		const context = setupContext({
			state: 'FAILED',
			error: {
				error_code: 'PERMISSION_DENIED',
				message: `bad\x00\x1f\x7fmessage${'x'.repeat(600)}`,
			},
		});

		await expect(executeQuery.call(context, 0)).rejects.toThrow(
			`Query failed: ${`bad message${'x'.repeat(600)}`.slice(0, 500)}`,
		);
	});

	it('should fall back to the stringified status when no error message is present', async () => {
		const context = setupContext({ state: 'FAILED' });

		await expect(executeQuery.call(context, 0)).rejects.toThrow(
			`Query failed: ${JSON.stringify({ state: 'FAILED' })}`,
		);
	});
});

describe('Databricks SQL -> Execute Query (async polling)', () => {
	const successResponse = {
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
	};

	beforeEach(() => {
		vi.mocked(sleep).mockClear();
	});

	it('should poll until the statement reaches SUCCEEDED and map rows to items', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getNodeParameter.mockImplementation((name) => {
			if (name === 'warehouseId') return 'warehouse123';
			if (name === 'query') return 'SELECT id, name FROM test_table';
			if (name === 'authentication') return 'accessToken';
			return [];
		});
		context.getCredentials.mockResolvedValue({ host: HOST });
		context.helpers.httpRequestWithAuthentication
			.mockResolvedValueOnce({ statement_id: 'stmt-001', status: { state: 'PENDING' } })
			.mockResolvedValueOnce({ statement_id: 'stmt-001', status: { state: 'RUNNING' } })
			.mockResolvedValueOnce(successResponse);

		const result = await executeQuery.call(context, 0);

		expect(result).toEqual([
			{ json: { id: '1', name: 'Alice' }, pairedItem: { item: 0 } },
			{ json: { id: '2', name: 'Bob' }, pairedItem: { item: 0 } },
		]);

		const requests = context.helpers.httpRequestWithAuthentication.mock.calls;
		expect(requests).toHaveLength(3);
		expect(requests[0][1]).toMatchObject({
			method: 'POST',
			url: `${HOST}/api/2.0/sql/statements`,
			body: {
				warehouse_id: 'warehouse123',
				statement: 'SELECT id, name FROM test_table',
				wait_timeout: '50s',
				on_wait_timeout: 'CONTINUE',
			},
		});
		expect(requests[1][1]).toMatchObject({
			method: 'GET',
			url: `${HOST}/api/2.0/sql/statements/stmt-001`,
		});
		expect(requests[2][1]).toMatchObject({
			method: 'GET',
			url: `${HOST}/api/2.0/sql/statements/stmt-001`,
		});

		// One delay before each poll, none before the initial POST
		expect(sleep).toHaveBeenCalledTimes(2);
		expect(sleep).toHaveBeenCalledWith(5000);
	});
});

describe('Job -> Run (wait for completion)', () => {
	const JOB_ID = 281874479417551;
	const RUN_ID = 41847992357943;
	const RUN_NOW_RESPONSE = { run_id: RUN_ID, number_in_job: RUN_ID };
	const runningRun = { job_id: JOB_ID, run_id: RUN_ID, status: { state: 'RUNNING' } };
	const terminatedRun = (terminationDetails: { code: string; type: string; message?: string }) => ({
		job_id: JOB_ID,
		run_id: RUN_ID,
		run_page_url: `${HOST}/?o=123#job/${JOB_ID}/run/${RUN_ID}`,
		status: { state: 'TERMINATED', termination_details: terminationDetails },
	});

	const parameterEntry = (name: string, value?: unknown) => ({ name, value });

	const setupContext = (overrides: Record<string, NodeParameterValueType | object> = {}) => {
		const parameters: Record<string, NodeParameterValueType | object> = {
			authentication: 'accessToken',
			jobId: String(JOB_ID),
			'jobParameters.parameters': [],
			waitForCompletion: true,
			options: { timeout: 10 },
			...overrides,
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getNodeParameter.mockImplementation((name) => parameters[name]);
		context.getCredentials.mockResolvedValue({ host: HOST });
		return context;
	};

	beforeEach(() => vi.mocked(sleep).mockClear());

	it('should poll runs/get until the run terminates and return the final run', async () => {
		const context = setupContext();
		const finalRun = terminatedRun({ code: 'SUCCESS', type: 'SUCCESS' });
		context.helpers.httpRequestWithAuthentication
			.mockResolvedValueOnce(RUN_NOW_RESPONSE)
			.mockResolvedValueOnce(runningRun)
			.mockResolvedValueOnce(finalRun);

		const result = await runJob.call(context, 0);

		expect(result).toEqual([{ json: finalRun, pairedItem: { item: 0 } }]);
		expect(sleep).toHaveBeenCalledTimes(2);
		expect(sleep).toHaveBeenCalledWith(5000, context.getExecutionCancelSignal());
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(3);
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenNthCalledWith(
			2,
			'databricksApi',
			expect.objectContaining({
				method: 'GET',
				url: `${HOST}/api/2.2/jobs/runs/get`,
				qs: { run_id: RUN_ID },
			}),
		);
	});

	it('should return the run reference without polling when not waiting', async () => {
		const context = setupContext({
			waitForCompletion: false,
			'jobParameters.parameters': [parameterEntry('environment', 'staging')],
		});
		context.helpers.httpRequestWithAuthentication.mockResolvedValueOnce(RUN_NOW_RESPONSE);

		const result = await runJob.call(context, 0);

		expect(result).toEqual([{ json: RUN_NOW_RESPONSE, pairedItem: { item: 0 } }]);
		expect(sleep).not.toHaveBeenCalled();
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'databricksApi',
			expect.objectContaining({
				method: 'POST',
				url: `${HOST}/api/2.2/jobs/run-now`,
				body: { job_id: JOB_ID, job_parameters: { environment: 'staging' } },
			}),
		);
	});

	it('should omit job_parameters when none are set', async () => {
		const context = setupContext({ waitForCompletion: false });
		context.helpers.httpRequestWithAuthentication.mockResolvedValueOnce(RUN_NOW_RESPONSE);

		await runJob.call(context, 0);

		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'databricksApi',
			expect.objectContaining({ body: { job_id: JOB_ID } }),
		);
	});

	it('should fail with the termination message when the run does not succeed', async () => {
		const context = setupContext();
		context.helpers.httpRequestWithAuthentication
			.mockResolvedValueOnce(RUN_NOW_RESPONSE)
			.mockResolvedValueOnce(
				terminatedRun({
					code: 'RUN_EXECUTION_ERROR',
					type: 'CLIENT_ERROR',
					message: 'Task main failed with message: Workload failed, see run output for details.',
				}),
			);

		await expect(runJob.call(context, 0)).rejects.toMatchObject({
			message: `Job run ${RUN_ID} failed (RUN_EXECUTION_ERROR): Task main failed with message: Workload failed, see run output for details.`,
			description: expect.stringContaining(`#job/${JOB_ID}/run/${RUN_ID}`),
		});
	});

	it('should treat a run that finished with task failures as failed', async () => {
		const context = setupContext();
		context.helpers.httpRequestWithAuthentication
			.mockResolvedValueOnce(RUN_NOW_RESPONSE)
			.mockResolvedValueOnce(
				terminatedRun({
					code: 'SUCCESS_WITH_FAILURES',
					type: 'CLIENT_ERROR',
					message: 'One or more tasks failed',
				}),
			);

		await expect(runJob.call(context, 0)).rejects.toThrow(
			`Job run ${RUN_ID} failed (SUCCESS_WITH_FAILURES): One or more tasks failed`,
		);
	});

	it('should read the deprecated state object when status is absent', async () => {
		const context = setupContext();
		const legacyRun = {
			job_id: JOB_ID,
			run_id: RUN_ID,
			state: { life_cycle_state: 'TERMINATED', result_state: 'SUCCESS' },
		};
		context.helpers.httpRequestWithAuthentication
			.mockResolvedValueOnce(RUN_NOW_RESPONSE)
			.mockResolvedValueOnce({
				job_id: JOB_ID,
				run_id: RUN_ID,
				state: { life_cycle_state: 'PENDING' },
			})
			.mockResolvedValueOnce(legacyRun);

		const result = await runJob.call(context, 0);

		expect(result).toEqual([{ json: legacyRun, pairedItem: { item: 0 } }]);
	});

	it('should fail from the deprecated state object when the result is not a success', async () => {
		const context = setupContext();
		context.helpers.httpRequestWithAuthentication
			.mockResolvedValueOnce(RUN_NOW_RESPONSE)
			.mockResolvedValueOnce({
				job_id: JOB_ID,
				run_id: RUN_ID,
				state: {
					life_cycle_state: 'TERMINATED',
					result_state: 'FAILED',
					state_message: 'Cluster failed to start',
				},
			});

		await expect(runJob.call(context, 0)).rejects.toThrow(
			`Job run ${RUN_ID} failed (FAILED): Cluster failed to start`,
		);
	});

	it.each([
		['SKIPPED', 'Skipped: another run of this job is active'],
		['INTERNAL_ERROR', 'Internal error'],
	])(
		'should stop polling on the deprecated terminal state %s and fail with its message',
		async (lifeCycleState, stateMessage) => {
			const context = setupContext();
			context.helpers.httpRequestWithAuthentication
				.mockResolvedValueOnce(RUN_NOW_RESPONSE)
				.mockResolvedValueOnce({
					job_id: JOB_ID,
					run_id: RUN_ID,
					state: { life_cycle_state: lifeCycleState, state_message: stateMessage },
				});

			await expect(runJob.call(context, 0)).rejects.toThrow(
				`Job run ${RUN_ID} failed (${lifeCycleState}): ${stateMessage}`,
			);
			expect(sleep).toHaveBeenCalledTimes(1);
		},
	);

	it('should fall back to the termination type when no termination code is present', async () => {
		const context = setupContext();
		context.helpers.httpRequestWithAuthentication
			.mockResolvedValueOnce(RUN_NOW_RESPONSE)
			.mockResolvedValueOnce({
				job_id: JOB_ID,
				run_id: RUN_ID,
				status: { state: 'TERMINATED', termination_details: { type: 'CLOUD_FAILURE' } },
			});

		await expect(runJob.call(context, 0)).rejects.toThrow(
			`Job run ${RUN_ID} failed (CLOUD_FAILURE): CLOUD_FAILURE`,
		);
	});

	it('should coerce job parameter values to strings and skip entries without a name', async () => {
		const context = setupContext({
			waitForCompletion: false,
			'jobParameters.parameters': [
				parameterEntry('count', 3),
				parameterEntry('flag', false),
				parameterEntry('', 'ignored'),
				parameterEntry('empty'),
			],
		});
		context.helpers.httpRequestWithAuthentication.mockResolvedValueOnce(RUN_NOW_RESPONSE);

		await runJob.call(context, 0);

		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'databricksApi',
			expect.objectContaining({
				body: { job_id: JOB_ID, job_parameters: { count: '3', flag: 'false', empty: '' } },
			}),
		);
	});

	it.each([
		[{ timeout: 10 }, 10, 2],
		[{ timeout: 3 }, 3, 1],
		[{}, 600, 120],
	])(
		'should poll every 5 seconds until the timeout %j elapses and then fail',
		async (options, seconds, polls) => {
			const context = setupContext({ options });
			context.helpers.httpRequestWithAuthentication
				.mockResolvedValueOnce(RUN_NOW_RESPONSE)
				.mockResolvedValue(runningRun);

			await expect(runJob.call(context, 0)).rejects.toThrow(
				`Job run ${RUN_ID} did not finish within ${seconds} seconds`,
			);
			expect(sleep).toHaveBeenCalledTimes(polls);
			expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(polls + 1);
		},
	);

	it.each([0, -5, '30s'])(
		'should reject the timeout %j before starting the run',
		async (timeout) => {
			const context = setupContext({ options: { timeout } });

			await expect(runJob.call(context, 0)).rejects.toThrow(
				'Timeout must be a positive number of seconds',
			);
			expect(context.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
		},
	);

	it('should ignore an invalid timeout when not waiting for completion', async () => {
		const context = setupContext({ waitForCompletion: false, options: { timeout: 0 } });
		context.helpers.httpRequestWithAuthentication.mockResolvedValueOnce(RUN_NOW_RESPONSE);

		await expect(runJob.call(context, 0)).resolves.toEqual([
			{ json: RUN_NOW_RESPONSE, pairedItem: { item: 0 } },
		]);
	});

	it('should reject a non-numeric job ID before any request', async () => {
		const context = setupContext({ jobId: 'not-a-number' });

		await expect(runJob.call(context, 0)).rejects.toThrow('Job ID must be a whole number');
		expect(context.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
	});

	it('should reject a job ID that cannot be sent as an exact number', async () => {
		const context = setupContext({ jobId: '9007199254740993' });

		await expect(runJob.call(context, 0)).rejects.toThrow('Job ID is too large to send exactly');
		expect(context.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
	});
});

describe('Job -> Run (job locator URL mode)', () => {
	const regexSource = jobParameters[0].modes?.find((mode) => mode.name === 'url')?.extractValue;
	const regex = new RegExp(String(regexSource?.type === 'regex' ? regexSource.regex : ''));

	it.each([
		['https://adb-1234567890.1.azuredatabricks.net/jobs/281874479417551', '281874479417551'],
		[
			'https://adb-1234567890.1.azuredatabricks.net/jobs/281874479417551?o=123#job',
			'281874479417551',
		],
		[
			'https://adb-1234567890.1.azuredatabricks.net/jobs/281874479417551/runs/41847992357943',
			'281874479417551',
		],
		[
			'https://dbc-5a643033-7dd4.cloud.databricks.com/?o=7474656527543353#job/281874479417551/run/41847992357943',
			'281874479417551',
		],
		['https://dbc-5a643033-7dd4.cloud.databricks.com/#job/281874479417551', '281874479417551'],
	])('should extract the job ID from %s', (url, jobId) => {
		const match = regex.exec(url);
		expect(match).toHaveLength(2);
		expect(match?.[1]).toBe(jobId);
	});

	it.each([
		'http://adb-1234567890.1.azuredatabricks.net/jobs/281874479417551',
		'https://adb-1234567890.1.azuredatabricks.net/jobs/list',
		'https://adb-1234567890.1.azuredatabricks.net/sql/warehouses/abc',
	])('should not match %s', (url) => {
		expect(regex.exec(url)).toBeNull();
	});
});

describe('listSearch -> getJobs', () => {
	const job = (jobId: number, name?: string) => ({
		job_id: jobId,
		...(name === undefined ? {} : { settings: { name } }),
	});
	const listItem = (jobId: number, name: string) => ({
		name,
		value: String(jobId),
		url: `${HOST}/jobs/${jobId}`,
	});

	const setupContext = () => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getNodeParameter.mockReturnValue('accessToken');
		context.getCredentials.mockResolvedValue({ host: HOST });
		return context;
	};

	it('should return one page with its next token when no filter is given', async () => {
		const context = setupContext();
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({
			jobs: [job(281874479417551, 'Nightly ETL'), job(42)],
			next_page_token: 'next-token',
		});

		const result = await getJobs.call(context, undefined, 'prev-token');

		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'databricksApi',
			expect.objectContaining({
				method: 'GET',
				url: `${HOST}/api/2.2/jobs/list`,
				qs: { limit: 100, page_token: 'prev-token' },
			}),
		);
		expect(result).toEqual({
			results: [listItem(281874479417551, 'Nightly ETL'), listItem(42, '42')],
			paginationToken: 'next-token',
		});
	});

	it('should send only the limit on the first unfiltered page', async () => {
		const context = setupContext();
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({ jobs: [] });

		const result = await getJobs.call(context);

		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'databricksApi',
			expect.objectContaining({ qs: { limit: 100 } }),
		);
		expect(result).toEqual({ results: [], paginationToken: undefined });
	});

	it('should scan pages and match the filter against job names case-insensitively', async () => {
		// The API's `name` parameter only matches a whole job name, so it must not be sent
		const context = setupContext();
		context.helpers.httpRequestWithAuthentication
			.mockResolvedValueOnce({
				jobs: [job(1, 'Nightly ETL'), job(2, 'Daily Load')],
				next_page_token: 'page-2',
			})
			.mockResolvedValueOnce({ jobs: [job(3, 'nightly backfill'), job(4)] });

		const result = await getJobs.call(context, 'Nightly');

		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenNthCalledWith(
			1,
			'databricksApi',
			expect.objectContaining({ qs: { limit: 100 } }),
		);
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenNthCalledWith(
			2,
			'databricksApi',
			expect.objectContaining({ qs: { limit: 100, page_token: 'page-2' } }),
		);
		expect(result).toEqual({
			results: [listItem(1, 'Nightly ETL'), listItem(3, 'nightly backfill')],
		});
	});

	it('should stop scanning after ten pages while filtering', async () => {
		const context = setupContext();
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({
			jobs: [job(7, 'Other')],
			next_page_token: 'more',
		});

		const result = await getJobs.call(context, 'missing');

		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(10);
		expect(result).toEqual({ results: [] });
	});
});
