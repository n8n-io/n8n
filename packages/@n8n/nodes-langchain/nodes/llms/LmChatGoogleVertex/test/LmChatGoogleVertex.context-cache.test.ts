/**
 * Google Vertex Chat Model — predefined cache wiring & auto-cache supplyData:
 * - Predefined: passes cache resource name into `cachedContent`; strips tools from invocationParams;
 *   strips system messages in `_generate` with a warning hint when present.
 * - Auto: applies auto-cache patch whenever strategy is auto (any execution mode).
 */
import { ChatVertexAI } from '@langchain/google-vertexai';
import { makeN8nLlmFailedAttemptHandler, N8nLlmTracing } from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import { NodeOperationError, type INode, type ISupplyDataFunctions } from 'n8n-workflow';

import { applyVertexAutoContextCachePatch } from '../context-caching/auto/auto-cache';
import { vertexContextCachePredefinedIgnoredSystemHint } from '../context-caching/predefined/hints';
import { LmChatGoogleVertex } from '../LmChatGoogleVertex.node';

jest.mock('@langchain/google-vertexai');
jest.mock('@n8n/ai-utilities');
jest.mock('redis', () => {
	const connect = jest.fn().mockResolvedValue(undefined);
	const quit = jest.fn().mockResolvedValue(undefined);
	const disconnect = jest.fn().mockResolvedValue(undefined);
	return {
		createClient: jest.fn(() => ({
			connect,
			del: jest.fn().mockResolvedValue(0),
			disconnect,
			get: jest.fn().mockResolvedValue(null),
			quit,
			set: jest.fn().mockResolvedValue('OK'),
		})),
	};
});
jest.mock('../context-caching/auto/auto-cache', () => ({
	...jest.requireActual<typeof import('../context-caching/auto/auto-cache')>(
		'../context-caching/auto/auto-cache',
	),
	applyVertexAutoContextCachePatch: jest.fn(),
}));
jest.mock('n8n-nodes-base/dist/utils/utilities', () => ({
	formatPrivateKey: jest.fn().mockImplementation((key: string) => key),
}));

const MockedChatVertexAI = jest.mocked(ChatVertexAI);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);
const mockedApplyVertexAutoContextCachePatch = jest.mocked(applyVertexAutoContextCachePatch);

let lastMockedInvocationParams: jest.Mock;

