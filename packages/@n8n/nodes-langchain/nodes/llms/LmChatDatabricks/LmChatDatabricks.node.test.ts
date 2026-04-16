/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { ChatOpenAI } from '@langchain/openai';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

jest.mock('@langchain/openai');

jest.mock('@n8n/ai-utilities', () => {
	const actual = jest.requireActual('@n8n/ai-utilities');
	return {
		...actual,
		N8nLlmTracing: jest.fn(),
		makeN8nLlmFailedAttemptHandler: jest.fn().mockReturnValue(jest.fn()),
		getConnectionHintNoticeField: jest.fn().mockReturnValue({}),
		getProxyAgent: jest.fn().mockReturnValue({}),
	};
});

const MockedChatOpenAI = jest.mocked(ChatOpenAI);

import { LmChatDatabricks } from './LmChatDatabricks.node';

describe('LmChatDatabricks', () => {
	let node: LmChatDatabricks;

	const mockNode: INode = {
		id: '1',
		name: 'Databricks Chat Model',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.lmChatDatabricks',
		position: [0, 0],
		parameters: {},
	};

	const databricksCredentials = {
		host: 'https://dbc-test.cloud.databricks.com',
		token: 'dapi-test-token-123',
	};

	const setupMockContext = (nodeOverrides: Partial<INode> = {}) => {
		const nodeConfig = { ...mockNode, ...nodeOverrides };
		const mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			nodeConfig,
		) as jest.Mocked<ISupplyDataFunctions>;

		mockContext.getCredentials = jest.fn().mockResolvedValue(databricksCredentials);
		mockContext.getNode = jest.fn().mockReturnValue(nodeConfig);
		mockContext.getNodeParameter = jest.fn();
		mockContext.logger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};
		return mockContext;
	};

	beforeEach(() => {
		node = new LmChatDatabricks();
		jest.clearAllMocks();
	});

	describe('description', () => {
		it('should have correct node metadata', () => {
			expect(node.description.name).toBe('lmChatDatabricks');
			expect(node.description.displayName).toBe('Databricks Chat Model');
			expect(node.description.credentials).toEqual([{ name: 'databricksApi', required: true }]);
			expect(node.description.outputs).toEqual(['ai_languageModel']);
		});

		it('should have requestDefaults with credential-based baseURL', () => {
			expect(node.description.requestDefaults).toEqual(
				expect.objectContaining({
					baseURL: '={{$credentials.host}}',
				}),
			);
		});

		it('should have model property with loadOptions routing', () => {
			const modelProp = node.description.properties.find((p) => p.name === 'model');
			expect(modelProp?.type).toBe('options');
			expect(modelProp?.typeOptions?.loadOptions?.routing).toBeDefined();
			expect(modelProp?.typeOptions?.loadOptions?.routing?.request?.url).toBe(
				'/api/2.0/serving-endpoints',
			);
		});
	});

	describe('supplyData', () => {
		it('should create ChatOpenAI with correct Databricks configuration', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'databricks-claude-sonnet-4-6';
				if (paramName === 'options') return {};
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'dapi-test-token-123',
					model: 'databricks-claude-sonnet-4-6',
					configuration: expect.objectContaining({
						baseURL: 'https://dbc-test.cloud.databricks.com/serving-endpoints',
					}),
				}),
			);
		});

		it('should strip trailing slash from host', async () => {
			const ctx = setupMockContext();
			ctx.getCredentials = jest.fn().mockResolvedValue({
				host: 'https://dbc-test.cloud.databricks.com/',
				token: 'dapi-test',
			});
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'test-endpoint';
				if (paramName === 'options') return {};
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: expect.objectContaining({
						baseURL: 'https://dbc-test.cloud.databricks.com/serving-endpoints',
					}),
				}),
			);
		});

		it('should pass options through to ChatOpenAI', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'test-model';
				if (paramName === 'options')
					return {
						temperature: 0.5,
						maxTokens: 1000,
						topP: 0.9,
						maxRetries: 3,
						timeout: 30000,
					};
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					temperature: 0.5,
					maxTokens: 1000,
					topP: 0.9,
					maxRetries: 3,
					timeout: 30000,
				}),
			);
		});

		it('should set response_format in modelKwargs when JSON format requested', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'test-model';
				if (paramName === 'options') return { responseFormat: 'json_object' };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: { response_format: { type: 'json_object' } },
				}),
			);
		});

		it('should not set modelKwargs when no responseFormat', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'test-model';
				if (paramName === 'options') return {};
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					modelKwargs: undefined,
				}),
			);
		});

		it('should use default timeout of 60000', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'test-model';
				if (paramName === 'options') return {};
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			expect(MockedChatOpenAI).toHaveBeenCalledWith(
				expect.objectContaining({
					timeout: 60000,
				}),
			);
		});

		it('should return model as response', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'test-model';
				if (paramName === 'options') return {};
				return undefined;
			});

			const result = await node.supplyData.call(ctx, 0);

			expect(result.response).toBeDefined();
			expect(result.response).toBeInstanceOf(ChatOpenAI);
		});
	});
});
