/**
 * Tests for AgentIterationHandler
 */

import { HumanMessage, AIMessage } from '@langchain/core/messages';

import { AgentIterationHandler } from '../agent-iteration-handler';

describe('AgentIterationHandler', () => {
	let handler: AgentIterationHandler;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('invokeLlm', () => {
		describe('onTokenUsage callback', () => {
			it('should call onTokenUsage callback with token counts when tokens are used', async () => {
				const onTokenUsage = jest.fn();

				handler = new AgentIterationHandler({
					onTokenUsage,
				});

				// Create mock LLM that returns a response with token usage
				const mockResponse = new AIMessage({
					content: 'Hello',
					response_metadata: {
						usage: { input_tokens: 100, output_tokens: 50 },
					},
				});

				const mockLlmWithTools = {
					invoke: jest.fn().mockResolvedValue(mockResponse),
				};

				const messages = [new HumanMessage('Test')];

				// Consume the generator to completion
				const generator = handler.invokeLlm({
					llmWithTools: mockLlmWithTools as never,
					messages,
					iteration: 1,
				});

				// Exhaust the generator

				for await (const _chunk of generator) {
					// consume chunks
				}

				expect(onTokenUsage).toHaveBeenCalledTimes(1);
				expect(onTokenUsage).toHaveBeenCalledWith({
					inputTokens: 100,
					outputTokens: 50,
					thinkingTokens: 0,
				});
			});

			it('should not call onTokenUsage when tokens are zero', async () => {
				const onTokenUsage = jest.fn();

				handler = new AgentIterationHandler({
					onTokenUsage,
				});

				const mockResponse = new AIMessage({
					content: 'Hello',
					response_metadata: {
						usage: { input_tokens: 0, output_tokens: 0 },
					},
				});

				const mockLlmWithTools = {
					invoke: jest.fn().mockResolvedValue(mockResponse),
				};

				const messages = [new HumanMessage('Test')];

				const generator = handler.invokeLlm({
					llmWithTools: mockLlmWithTools as never,
					messages,
					iteration: 1,
				});

				for await (const _chunk of generator) {
					// consume chunks
				}

				expect(onTokenUsage).not.toHaveBeenCalled();
			});

			it('should not call onTokenUsage when no usage metadata present', async () => {
				const onTokenUsage = jest.fn();

				handler = new AgentIterationHandler({
					onTokenUsage,
				});

				const mockResponse = new AIMessage({
					content: 'Hello',
					response_metadata: {},
				});

				const mockLlmWithTools = {
					invoke: jest.fn().mockResolvedValue(mockResponse),
				};

				const messages = [new HumanMessage('Test')];

				const generator = handler.invokeLlm({
					llmWithTools: mockLlmWithTools as never,
					messages,
					iteration: 1,
				});

				for await (const _chunk of generator) {
					// consume chunks
				}

				expect(onTokenUsage).not.toHaveBeenCalled();
			});

			it('should work without onTokenUsage callback', async () => {
				handler = new AgentIterationHandler({});

				const mockResponse = new AIMessage({
					content: 'Hello',
					response_metadata: {
						usage: { input_tokens: 100, output_tokens: 50 },
					},
				});

				const mockLlmWithTools = {
					invoke: jest.fn().mockResolvedValue(mockResponse),
				};

				const messages = [new HumanMessage('Test')];

				const generator = handler.invokeLlm({
					llmWithTools: mockLlmWithTools as never,
					messages,
					iteration: 1,
				});

				// Should not throw
				for await (const _chunk of generator) {
					// consume chunks
				}

				// The generator should complete without error
				expect(mockLlmWithTools.invoke).toHaveBeenCalled();
			});
		});

		describe('per-iteration callbacks override', () => {
			it('should use per-iteration callbacks when provided instead of constructor callbacks', async () => {
				const constructorCallbacks = [{ handleLLMStart: jest.fn() }];
				const iterationCallbacks = [{ handleLLMStart: jest.fn() }];

				handler = new AgentIterationHandler({
					callbacks: constructorCallbacks,
				});

				const mockResponse = new AIMessage({
					content: 'Hello',
					response_metadata: {},
				});

				const mockLlmWithTools = {
					invoke: jest.fn().mockResolvedValue(mockResponse),
				};

				const messages = [new HumanMessage('Test')];

				const generator = handler.invokeLlm({
					llmWithTools: mockLlmWithTools as never,
					messages,
					iteration: 1,
					callbacks: iterationCallbacks,
				});

				for await (const _chunk of generator) {
					// consume chunks
				}

				// Verify the LLM was invoked with the per-iteration callbacks, not the constructor ones
				expect(mockLlmWithTools.invoke).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({ callbacks: iterationCallbacks }),
				);
			});

			it('should fall back to constructor callbacks when per-iteration callbacks are not provided', async () => {
				const constructorCallbacks = [{ handleLLMStart: jest.fn() }];

				handler = new AgentIterationHandler({
					callbacks: constructorCallbacks,
				});

				const mockResponse = new AIMessage({
					content: 'Hello',
					response_metadata: {},
				});

				const mockLlmWithTools = {
					invoke: jest.fn().mockResolvedValue(mockResponse),
				};

				const messages = [new HumanMessage('Test')];

				const generator = handler.invokeLlm({
					llmWithTools: mockLlmWithTools as never,
					messages,
					iteration: 1,
				});

				for await (const _chunk of generator) {
					// consume chunks
				}

				// Verify the LLM was invoked with the constructor callbacks
				expect(mockLlmWithTools.invoke).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({ callbacks: constructorCallbacks }),
				);
			});
		});
	});

	describe('getCallbacks', () => {
		it('should return the configured callbacks', () => {
			const callbacks = [{ handleLLMStart: jest.fn() }];
			handler = new AgentIterationHandler({
				callbacks,
			});

			expect(handler.getCallbacks()).toBe(callbacks);
		});

		it('should return undefined when no callbacks configured', () => {
			handler = new AgentIterationHandler({});

			expect(handler.getCallbacks()).toBeUndefined();
		});
	});

	describe('getRunMetadata', () => {
		it('should return the configured run metadata', () => {
			const runMetadata = { sessionId: 'test-123' };
			handler = new AgentIterationHandler({
				runMetadata,
			});

			expect(handler.getRunMetadata()).toBe(runMetadata);
		});

		it('should return undefined when no run metadata configured', () => {
			handler = new AgentIterationHandler({});

			expect(handler.getRunMetadata()).toBeUndefined();
		});
	});
});