describe('LmChatGoogleVertex — context cache', () => {
	let lmChatGoogleVertex: LmChatGoogleVertex;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'Google Vertex Chat Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmChatGoogleVertex',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = () => {
		mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as jest.Mocked<ISupplyDataFunctions>;

		mockContext.getCredentials = jest.fn().mockImplementation((type: string) => {
			if (type === 'googleApi') {
				return Promise.resolve({
					privateKey: 'test-private-key',
					email: 'test@n8n.io',
					region: 'us-central1',
				});
			}
			if (type === 'redis') {
				return Promise.resolve({
					database: 0,
					host: 'localhost',
					port: 6379,
					password: '',
					ssl: false,
				});
			}
			return Promise.reject(new Error(`Unexpected credential: ${type}`));
		});
		mockContext.getNode = jest.fn().mockReturnValue(mockNode);
		mockContext.getNodeParameter = jest.fn();
		mockContext.addExecutionHints = jest.fn();
		mockContext.getMode = jest.fn().mockReturnValue('trigger');
		mockContext.logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() };

		MockedN8nLlmTracing.mockImplementation(() => ({}) as unknown as N8nLlmTracing);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());

		return mockContext;
	};

	beforeEach(() => {
		lmChatGoogleVertex = new LmChatGoogleVertex();
		jest.clearAllMocks();
		MockedChatVertexAI.mockImplementation(() => {
			lastMockedInvocationParams = jest.fn().mockReturnValue({ fromOriginal: true });
			return {
				invocationParams: lastMockedInvocationParams,
			} as unknown as ChatVertexAI;
		});
	});

	const baseOptions = {
		maxOutputTokens: 2048,
		temperature: 0.4,
		topK: 40,
		topP: 0.9,
	};

	describe('Manual / predefined cache', () => {
		it('uses the trimmed cache resource name as cachedContent', async () => {
			const ctx = setupMockContext();
			const cacheResource = 'projects/123/locations/us-central1/cachedContents/my-cache';

			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'modelName') return 'gemini-2.5-flash';
				if (paramName === 'projectId') return 'test-project';
				if (paramName === 'contextCacheStrategy') return 'predefined';
				if (paramName === 'contextCacheName') return `  ${cacheResource}  `;
				if (paramName === 'options') return baseOptions;
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			await lmChatGoogleVertex.supplyData.call(ctx, 0);

			const modelInstance = MockedChatVertexAI.mock.results[0]?.value as {
				invocationParams: (opts: { topP?: number }) => unknown;
			};
			lastMockedInvocationParams.mockReturnValue({
				allowed_function_names: ['math'],
				fromOriginal: true,
				tool_choice: 'auto',
				tools: [{ functionDeclarations: [{ name: 'math' }] }],
			});
			const out = modelInstance.invocationParams({ topP: 0.5 });
			expect(out).toEqual({ fromOriginal: true, cachedContent: cacheResource });
			expect(lastMockedInvocationParams).toHaveBeenCalledWith({ topP: 0.5 });
		});

		it('omits tools, tool_choice, and allowed_function_names when merging cachedContent', async () => {
			const ctx = setupMockContext();
			const cacheResource = 'projects/123/locations/us-central1/cachedContents/predef';

			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'modelName') return 'gemini-2.5-flash';
				if (paramName === 'projectId') return 'test-project';
				if (paramName === 'contextCacheStrategy') return 'predefined';
				if (paramName === 'contextCacheName') return cacheResource;
				if (paramName === 'options') return baseOptions;
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			await lmChatGoogleVertex.supplyData.call(ctx, 0);

			const modelInstance = MockedChatVertexAI.mock.results[0]?.value as {
				invocationParams: () => unknown;
			};
			lastMockedInvocationParams.mockReturnValue({
				allowed_function_names: ['a'],
				tool_choice: 'auto',
				tools: [{ functionDeclarations: [{ name: 'x' }] }],
				topP: 1,
			});
			expect(modelInstance.invocationParams()).toEqual({
				cachedContent: cacheResource,
				topP: 1,
			});
		});

		it('strips system messages in _generate and warns when system messages are present', async () => {
			const innerGenerate = jest.fn().mockResolvedValue({ generations: [] });
			MockedChatVertexAI.mockImplementation(() => {
				lastMockedInvocationParams = jest.fn().mockReturnValue({ topP: 1 });
				return {
					_generate: innerGenerate,
					invocationParams: lastMockedInvocationParams,
				} as unknown as ChatVertexAI;
			});

			const ctx = setupMockContext();
			const cacheResource = 'projects/123/locations/us-central1/cachedContents/predef-sys';

			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'modelName') return 'gemini-2.5-flash';
				if (paramName === 'projectId') return 'test-project';
				if (paramName === 'contextCacheStrategy') return 'predefined';
				if (paramName === 'contextCacheName') return cacheResource;
				if (paramName === 'options') return baseOptions;
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			await lmChatGoogleVertex.supplyData.call(ctx, 0);

			const modelInstance = MockedChatVertexAI.mock.results[0]?.value as {
				_generate: (
					msgs: Array<{ content: string; type: string }>,
					opts: object,
					rm?: unknown,
				) => Promise<unknown>;
			};

			await modelInstance._generate(
				[
					{ content: 'System prompt', type: 'system' },
					{ content: 'hello', type: 'human' },
				],
				{ allowed_function_names: ['x'], tool_choice: 'auto', tools: [{ x: 1 }] },
				undefined,
			);

			expect(ctx.addExecutionHints).toHaveBeenCalledWith(
				vertexContextCachePredefinedIgnoredSystemHint(),
			);
			expect(innerGenerate).toHaveBeenCalledWith(
				[{ content: 'hello', type: 'human' }],
				{},
				undefined,
			);
		});

		it('rejects empty Context Cache Name', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'modelName') return 'gemini-2.5-flash';
				if (paramName === 'projectId') return 'test-project';
				if (paramName === 'contextCacheStrategy') return 'predefined';
				if (paramName === 'contextCacheName') return '   ';
				if (paramName === 'options') return baseOptions;
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			await expect(lmChatGoogleVertex.supplyData.call(ctx, 0)).rejects.toThrow(NodeOperationError);
			expect(MockedChatVertexAI).not.toHaveBeenCalled();
		});
	});

	describe('Auto-caching and execution mode', () => {
		it('applies auto-cache patch when strategy is auto', async () => {
			const ctx = setupMockContext();
			ctx.getMode = jest.fn().mockReturnValue('trigger');

			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'modelName') return 'gemini-2.5-flash';
				if (paramName === 'projectId') return 'test-project';
				if (paramName === 'contextCacheStrategy') return 'auto';
				if (paramName === 'contextCacheTtlSeconds') return 900;
				if (paramName === 'vertexContextCacheRedisKeyPrefix') return 'n8n:vertexCtx';
				if (paramName === 'options') return baseOptions;
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			await lmChatGoogleVertex.supplyData.call(ctx, 0);
			expect(mockedApplyVertexAutoContextCachePatch).toHaveBeenCalledTimes(1);
			expect(mockedApplyVertexAutoContextCachePatch).toHaveBeenCalledWith(
				expect.anything(),
				ctx,
				expect.objectContaining({
					metadataStorage: expect.objectContaining({
						delete: expect.any(Function),
						read: expect.any(Function),
						write: expect.any(Function),
						writeIfAbsent: expect.any(Function),
					}),
				}),
			);
		});

		it('applies auto-cache patch in manual execution mode as well', async () => {
			const ctx = setupMockContext();
			ctx.getMode = jest.fn().mockReturnValue('manual');

			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'modelName') return 'gemini-2.5-flash';
				if (paramName === 'projectId') return 'test-project';
				if (paramName === 'contextCacheStrategy') return 'auto';
				if (paramName === 'contextCacheTtlSeconds') return 900;
				if (paramName === 'vertexContextCacheRedisKeyPrefix') return 'n8n:vertexCtx';
				if (paramName === 'options') return baseOptions;
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			await lmChatGoogleVertex.supplyData.call(ctx, 0);
			expect(mockedApplyVertexAutoContextCachePatch).toHaveBeenCalledTimes(1);
			expect(ctx.addExecutionHints).not.toHaveBeenCalled();
		});

		it('rejects auto strategy when Context Cache TTL is missing', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'modelName') return 'gemini-2.5-flash';
				if (paramName === 'projectId') return 'test-project';
				if (paramName === 'contextCacheStrategy') return 'auto';
				if (paramName === 'contextCacheTtlSeconds') return undefined;
				if (paramName === 'options') return baseOptions;
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			await expect(lmChatGoogleVertex.supplyData.call(ctx, 0)).rejects.toThrow(NodeOperationError);
			expect(MockedChatVertexAI).not.toHaveBeenCalled();
		});

		it('rejects auto strategy when context cache storage prefix is empty', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'modelName') return 'gemini-2.5-flash';
				if (paramName === 'projectId') return 'test-project';
				if (paramName === 'contextCacheStrategy') return 'auto';
				if (paramName === 'contextCacheTtlSeconds') return 900;
				if (paramName === 'vertexContextCacheRedisKeyPrefix') return '   ';
				if (paramName === 'options') return baseOptions;
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			await expect(lmChatGoogleVertex.supplyData.call(ctx, 0)).rejects.toThrow(NodeOperationError);
			expect(MockedChatVertexAI).not.toHaveBeenCalled();
		});
	});

	describe('None strategy', () => {
		it('does not wrap invocationParams or apply auto-cache patch', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'modelName') return 'gemini-2.5-flash';
				if (paramName === 'projectId') return 'test-project';
				if (paramName === 'contextCacheStrategy') return 'none';
				if (paramName === 'options') return baseOptions;
				if (paramName === 'options.safetySettings.values') return null;
				return undefined;
			});

			await lmChatGoogleVertex.supplyData.call(ctx, 0);
			const modelInstance = MockedChatVertexAI.mock.results[0]?.value as {
				invocationParams: jest.Mock;
			};
			expect(modelInstance.invocationParams).toBe(lastMockedInvocationParams);
			expect(mockedApplyVertexAutoContextCachePatch).not.toHaveBeenCalled();
		});
	});
});
