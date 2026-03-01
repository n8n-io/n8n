import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { FakeListChatModel } from '@langchain/core/utils/testing';

import { conversationCompactChain } from '../conversation-compact';

// Mock structured output for testing
class MockStructuredLLM extends FakeListChatModel {
	private readonly structuredResponse: Record<string, unknown>;

	constructor(response: Record<string, unknown>) {
		super({ responses: ['mock'] });
		this.structuredResponse = response;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	withStructuredOutput(): any {
		return {
			invoke: async () => this.structuredResponse,
		};
	}
}

describe('conversationCompactChain', () => {
	let fakeLLM: BaseChatModel;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Basic functionality', () => {
		it('should summarize a conversation without previous summary', async () => {
			fakeLLM = new MockStructuredLLM({
				summary: 'Test summary of the conversation',
				key_decisions: ['Decision 1', 'Decision 2'],
				current_state: 'Current workflow state',
				next_steps: 'Suggested next steps',
			});

			const messages: BaseMessage[] = [
				new HumanMessage('Create a workflow'),
				new AIMessage('I will help you create a workflow'),
				new HumanMessage('Add an HTTP node'),
				new AIMessage('Added HTTP node'),
			];

			const result = await conversationCompactChain(fakeLLM, messages);

			expect(result.success).toBe(true);
			expect(result.summary).toEqual({
				summary: 'Test summary of the conversation',
				key_decisions: ['Decision 1', 'Decision 2'],
				current_state: 'Current workflow state',
				next_steps: 'Suggested next steps',
			});

			expect(result.summaryPlain).toContain('## Previous Conversation Summary');
			expect(result.summaryPlain).toContain('**Summary:** Test summary of the conversation');
			expect(result.summaryPlain).toContain('- Decision 1');
			expect(result.summaryPlain).toContain('- Decision 2');
			expect(result.summaryPlain).toContain('**Current State:** Current workflow state');
			expect(result.summaryPlain).toContain('**Next Steps:** Suggested next steps');
		});

		it('should include previous summary when provided', async () => {
			fakeLLM = new MockStructuredLLM({
				summary: 'Continued conversation summary',
				key_decisions: ['Previous decision', 'New decision'],
				current_state: 'Updated workflow state',
				next_steps: 'Continue with next steps',
			});

			const previousSummary = 'This is a previous summary of earlier conversation';
			const messages: BaseMessage[] = [
				new HumanMessage('Continue with the workflow'),
				new AIMessage('Continuing from where we left off'),
			];

			const result = await conversationCompactChain(fakeLLM, messages, previousSummary);

			expect(result.success).toBe(true);
			expect(result.summary.summary).toBe('Continued conversation summary');
		});
	});

	describe('Message formatting', () => {
		beforeEach(() => {
			fakeLLM = new MockStructuredLLM({
				summary: 'Message formatting test',
				key_decisions: [],
				current_state: 'Test state',
				next_steps: 'Test steps',
			});
		});

		it('should format HumanMessages correctly', async () => {
			const messages: BaseMessage[] = [
				new HumanMessage('User message 1'),
				new HumanMessage('User message 2'),
			];

			const result = await conversationCompactChain(fakeLLM, messages);
			expect(result.success).toBe(true);
		});

		it('should format AIMessages with string content correctly', async () => {
			const messages: BaseMessage[] = [
				new AIMessage('Assistant response 1'),
				new AIMessage('Assistant response 2'),
			];

			const result = await conversationCompactChain(fakeLLM, messages);
			expect(result.success).toBe(true);
		});

		it('should handle AIMessages with non-string content', async () => {
			const messages: BaseMessage[] = [
				new AIMessage({ content: 'structured', additional_kwargs: {} }),
				new AIMessage('Plain message'),
			];

			// The function should handle both object and string content
			const result = await conversationCompactChain(fakeLLM, messages);
			expect(result.success).toBe(true);
		});

		it('should filter out ToolMessages and other message types', async () => {
			const messages: BaseMessage[] = [
				new HumanMessage('User message'),
				new ToolMessage({ content: 'Tool output', tool_call_id: 'tool-1' }),
				new AIMessage('Assistant message'),
			];

			// ToolMessages should be filtered out during processing
			const result = await conversationCompactChain(fakeLLM, messages);
			expect(result.success).toBe(true);
		});

		it('should handle empty messages array', async () => {
			const messages: BaseMessage[] = [];

			const result = await conversationCompactChain(fakeLLM, messages);
			expect(result.success).toBe(true);
		});

		it('should handle messages with empty content', async () => {
			const messages: BaseMessage[] = [
				new HumanMessage(''),
				new AIMessage(''),
				new HumanMessage('Valid message'),
			];

			const result = await conversationCompactChain(fakeLLM, messages);
			expect(result.success).toBe(true);
		});
	});

	describe('Structured output', () => {
		it('should format the structured output correctly', async () => {
			fakeLLM = new MockStructuredLLM({
				summary: 'Workflow creation initiated',
				key_decisions: ['Use HTTP node', 'Add authentication', 'Set up error handling'],
				current_state: 'Workflow has HTTP node configured',
				next_steps: 'Add data transformation node',
			});

			const messages: BaseMessage[] = [new HumanMessage('Create workflow')];

			const result = await conversationCompactChain(fakeLLM, messages);

			expect(result.summaryPlain).toBe(
				`## Previous Conversation Summary

**Summary:** Workflow creation initiated

**Key Decisions:**
- Use HTTP node
- Add authentication
- Set up error handling

**Current State:** Workflow has HTTP node configured

**Next Steps:** Add data transformation node`,
			);
		});

		it('should handle empty key_decisions array', async () => {
			fakeLLM = new MockStructuredLLM({
				summary: 'Test summary',
				key_decisions: [],
				current_state: 'Test state',
				next_steps: 'Test steps',
			});

			const messages: BaseMessage[] = [new HumanMessage('Test')];

			const result = await conversationCompactChain(fakeLLM, messages);

			expect(result.summaryPlain).toContain('**Key Decisions:**\n');
			expect(result.summary.key_decisions).toEqual([]);
		});
	});

	describe('Error handling', () => {
		it('should propagate LLM errors', async () => {
			class ErrorLLM extends FakeListChatModel {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				withStructuredOutput(): any {
					return {
						invoke: async () => {
							throw new Error('LLM invocation failed');
						},
					};
				}
			}

			const errorLLM = new ErrorLLM({ responses: [] });
			const messages: BaseMessage[] = [new HumanMessage('Test message')];

			await expect(conversationCompactChain(errorLLM, messages)).rejects.toThrow(
				'LLM invocation failed',
			);
		});
	});
});
