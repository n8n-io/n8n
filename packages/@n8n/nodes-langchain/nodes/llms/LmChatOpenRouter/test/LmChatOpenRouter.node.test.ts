import { ChatOpenAI } from '@langchain/openai';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { ISupplyDataFunctions, INode } from 'n8n-workflow';

import { LmChatOpenRouter } from '../LmChatOpenRouter.node';
import { makeN8nLlmFailedAttemptHandler } from '../../n8nLlmFailedAttemptHandler';
import { N8nLlmTracing } from '../../N8nLlmTracing';

jest.mock('@langchain/openai');
jest.mock('../../N8nLlmTracing');
jest.mock('../../n8nLlmFailedAttemptHandler');
jest.mock('@utils/httpProxyAgent', () => ({
	getProxyAgent: jest.fn().mockReturnValue({}),
}));

const MockedChatOpenAI = jest.mocked(ChatOpenAI);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);

describe('LmChatOpenRouter', () => {
	let lmChatOpenRouter: LmChatOpenRouter;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'OpenRouter Chat Model',
		typeVersion: 1,
		type: 'n8n-nodes-langchain.lmChatOpenRouter',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (nodeOverrides: Partial<INode> = {}) => {
		const node = { ...mockNode, ...nodeOverrides };
		mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			node,
		) as jest.Mocked<ISupplyDataFunctions>;

		mockContext.getCredentials = jest.fn().mockResolvedValue({
			apiKey: 'test-api-key',
			url: 'https://openrouter.ai/api/v1',
		});
		mockContext.getNode = jest.fn().mockReturnValue(node);
		mockContext.getNodeParameter = jest.fn();

		MockedN8nLlmTracing.mockImplementation(() => ({}) as any);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());

		return mockContext;
	};

	beforeEach(() => {
		lmChatOpenRouter = new LmChatOpenRouter();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('node description', () => {
		it('should have correct node properties', () => {
			expect(lmChatOpenRouter.description).toMatchObject({
				displayName: 'OpenRouter Chat Model',
				name: 'lmChatOpenRouter',
				group: ['transform'],
				version: [1],
				description: 'For advanced usage with an AI chain',
			});
		});

		it('should have correct credentials configuration', () => {
			expect(lmChatOpenRouter.description.credentials).toEqual([
				{ name: 'openRouterApi', required: true },
			]);
		});

		it('should have correct output configuration', () => {
			expect(lmChatOpenRouter.description.outputs).toEqual(['ai_languageModel']);
			expect(lmChatOpenRouter.description.outputNames).toEqual(['Model']);
		});

		it('should have correct inputs configuration', () => {
			expect(lmChatOpenRouter.description.inputs).toEqual([]);
		});

		it('should have model parameter with type options', () => {
			const modelParam = lmChatOpenRouter.description.properties.find((p) => p.name === 'model');
			expect(modelParam).toBeDefined();
			expect(modelParam?.type).toBe('options');
			expect(modelParam?.displayName).toBe('Model');
		});

		it('should have options parameter with collection type', () => {
			const optionsParam = lmChatOpenRouter.description.properties.find(
				(p) => p.name === 'options',
			);
			expect(optionsParam).toBeDefined();
			expect(optionsParam?.type).toBe('collection');
		});
	});

	describe('supplyData', () => {
		describe('basic configuration', () => {
			it('should create ChatOpenAI instance with basic configuration', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return {};
					return undefined;
				});

				const result = await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(mockContext.getCredentials).toHaveBeenCalledWith('openRouterApi');
				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						apiKey: 'test-api-key',
						model: 'openai/gpt-4.1-mini',
						maxRetries: 2,
						timeout: undefined,
						callbacks: expect.arrayContaining([expect.any(Object)]),
						onFailedAttempt: expect.any(Function),
					}),
				);

				expect(result).toEqual({ response: expect.any(Object) });
			});

			it('should use baseURL from credentials', async () => {
				const mockContext = setupMockContext();

				mockContext.getCredentials = jest.fn().mockResolvedValue({
					apiKey: 'test-api-key',
					url: 'https://custom-openrouter.example.com/v1',
				});

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return {};
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						configuration: expect.objectContaining({
							baseURL: 'https://custom-openrouter.example.com/v1',
						}),
					}),
				);
			});

			it('should create N8nLlmTracing callback', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return {};
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedN8nLlmTracing).toHaveBeenCalledWith(mockContext);
			});

			it('should create failed attempt handler', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return {};
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(mockedMakeN8nLlmFailedAttemptHandler).toHaveBeenCalledWith(
					mockContext,
					expect.any(Function),
				);
			});
		});

		describe('standard LLM options', () => {
			it('should handle frequency penalty option', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { frequencyPenalty: 0.5 };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						frequencyPenalty: 0.5,
					}),
				);
			});

			it('should handle maxTokens option', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { maxTokens: 1000 };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						maxTokens: 1000,
					}),
				);
			});

			it('should handle presence penalty option', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { presencePenalty: 0.3 };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						presencePenalty: 0.3,
					}),
				);
			});

			it('should handle temperature option', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { temperature: 0.8 };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						temperature: 0.8,
					}),
				);
			});

			it('should handle topP option', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { topP: 0.9 };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						topP: 0.9,
					}),
				);
			});

			it('should handle timeout option', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { timeout: 45000 };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						timeout: 45000,
					}),
				);
			});

			it('should handle maxRetries option', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { maxRetries: 5 };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						maxRetries: 5,
					}),
				);
			});

			it('should handle all standard options together', async () => {
				const mockContext = setupMockContext();

				const options = {
					frequencyPenalty: 0.5,
					maxTokens: 1000,
					presencePenalty: 0.3,
					temperature: 0.8,
					topP: 0.9,
					timeout: 45000,
					maxRetries: 3,
				};

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return options;
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						frequencyPenalty: 0.5,
						maxTokens: 1000,
						presencePenalty: 0.3,
						temperature: 0.8,
						topP: 0.9,
						timeout: 45000,
						maxRetries: 3,
					}),
				);
			});
		});

		describe('response format option', () => {
			it('should handle text response format', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { responseFormat: 'text' };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							response_format: { type: 'text' },
						}),
					}),
				);
			});

			it('should handle json_object response format', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { responseFormat: 'json_object' };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							response_format: { type: 'json_object' },
						}),
					}),
				);
			});
		});

		describe('provider routing options', () => {
			it('should handle order option with comma-separated providers', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options')
						return { providerRouting: { order: 'anthropic,openai,google' } };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							provider: expect.objectContaining({
								order: ['anthropic', 'openai', 'google'],
							}),
						}),
					}),
				);
			});

			it('should handle order option with spaces in provider names', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options')
						return { providerRouting: { order: ' anthropic , openai , google ' } };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							provider: expect.objectContaining({
								order: ['anthropic', 'openai', 'google'],
							}),
						}),
					}),
				);
			});

			it('should handle allowFallbacks option', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { providerRouting: { allowFallbacks: false } };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							provider: expect.objectContaining({
								allow_fallbacks: false,
							}),
						}),
					}),
				);
			});

			it('should handle requireParameters option', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { providerRouting: { requireParameters: true } };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							provider: expect.objectContaining({
								require_parameters: true,
							}),
						}),
					}),
				);
			});

			it('should handle dataCollection option with allow', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { providerRouting: { dataCollection: 'allow' } };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							provider: expect.objectContaining({
								data_collection: 'allow',
							}),
						}),
					}),
				);
			});

			it('should handle dataCollection option with deny', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { providerRouting: { dataCollection: 'deny' } };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							provider: expect.objectContaining({
								data_collection: 'deny',
							}),
						}),
					}),
				);
			});

			it('should handle zdr (Zero Data Retention) option', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { providerRouting: { zdr: true } };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							provider: expect.objectContaining({
								zdr: true,
							}),
						}),
					}),
				);
			});

			it('should handle only option with comma-separated providers', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { providerRouting: { only: 'azure,anthropic' } };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							provider: expect.objectContaining({
								only: ['azure', 'anthropic'],
							}),
						}),
					}),
				);
			});

			it('should handle ignore option with comma-separated providers', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { providerRouting: { ignore: 'anthropic,openai' } };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							provider: expect.objectContaining({
								ignore: ['anthropic', 'openai'],
							}),
						}),
					}),
				);
			});

			it('should handle sort option with price', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { providerRouting: { sort: 'price' } };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							provider: expect.objectContaining({
								sort: 'price',
							}),
						}),
					}),
				);
			});

			it('should handle sort option with throughput', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { providerRouting: { sort: 'throughput' } };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							provider: expect.objectContaining({
								sort: 'throughput',
							}),
						}),
					}),
				);
			});

			it('should handle sort option with latency', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { providerRouting: { sort: 'latency' } };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							provider: expect.objectContaining({
								sort: 'latency',
							}),
						}),
					}),
				);
			});

			it('should handle multiple provider routing options together', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options')
						return {
							providerRouting: {
								order: 'anthropic,openai',
								allowFallbacks: false,
								requireParameters: true,
								dataCollection: 'deny',
								zdr: true,
								only: 'azure,anthropic',
								ignore: 'google',
								sort: 'price',
							},
						};
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							provider: expect.objectContaining({
								order: ['anthropic', 'openai'],
								allow_fallbacks: false,
								require_parameters: true,
								data_collection: 'deny',
								zdr: true,
								only: ['azure', 'anthropic'],
								ignore: ['google'],
								sort: 'price',
							}),
						}),
					}),
				);
			});

			it('should not add provider to modelKwargs when providerRouting is empty', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { providerRouting: {} };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				const callArgs = MockedChatOpenAI.mock.calls[0][0];
				expect(callArgs.modelKwargs).toBeUndefined();
			});
		});

		describe('combined options', () => {
			it('should handle response format and provider routing together', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options')
						return {
							responseFormat: 'json_object',
							providerRouting: {
								order: 'anthropic,openai',
								sort: 'price',
							},
						};
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							response_format: { type: 'json_object' },
							provider: expect.objectContaining({
								order: ['anthropic', 'openai'],
								sort: 'price',
							}),
						}),
					}),
				);
			});

			it('should handle all option types together', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options')
						return {
							frequencyPenalty: 0.5,
							maxTokens: 1000,
							presencePenalty: 0.3,
							temperature: 0.8,
							topP: 0.9,
							timeout: 45000,
							maxRetries: 3,
							responseFormat: 'json_object',
							providerRouting: {
								order: 'anthropic,openai',
								allowFallbacks: true,
								dataCollection: 'deny',
								sort: 'price',
							},
						};
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						frequencyPenalty: 0.5,
						maxTokens: 1000,
						presencePenalty: 0.3,
						temperature: 0.8,
						topP: 0.9,
						timeout: 45000,
						maxRetries: 3,
						modelKwargs: expect.objectContaining({
							response_format: { type: 'json_object' },
							provider: expect.objectContaining({
								order: ['anthropic', 'openai'],
								allow_fallbacks: true,
								data_collection: 'deny',
								sort: 'price',
							}),
						}),
					}),
				);
			});
		});

		describe('edge cases', () => {
			it('should handle empty strings in comma-separated provider lists', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { providerRouting: { order: 'anthropic,,openai,' } };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						modelKwargs: expect.objectContaining({
							provider: expect.objectContaining({
								order: ['anthropic', 'openai'],
							}),
						}),
					}),
				);
			});

			it('should not add modelKwargs when no response format or provider routing', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return { temperature: 0.7 };
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				const callArgs = MockedChatOpenAI.mock.calls[0][0];
				expect(callArgs.modelKwargs).toBeUndefined();
			});

			it('should use default maxRetries when not provided', async () => {
				const mockContext = setupMockContext();

				mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'openai/gpt-4.1-mini';
					if (paramName === 'options') return {};
					return undefined;
				});

				await lmChatOpenRouter.supplyData.call(mockContext, 0);

				expect(MockedChatOpenAI).toHaveBeenCalledWith(
					expect.objectContaining({
						maxRetries: 2,
					}),
				);
			});
		});
	});
});
