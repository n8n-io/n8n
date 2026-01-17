/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/unbound-method */
import { ChatAnthropic } from '@langchain/anthropic';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';

import { LmChatAnthropic } from '../LmChatAnthropic.node';
import { N8nLlmTracing } from '../N8nLlmTracing';
import { makeN8nLlmFailedAttemptHandler } from '../n8nLlmFailedAttemptHandler';

jest.mock('@langchain/anthropic');
jest.mock('../N8nLlmTracing');
jest.mock('../n8nLlmFailedAttemptHandler');
jest.mock('@utils/httpProxyAgent', () => ({
	getProxyAgent: jest.fn().mockReturnValue({}),
}));

const MockedChatAnthropic = jest.mocked(ChatAnthropic);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);

describe('LmChatAnthropic - Prompt Caching', () => {
	let lmChatAnthropic: LmChatAnthropic;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'Anthropic Chat Model',
		typeVersion: 1.3,
		type: 'n8n-nodes-langchain.lmChatAnthropic',
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
		});
		mockContext.getNode = jest.fn().mockReturnValue(node);
		mockContext.getNodeParameter = jest.fn();

		MockedN8nLlmTracing.mockImplementation(() => ({}) as any);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());

		return mockContext;
	};

	beforeEach(() => {
		lmChatAnthropic = new LmChatAnthropic();
		jest.clearAllMocks();
	});

	describe('enablePromptCaching', () => {
		it('should add cache_control to system message with string content', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			let capturedMessages: BaseMessage[] = [];
			const mockInvoke = jest.fn().mockImplementation((messages: BaseMessage[]) => {
				capturedMessages = messages;
				return Promise.resolve({ content: 'test response' });
			});

			MockedChatAnthropic.mockImplementation(
				() =>
					({
						invoke: mockInvoke,
						_llmType: () => 'anthropic',
					}) as any,
			);

			const result = await lmChatAnthropic.supplyData.call(mockContext, 0);
			const model = result.response as any;

			const messages: BaseMessage[] = [
				new SystemMessage('You are a helpful assistant'),
				new HumanMessage('Hello'),
			];

			await model.invoke(messages);

			// Verify system message was converted to array format with cache_control
			expect(Array.isArray(capturedMessages[0].content)).toBe(true);
			const systemContent = capturedMessages[0].content as Array<{
				type: string;
				text: string;
				cache_control?: { type: string };
			}>;
			expect(systemContent[0].type).toBe('text');
			expect(systemContent[0].text).toBe('You are a helpful assistant');
			expect(systemContent[0].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should add cache_control to system message with array content', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			let capturedMessages: BaseMessage[] = [];
			const mockInvoke = jest.fn().mockImplementation((messages: BaseMessage[]) => {
				capturedMessages = messages;
				return Promise.resolve({ content: 'test response' });
			});

			MockedChatAnthropic.mockImplementation(
				() =>
					({
						invoke: mockInvoke,
						_llmType: () => 'anthropic',
					}) as any,
			);

			const result = await lmChatAnthropic.supplyData.call(mockContext, 0);
			const model = result.response as any;

			const systemMessage = new SystemMessage('');
			systemMessage.content = [
				{
					type: 'text',
					text: 'You are a helpful assistant',
				},
			];

			const messages: BaseMessage[] = [systemMessage, new HumanMessage('Hello')];

			await model.invoke(messages);

			// Verify cache_control was added to the last text block
			const systemContent = capturedMessages[0].content as Array<{
				type: string;
				text: string;
				cache_control?: { type: string };
			}>;
			expect(systemContent[0].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should not modify non-system messages', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			let capturedMessages: BaseMessage[] = [];
			const mockInvoke = jest.fn().mockImplementation((messages: BaseMessage[]) => {
				capturedMessages = messages;
				return Promise.resolve({ content: 'test response' });
			});

			MockedChatAnthropic.mockImplementation(
				() =>
					({
						invoke: mockInvoke,
						_llmType: () => 'anthropic',
					}) as any,
			);

			const result = await lmChatAnthropic.supplyData.call(mockContext, 0);
			const model = result.response as any;

			const messages: BaseMessage[] = [
				new HumanMessage('What is the weather?'),
				new AIMessage('The weather is sunny'),
			];

			await model.invoke(messages);

			// Verify non-system messages remain unchanged
			expect(typeof capturedMessages[0].content).toBe('string');
			expect(capturedMessages[0].content).toBe('What is the weather?');
			expect(typeof capturedMessages[1].content).toBe('string');
			expect(capturedMessages[1].content).toBe('The weather is sunny');
		});

		it('should handle multiple system messages', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			let capturedMessages: BaseMessage[] = [];
			const mockInvoke = jest.fn().mockImplementation((messages: BaseMessage[]) => {
				capturedMessages = messages;
				return Promise.resolve({ content: 'test response' });
			});

			MockedChatAnthropic.mockImplementation(
				() =>
					({
						invoke: mockInvoke,
						_llmType: () => 'anthropic',
					}) as any,
			);

			const result = await lmChatAnthropic.supplyData.call(mockContext, 0);
			const model = result.response as any;

			const messages: BaseMessage[] = [
				new SystemMessage('You are helpful'),
				new SystemMessage('You are concise'),
				new HumanMessage('Hello'),
			];

			await model.invoke(messages);

			// Both system messages should get cache_control
			expect(Array.isArray(capturedMessages[0].content)).toBe(true);
			expect(Array.isArray(capturedMessages[1].content)).toBe(true);

			const content0 = capturedMessages[0].content as Array<{ cache_control?: { type: string } }>;
			const content1 = capturedMessages[1].content as Array<{ cache_control?: { type: string } }>;

			expect(content0[0].cache_control).toEqual({ type: 'ephemeral' });
			expect(content1[0].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should handle messages without system message', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			let capturedMessages: BaseMessage[] = [];
			const mockInvoke = jest.fn().mockImplementation((messages: BaseMessage[]) => {
				capturedMessages = messages;
				return Promise.resolve({ content: 'test response' });
			});

			MockedChatAnthropic.mockImplementation(
				() =>
					({
						invoke: mockInvoke,
						_llmType: () => 'anthropic',
					}) as any,
			);

			const result = await lmChatAnthropic.supplyData.call(mockContext, 0);
			const model = result.response as any;

			const messages: BaseMessage[] = [
				new HumanMessage('Hello'),
				new AIMessage('Hi there!'),
			];

			await model.invoke(messages);

			// Messages should remain unchanged
			expect(typeof capturedMessages[0].content).toBe('string');
			expect(typeof capturedMessages[1].content).toBe('string');
		});

		it('should handle string input (not array of messages)', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			const mockInvoke = jest.fn().mockResolvedValue({ content: 'test response' });

			MockedChatAnthropic.mockImplementation(
				() =>
					({
						invoke: mockInvoke,
						_llmType: () => 'anthropic',
					}) as any,
			);

			const result = await lmChatAnthropic.supplyData.call(mockContext, 0);
			const model = result.response as any;

			// Invoke with string should work without error
			await model.invoke('Hello, how are you?');

			expect(mockInvoke).toHaveBeenCalledWith('Hello, how are you?', undefined);
		});

		it('should add cache_control to last text block in array content', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			let capturedMessages: BaseMessage[] = [];
			const mockInvoke = jest.fn().mockImplementation((messages: BaseMessage[]) => {
				capturedMessages = messages;
				return Promise.resolve({ content: 'test response' });
			});

			MockedChatAnthropic.mockImplementation(
				() =>
					({
						invoke: mockInvoke,
						_llmType: () => 'anthropic',
					}) as any,
			);

			const result = await lmChatAnthropic.supplyData.call(mockContext, 0);
			const model = result.response as any;

			const systemMessage = new SystemMessage('');
			systemMessage.content = [
				{
					type: 'text',
					text: 'Part 1',
				},
				{
					type: 'text',
					text: 'Part 2',
				},
			];

			const messages: BaseMessage[] = [systemMessage, new HumanMessage('Hello')];

			await model.invoke(messages);

			// Should add cache_control only to the last text block
			const systemContent = capturedMessages[0].content as Array<{
				type: string;
				text: string;
				cache_control?: { type: string };
			}>;

			expect(systemContent[0].cache_control).toBeUndefined();
			expect(systemContent[1].cache_control).toEqual({ type: 'ephemeral' });
		});

		it('should handle empty message array', async () => {
			const mockContext = setupMockContext();

			mockContext.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model.value') return 'claude-sonnet-4-20250514';
				if (paramName === 'options') return {};
				return undefined;
			});

			const mockInvoke = jest.fn().mockResolvedValue({ content: 'test response' });

			MockedChatAnthropic.mockImplementation(
				() =>
					({
						invoke: mockInvoke,
						_llmType: () => 'anthropic',
					}) as any,
			);

			const result = await lmChatAnthropic.supplyData.call(mockContext, 0);
			const model = result.response as any;

			// Should not throw error with empty array
			await model.invoke([]);

			expect(mockInvoke).toHaveBeenCalledWith([], undefined);
		});
	});
});
