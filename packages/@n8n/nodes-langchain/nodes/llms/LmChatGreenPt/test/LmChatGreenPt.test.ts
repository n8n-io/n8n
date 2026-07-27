/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatOpenAI } from '@langchain/openai';
import { getProxyAgent, makeN8nLlmFailedAttemptHandler } from '@n8n/ai-utilities';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { LmChatGreenPt } from '../LmChatGreenPt.node';

vi.mock('@langchain/openai');
vi.mock('@n8n/ai-utilities');

const MockedChatOpenAI = vi.mocked(ChatOpenAI);
const mockedMakeN8nLlmFailedAttemptHandler = vi.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetProxyAgent = vi.mocked(getProxyAgent);

describe('LmChatGreenPt', () => {
	let node: LmChatGreenPt;

	const mockNodeDef: INode = {
		id: '1',
		name: 'GreenPT Chat Model',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.lmChatGreenPt',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = () => {
		const ctx = {
			getCredentials: vi.fn(),
			getNode: vi.fn(),
			getNodeParameter: vi.fn(),
		} as unknown as Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-greenpt-key',
			url: 'https://api.greenpt.ai/v1',
		});
		ctx.getNode = vi.fn().mockReturnValue(mockNodeDef);
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'glm-5.2';
			if (paramName === 'options') return {};
			return undefined;
		});
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(vi.fn());
		mockedGetProxyAgent.mockReturnValue({} as ReturnType<typeof getProxyAgent>);
		return ctx;
	};

	beforeEach(() => {
		node = new LmChatGreenPt();
		vi.clearAllMocks();
	});

	it('should expose live model discovery and GreenPT credentials', () => {
		expect(node.description).toMatchObject({
			displayName: 'GreenPT Chat Model',
			name: 'lmChatGreenPt',
			credentials: [{ name: 'greenPtApi', required: true }],
			outputs: ['ai_languageModel'],
		});

		const model = node.description.properties.find((property) => property?.name === 'model');
		expect(model).toMatchObject({
			default: 'glm-5.2',
			typeOptions: {
				loadOptions: {
					routing: {
						request: { method: 'GET', url: '/models' },
					},
				},
			},
		});
	});

	it('should create ChatOpenAI with the GreenPT endpoint and flagship default', async () => {
		const ctx = setupMockContext();

		const result = await node.supplyData.call(ctx, 0);

		expect(ctx.getCredentials).toHaveBeenCalledWith('greenPtApi');
		expect(MockedChatOpenAI).toHaveBeenCalledWith(
			expect.objectContaining({
				apiKey: 'test-greenpt-key',
				model: 'glm-5.2',
				maxRetries: 2,
				configuration: expect.objectContaining({
					baseURL: 'https://api.greenpt.ai/v1',
				}),
			}),
		);
		expect(result).toEqual({ response: expect.any(Object) });
	});

	it('should pass coding model and generation options to ChatOpenAI', async () => {
		const ctx = setupMockContext();
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'kimi-k2.7-code';
			if (paramName === 'options')
				return {
					maxTokens: 4096,
					maxRetries: 4,
					responseFormat: 'json_object',
					temperature: 0.3,
					timeout: 120000,
					topP: 0.9,
				};
			return undefined;
		});

		await node.supplyData.call(ctx, 0);

		expect(MockedChatOpenAI).toHaveBeenCalledWith(
			expect.objectContaining({
				model: 'kimi-k2.7-code',
				maxTokens: 4096,
				maxRetries: 4,
				temperature: 0.3,
				timeout: 120000,
				topP: 0.9,
				modelKwargs: { response_format: { type: 'json_object' } },
			}),
		);
		expect(mockedGetProxyAgent).toHaveBeenCalledWith(
			'https://api.greenpt.ai/v1',
			expect.objectContaining({
				headersTimeout: 120000,
				bodyTimeout: 120000,
			}),
		);
	});
});
