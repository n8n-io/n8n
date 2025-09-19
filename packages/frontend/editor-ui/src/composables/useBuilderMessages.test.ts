import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBuilderMessages } from '@/composables/useBuilderMessages';
import type { ChatUI } from '@n8n/design-system/types/assistant';
import type { ChatRequest } from '@/types/assistant.types';

// Mock useI18n to return the keys instead of translations
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

describe('useBuilderMessages', () => {
	let builderMessages: ReturnType<typeof useBuilderMessages>;

	beforeEach(() => {
		builderMessages = useBuilderMessages();
	});

	describe('processAssistantMessages', () => {
		it('should process text messages correctly', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'assistant',
					text: 'Hello, how can I help?',
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]).toMatchObject({
				id: 'test-id-0',
				role: 'assistant',
				type: 'text',
				content: 'Hello, how can I help?',
				read: false,
			});
			expect(result.shouldClearThinking).toBe(true);
		});

		it('should process tool messages with input data', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'running',
					updates: [
						{
							type: 'input',
							data: { nodes: [{ name: 'HTTP Request' }] },
						},
					],
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(1);
			const toolMessage = result.messages[0] as ChatUI.ToolMessage;
			expect(toolMessage).toMatchObject({
				id: 'call-123', // Should use toolCallId as ID
				role: 'assistant',
				type: 'tool',
				toolName: 'add_nodes',
				toolCallId: 'call-123',
				status: 'running',
				read: false,
			});
			expect(toolMessage.updates).toHaveLength(1);
			expect(toolMessage.updates[0]).toMatchObject({
				type: 'input',
				data: { nodes: [{ name: 'HTTP Request' }] },
			});
		});

		it('should merge tool message updates when receiving output', () => {
			// Start with a tool message that has input
			const currentMessages: ChatUI.AssistantMessage[] = [
				{
					id: 'call-123',
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'running',
					updates: [
						{
							type: 'input',
							data: { nodes: [{ name: 'HTTP Request' }] },
						},
					],
					read: false,
				} as ChatUI.AssistantMessage,
			];

			// Receive the output update
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'completed',
					updates: [
						{
							type: 'output',
							data: { success: true, nodeId: 'node-1' },
						},
					],
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(1);
			const toolMessage = result.messages[0] as ChatUI.ToolMessage;
			expect(toolMessage.status).toBe('completed');
			expect(toolMessage.updates).toHaveLength(2);
			expect(toolMessage.updates[0]).toMatchObject({
				type: 'input',
				data: { nodes: [{ name: 'HTTP Request' }] },
			});
			expect(toolMessage.updates[1]).toMatchObject({
				type: 'output',
				data: { success: true, nodeId: 'node-1' },
			});
		});

		it('should handle tool messages without toolCallId', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'some_tool',
					status: 'completed',
					updates: [],
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]).toMatchObject({
				id: 'test-id-0', // Should fall back to generated ID
				type: 'tool',
				toolName: 'some_tool',
			});
		});

		it('should not merge updates for different tool calls', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [
				{
					id: 'call-123',
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'completed',
					updates: [{ type: 'input', data: { test: 1 } }],
					read: false,
				} as ChatUI.AssistantMessage,
			];

			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-456', // Different ID
					status: 'running',
					updates: [{ type: 'input', data: { test: 2 } }],
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(2);
			expect((result.messages[0] as ChatUI.ToolMessage).toolCallId).toBe('call-123');
			expect((result.messages[1] as ChatUI.ToolMessage).toolCallId).toBe('call-456');
		});

		it('should handle workflow updated messages', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{"nodes": [], "connections": {}}',
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]).toMatchObject({
				id: 'test-id-0',
				type: 'workflow-updated',
				codeSnippet: '{"nodes": [], "connections": {}}',
				read: false,
			});
		});

		it('should handle mixed message types in a single batch', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'assistant',
					text: 'Creating workflow...',
				},
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'running',
					updates: [{ type: 'input', data: { nodes: [] } }],
				},
				{
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{}',
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'batch-id',
			);

			expect(result.messages).toHaveLength(3);
			expect(result.messages[0].type).toBe('text');
			expect(result.messages[0].id).toBe('batch-id-0');
			expect(result.messages[1].type).toBe('tool');
			expect(result.messages[1].id).toBe('call-123'); // Uses toolCallId
			expect(result.messages[2].type).toBe('workflow-updated');
			expect(result.messages[2].id).toBe('batch-id-2');
		});

		it('should show thinking message when tools are in progress', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'running',
					updates: [{ type: 'input', data: { nodes: [] } }],
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(1);
			expect(result.thinkingMessage).toBe(undefined);
			expect(result.shouldClearThinking).toBe(false);
		});

		it('should show thinking message when tools are completed but no text response yet', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'completed',
					updates: [
						{ type: 'input', data: { nodes: [] } },
						{ type: 'output', data: { success: true } },
					],
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(1);
			expect(result.thinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');
			expect(result.shouldClearThinking).toBe(false);
		});

		it('should not show thinking message when there is a text response after tools', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [
				{
					id: 'call-123',
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'completed',
					updates: [],
					read: false,
				} as ChatUI.AssistantMessage,
			];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'assistant',
					text: 'I have added the nodes for you.',
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(2);
			expect(result.thinkingMessage).toBeUndefined();
			expect(result.shouldClearThinking).toBe(true);
		});

		it('should show correct thinking message for sequential tools', () => {
			// First tool completes
			const currentMessages: ChatUI.AssistantMessage[] = [
				{
					id: 'call-123',
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'completed',
					updates: [
						{ type: 'input', data: { nodes: [] } },
						{ type: 'output', data: { success: true } },
					],
					read: false,
				} as ChatUI.AssistantMessage,
			];

			// Second tool starts running
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'connect_nodes',
					toolCallId: 'call-456',
					status: 'running',
					updates: [{ type: 'input', data: { from: 'node1', to: 'node2' } }],
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(2);
			// Should not show thinking message as new tool is running
			expect(result.thinkingMessage).toBe(undefined);
		});

		it('should show thinking message when second tool completes', () => {
			// Both tools completed
			const currentMessages: ChatUI.AssistantMessage[] = [
				{
					id: 'call-123',
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'completed',
					updates: [],
					read: false,
				} as ChatUI.AssistantMessage,
			];

			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'connect_nodes',
					toolCallId: 'call-456',
					status: 'completed',
					updates: [],
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(2);
			expect(result.thinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');
		});

		it('should keep showing running tools message when parallel tools complete one by one', () => {
			// Two tools running
			const currentMessages: ChatUI.AssistantMessage[] = [
				{
					id: 'call-123',
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'running',
					updates: [],
					read: false,
				} as ChatUI.AssistantMessage,
				{
					id: 'call-456',
					role: 'assistant',
					type: 'tool',
					toolName: 'connect_nodes',
					toolCallId: 'call-456',
					status: 'running',
					updates: [],
					read: false,
				} as ChatUI.AssistantMessage,
			];

			// First tool completes
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'completed',
					updates: [{ type: 'output', data: { success: true } }],
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(2);
			// Should not show thinking because call-456 is still running
			expect(result.thinkingMessage).toBe(undefined);

			// Verify first tool is now completed
			const firstTool = result.messages.find(
				(m) => (m as ChatUI.ToolMessage).toolCallId === 'call-123',
			) as ChatUI.ToolMessage;
			expect(firstTool.status).toBe('completed');

			// Verify second tool is still running
			const secondTool = result.messages.find(
				(m) => (m as ChatUI.ToolMessage).toolCallId === 'call-456',
			) as ChatUI.ToolMessage;
			expect(secondTool.status).toBe('running');
		});

		it('should show thinking message when all parallel tools complete', () => {
			// One tool already completed, one still running
			const currentMessages: ChatUI.AssistantMessage[] = [
				{
					id: 'call-123',
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'completed',
					updates: [],
					read: false,
				} as ChatUI.AssistantMessage,
				{
					id: 'call-456',
					role: 'assistant',
					type: 'tool',
					toolName: 'connect_nodes',
					toolCallId: 'call-456',
					status: 'running',
					updates: [],
					read: false,
				} as ChatUI.AssistantMessage,
			];

			// Second tool completes
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'connect_nodes',
					toolCallId: 'call-456',
					status: 'completed',
					updates: [{ type: 'output', data: { success: true } }],
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(2);
			// Should now show thinking because all tools are completed but no text response yet
			expect(result.thinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');
		});

		it('should keep thinking message when workflow-updated arrives after tools complete', () => {
			// Tool completed
			const currentMessages: ChatUI.AssistantMessage[] = [
				{
					id: 'call-123',
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'completed',
					updates: [],
					read: false,
				} as ChatUI.AssistantMessage,
			];

			// Workflow update arrives
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{"nodes": [], "connections": {}}',
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(2);
			// Should still show thinking because workflow-updated is not a text response
			expect(result.thinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');
			// Should NOT clear thinking for workflow updates
			expect(result.shouldClearThinking).toBe(false);
		});

		it('should clear thinking message only when text arrives after workflow-updated', () => {
			// Tool completed and workflow updated
			const currentMessages: ChatUI.AssistantMessage[] = [
				{
					id: 'call-123',
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'completed',
					updates: [],
					read: false,
				} as ChatUI.AssistantMessage,
				{
					id: 'workflow-1',
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{"nodes": [], "connections": {}}',
					read: false,
				} as ChatUI.AssistantMessage,
			];

			// Text message arrives
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'assistant',
					text: 'I have created the workflow for you.',
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(3);
			// Should clear thinking message when text arrives
			expect(result.thinkingMessage).toBeUndefined();
			expect(result.shouldClearThinking).toBe(true);
		});

		it('should only apply rating to the last text message after workflow-updated', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'assistant',
					text: 'I will create a workflow for you.',
				},
				{
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{"nodes": [], "connections": {}}',
				},
				{
					type: 'message',
					role: 'assistant',
					text: 'I have started creating the workflow.',
				},
				{
					type: 'message',
					role: 'assistant',
					text: 'The workflow has been created successfully!',
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(4);

			// First text message should NOT have showRating (comes before workflow-updated)
			const firstText = result.messages[0];
			expect(firstText.showRating).toBeUndefined();

			// Workflow-updated message should not have rating
			expect(result.messages[1].type).toBe('workflow-updated');

			// Middle text message should NOT have rating
			const middleText = result.messages[2];
			expect(middleText.showRating).toBeUndefined();

			// Only the LAST text message should have showRating with regular style
			const lastText = result.messages[3];
			expect(lastText.showRating).toBe(true);
			expect(lastText.ratingStyle).toBe('regular');
		});

		it('should not apply rating to text messages without workflow-updated', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'assistant',
					text: 'Hello, how can I help?',
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(1);
			const textMessage = result.messages[0];
			expect(textMessage.showRating).toBeUndefined();
			expect(textMessage.ratingStyle).toBeUndefined();
		});

		it('should not apply rating when tools are still running', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'assistant',
					text: 'Starting the process...',
				},
				{
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{}',
				},
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-1',
					status: 'running',
					updates: [],
				},
				{
					type: 'message',
					role: 'assistant',
					text: 'Still working on it...',
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			// No messages should have rating while tools are running
			const firstMessage = result.messages[0];
			expect(firstMessage.showRating).toBeUndefined();

			const lastMessage = result.messages[3];
			expect(lastMessage.showRating).toBeUndefined();
		});

		it('should apply rating to the last text message after all tools complete', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [
				{
					id: 'msg-1',
					type: 'text',
					role: 'assistant',
					content: 'Starting the process...',
					read: false,
				},
				{
					id: 'workflow-1',
					type: 'workflow-updated',
					role: 'assistant',
					codeSnippet: '{}',
					read: false,
				},
				{
					id: 'tool-1',
					type: 'tool',
					role: 'assistant',
					toolName: 'add_nodes',
					toolCallId: 'call-1',
					status: 'completed',
					updates: [],
					read: false,
				} as ChatUI.AssistantMessage,
				{
					id: 'msg-2',
					type: 'text',
					role: 'assistant',
					content: 'All done!',
					read: false,
				},
			];

			const newMessages: ChatRequest.MessageResponse[] = [];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			// Only the last text message should have rating
			const firstMessage = result.messages[0];
			expect(firstMessage.showRating).toBeUndefined();

			const lastMessage = result.messages[3];
			expect(lastMessage.showRating).toBe(true);
			expect(lastMessage.ratingStyle).toBe('regular');
		});
	});

	describe('mapAssistantMessageToUI', () => {
		it('should map tool messages correctly for session loading', () => {
			const message: ChatRequest.MessageResponse = {
				role: 'assistant',
				type: 'tool',
				toolName: 'connect_nodes',
				toolCallId: 'call-789',
				status: 'completed',
				updates: [
					{ type: 'input', data: { from: 'node1', to: 'node2' } },
					{ type: 'output', data: { success: true } },
				],
			};

			const result = builderMessages.mapAssistantMessageToUI(message, 'session-msg-1');

			expect(result).toMatchObject({
				id: 'session-msg-1',
				role: 'assistant',
				type: 'tool',
				toolName: 'connect_nodes',
				toolCallId: 'call-789',
				status: 'completed',
				read: false,
			});
			expect((result as ChatUI.ToolMessage).updates).toHaveLength(2);
		});

		it('should handle tool messages without updates array', () => {
			// @ts-expect-error: toolCallId is required, but not present in this test
			const message: ChatRequest.MessageResponse = {
				role: 'assistant',
				type: 'tool',
				toolName: 'some_tool',
				toolCallId: 'call-999',
				status: 'running',
			};

			const result = builderMessages.mapAssistantMessageToUI(message, 'test-id');

			expect((result as ChatUI.ToolMessage).updates).toEqual([]);
		});

		it('should map text messages correctly', () => {
			const message: ChatRequest.MessageResponse = {
				type: 'message',
				role: 'assistant',
				text: 'Workflow created successfully!',
			};

			const result = builderMessages.mapAssistantMessageToUI(message, 'msg-id');

			expect(result).toMatchObject({
				id: 'msg-id',
				role: 'assistant',
				type: 'text',
				content: 'Workflow created successfully!',
				read: false,
			});
		});
	});

	describe('createUserMessage', () => {
		it('should create a user message with correct properties', () => {
			const message = builderMessages.createUserMessage('Help me build a workflow', 'user-msg-1');

			expect(message).toMatchObject({
				id: 'user-msg-1',
				role: 'user',
				type: 'text',
				content: 'Help me build a workflow',
				read: true,
			});
		});
	});

	describe('createErrorMessage', () => {
		it('should create an error message without retry', () => {
			const message = builderMessages.createErrorMessage('Something went wrong', 'error-1');

			expect(message).toMatchObject({
				id: 'error-1',
				role: 'assistant',
				type: 'error',
				content: 'Something went wrong',
				read: false,
			});
			expect((message as ChatUI.ErrorMessage).retry).toBeUndefined();
		});

		it('should create an error message with retry function', () => {
			const retryFn = async () => {};
			const message = builderMessages.createErrorMessage('Network error', 'error-2', retryFn);

			expect(message).toMatchObject({
				id: 'error-2',
				role: 'assistant',
				type: 'error',
				content: 'Network error',
				read: false,
			});
			expect((message as ChatUI.ErrorMessage).retry).toBe(retryFn);
		});

		it('should handle empty error message', () => {
			const message = builderMessages.createErrorMessage('', 'error-empty');

			expect(message).toMatchObject({
				id: 'error-empty',
				role: 'assistant',
				type: 'error',
				content: '',
				read: false,
			});
		});

		it('should handle very long error messages', () => {
			const longMessage = 'Error: '.repeat(100);
			const message = builderMessages.createErrorMessage(longMessage, 'error-long');

			expect((message as ChatUI.ErrorMessage).content).toBe(longMessage);
			expect(message.id).toBe('error-long');
		});
	});

	describe('edge cases and malformed data', () => {
		it('should handle empty message arrays', () => {
			const result = builderMessages.processAssistantMessages([], [], 'test-id');

			expect(result.messages).toHaveLength(0);
			expect(result.shouldClearThinking).toBe(false);
			expect(result.thinkingMessage).toBeUndefined();
		});

		it('should handle messages with missing required fields', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'test_tool',
					status: 'completed',
					updates: [],
				} as ChatRequest.MessageResponse,
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0].id).toBe('test-id-0');
		});

		it('should handle workflow-updated messages with invalid JSON', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: 'invalid json {',
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]).toMatchObject({
				type: 'workflow-updated',
				codeSnippet: 'invalid json {',
			});
		});

		it('should handle tool messages with corrupted update data', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'completed',
					updates: [
						{
							type: 'output',
							// @ts-expect-error testing invalid data
							data: null,
						},
						{
							type: 'input',
							// @ts-expect-error testing invalid data
							data: undefined,
						},
					],
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(1);
			const toolMessage = result.messages[0] as ChatUI.ToolMessage;
			expect(toolMessage.updates).toHaveLength(2);
			expect(toolMessage.updates[0].data).toBeNull();
			expect(toolMessage.updates[1].data).toBeUndefined();
		});

		it('should handle duplicate message IDs gracefully', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [
				{
					id: 'call-123',
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'running',
					updates: [],
					read: false,
				} as ChatUI.AssistantMessage,
			];

			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-123',
					status: 'completed',
					updates: [{ type: 'output', data: { success: true } }],
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(1);
			const toolMessage = result.messages[0] as ChatUI.ToolMessage;
			expect(toolMessage.status).toBe('completed');
			expect(toolMessage.updates).toHaveLength(1);
		});

		it('should handle messages with missing text content', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'assistant',
					// @ts-expect-error testing invalid data
					text: undefined,
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]).toMatchObject({
				type: 'text',
				content: undefined,
			});
		});

		it('should handle extremely large message batches', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = Array.from({ length: 1000 }, (_, i) => ({
				type: 'message',
				role: 'assistant',
				text: `Message ${i}`,
			}));

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(1000);
			expect((result.messages as ChatUI.TextMessage[])[0].content).toBe('Message 0');
			expect((result.messages as ChatUI.TextMessage[])[999].content).toBe('Message 999');
		});
	});

	describe('complex workflow scenarios', () => {
		it('should handle multiple interleaved tool calls with workflow updates', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-1',
					status: 'running',
					updates: [{ type: 'input', data: { nodes: ['HTTP Request'] } }],
				},
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'connect_nodes',
					toolCallId: 'call-2',
					status: 'running',
					updates: [{ type: 'input', data: { from: 'node1', to: 'node2' } }],
				},
				{
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{"nodes": [{"name": "HTTP Request"}], "connections": {}}',
				},
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-1',
					status: 'completed',
					updates: [{ type: 'output', data: { success: true, nodeId: 'node1' } }],
				},
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'connect_nodes',
					toolCallId: 'call-2',
					status: 'completed',
					updates: [{ type: 'output', data: { success: true, connectionId: 'conn1' } }],
				},
				{
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{"nodes": [{"name": "HTTP Request"}], "connections": {"conn1": {}}}',
				},
				{
					type: 'message',
					role: 'assistant',
					text: 'I have successfully created and connected the nodes in your workflow.',
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(5);

			// Check tool message updates are merged correctly
			const tool1 = result.messages.find(
				(m) => (m as ChatUI.ToolMessage).toolCallId === 'call-1',
			) as ChatUI.ToolMessage;
			expect(tool1.updates).toHaveLength(2);
			expect(tool1.status).toBe('completed');

			const tool2 = result.messages.find(
				(m) => (m as ChatUI.ToolMessage).toolCallId === 'call-2',
			) as ChatUI.ToolMessage;
			expect(tool2.updates).toHaveLength(2);
			expect(tool2.status).toBe('completed');

			// Check workflow updates are present
			const workflowUpdates = result.messages.filter((m) => m.type === 'workflow-updated');
			expect(workflowUpdates).toHaveLength(2);

			// Check final text message has rating
			const textMessage = result.messages.find((m) => m.type === 'text');
			expect(textMessage?.showRating).toBe(true);
			expect(textMessage?.ratingStyle).toBe('regular');

			// Should clear thinking since tools are complete and text is present
			expect(result.shouldClearThinking).toBe(true);
			expect(result.thinkingMessage).toBeUndefined();
		});

		it('should handle failed tool calls and recovery', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-1',
					status: 'running',
					updates: [{ type: 'input', data: { nodes: ['Invalid Node'] } }],
				},
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-1',
					status: 'error',
					updates: [{ type: 'output', data: { error: 'Node type not found' } }],
				},
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-2',
					status: 'running',
					updates: [{ type: 'input', data: { nodes: ['HTTP Request'] } }],
				},
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-2',
					status: 'completed',
					updates: [{ type: 'output', data: { success: true, nodeId: 'node1' } }],
				},
				{
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{"nodes": [{"name": "HTTP Request"}], "connections": {}}',
				},
				{
					type: 'message',
					role: 'assistant',
					text: 'I encountered an error with the first node type, but successfully added an HTTP Request node instead.',
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
			);

			expect(result.messages).toHaveLength(4);

			// Check failed tool
			const failedTool = result.messages.find(
				(m) => (m as ChatUI.ToolMessage).toolCallId === 'call-1',
			) as ChatUI.ToolMessage;
			expect(failedTool.status).toBe('error');
			expect(failedTool.updates).toHaveLength(2);

			// Check successful tool
			const successTool = result.messages.find(
				(m) => (m as ChatUI.ToolMessage).toolCallId === 'call-2',
			) as ChatUI.ToolMessage;
			expect(successTool.status).toBe('completed');
			expect(successTool.updates).toHaveLength(2);

			// Check workflow update and text message
			const workflowUpdate = result.messages.find((m) => m.type === 'workflow-updated');
			expect(workflowUpdate).toBeTruthy();

			const textMessage = result.messages.find((m) => m.type === 'text');
			expect(textMessage?.showRating).toBe(true);
			expect(textMessage?.content).toContain('error');
		});

		it('should handle rapid tool status changes', () => {
			let currentMessages: ChatUI.AssistantMessage[] = [];

			// First batch: tool starts
			const batch1: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-1',
					status: 'running',
					updates: [{ type: 'input', data: { nodes: ['HTTP Request'] } }],
				},
			];

			let result = builderMessages.processAssistantMessages(currentMessages, batch1, 'batch-1');
			expect(result.thinkingMessage).toBe(undefined);
			currentMessages = result.messages;

			// Second batch: tool completes
			const batch2: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-1',
					status: 'completed',
					updates: [{ type: 'output', data: { success: true } }],
				},
			];

			result = builderMessages.processAssistantMessages(currentMessages, batch2, 'batch-2');
			expect(result.thinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');
			currentMessages = result.messages;

			// Third batch: workflow updated
			const batch3: ChatRequest.MessageResponse[] = [
				{
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{"nodes": [{"name": "HTTP Request"}], "connections": {}}',
				},
			];

			result = builderMessages.processAssistantMessages(currentMessages, batch3, 'batch-3');
			expect(result.thinkingMessage).toBe('aiAssistant.thinkingSteps.thinking');
			currentMessages = result.messages;

			// Fourth batch: final text response
			const batch4: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'assistant',
					text: 'Done!',
				},
			];

			result = builderMessages.processAssistantMessages(currentMessages, batch4, 'batch-4');
			expect(result.shouldClearThinking).toBe(true);
			expect(result.thinkingMessage).toBeUndefined();

			// Final state should have all messages
			expect(result.messages).toHaveLength(3);
			expect(result.messages.find((m) => m.type === 'tool')).toBeTruthy();
			expect(result.messages.find((m) => m.type === 'workflow-updated')).toBeTruthy();
			expect(result.messages.find((m) => m.type === 'text')).toBeTruthy();
		});
	});

	describe('clearRatingLogic', () => {
		it('should remove showRating and ratingStyle properties from text messages', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: 'msg-1',
					role: 'assistant',
					type: 'text',
					content: 'Hello there!',
					showRating: true,
					ratingStyle: 'regular',
					read: false,
				},
				{
					id: 'msg-2',
					role: 'assistant',
					type: 'text',
					content: 'How can I help?',
					showRating: false,
					ratingStyle: 'minimal',
					read: false,
				},
			];

			const result = builderMessages.clearRatingLogic(messages);

			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({
				id: 'msg-1',
				role: 'assistant',
				type: 'text',
				content: 'Hello there!',
				read: false,
			});
			expect(result[0]).not.toHaveProperty('showRating');
			expect(result[0]).not.toHaveProperty('ratingStyle');

			expect(result[1]).toMatchObject({
				id: 'msg-2',
				role: 'assistant',
				type: 'text',
				content: 'How can I help?',
				read: false,
			});
			expect(result[1]).not.toHaveProperty('showRating');
			expect(result[1]).not.toHaveProperty('ratingStyle');
		});

		it('should leave non-text messages unchanged', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: 'tool-1',
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-1',
					status: 'completed',
					updates: [],
					read: false,
				},
				{
					id: 'workflow-1',
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{}',
					read: false,
				},
			];

			const result = builderMessages.clearRatingLogic(messages);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual(messages[0]);
			expect(result[1]).toEqual(messages[1]);
		});

		it('should handle text messages without rating properties', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: 'msg-1',
					role: 'assistant',
					type: 'text',
					content: 'No rating here',
					read: false,
				},
			];

			const result = builderMessages.clearRatingLogic(messages);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(messages[0]);
		});

		it('should handle empty message array', () => {
			const result = builderMessages.clearRatingLogic([]);
			expect(result).toHaveLength(0);
		});

		it('should handle mixed message types with some having rating properties', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: 'msg-1',
					role: 'assistant',
					type: 'text',
					content: 'With rating',
					showRating: true,
					ratingStyle: 'regular',
					read: false,
				},
				{
					id: 'tool-1',
					role: 'assistant',
					type: 'tool',
					toolName: 'test_tool',
					toolCallId: 'call-1',
					status: 'completed',
					updates: [],
					read: false,
				},
				{
					id: 'msg-2',
					role: 'assistant',
					type: 'text',
					content: 'Without rating',
					read: false,
				},
			];

			const result = builderMessages.clearRatingLogic(messages);

			expect(result).toHaveLength(3);
			expect(result[0]).not.toHaveProperty('showRating');
			expect(result[0]).not.toHaveProperty('ratingStyle');
			expect(result[1]).toEqual(messages[1]); // tool message unchanged
			expect(result[2]).toEqual(messages[2]); // text without rating unchanged
		});
	});

	describe('error message handling with retry', () => {
		it('should pass retry function to error messages from processAssistantMessages', () => {
			const retryFn = vi.fn(async () => {});
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'error',
					role: 'assistant',
					content: 'Something went wrong',
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
				retryFn,
			);

			expect(result.messages).toHaveLength(1);
			const errorMessage = result.messages[0] as ChatUI.ErrorMessage;
			expect(errorMessage).toMatchObject({
				id: 'test-id-0',
				role: 'assistant',
				type: 'error',
				content: 'Something went wrong',
				read: false,
			});
			expect(errorMessage.retry).toBe(retryFn);
		});

		it('should not pass retry function to non-error messages', () => {
			const retryFn = vi.fn(async () => {});
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'assistant',
					text: 'This is a normal text message',
				},
				{
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-1',
					status: 'running',
					updates: [],
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
				retryFn,
			);

			expect(result.messages).toHaveLength(2);

			const textMessage = result.messages[0] as ChatUI.TextMessage;
			expect(textMessage.type).toBe('text');
			expect('retry' in textMessage).toBe(false);

			const toolMessage = result.messages[1] as ChatUI.ToolMessage;
			expect(toolMessage.type).toBe('tool');
			expect('retry' in toolMessage).toBe(false);
		});

		it('should clear retry from previous error messages when processing new messages', () => {
			const oldRetryFn = vi.fn(async () => {});
			const newRetryFn = vi.fn(async () => {});

			const currentMessages: ChatUI.AssistantMessage[] = [
				{
					id: 'error-1',
					role: 'assistant',
					type: 'error',
					content: 'First error',
					retry: oldRetryFn,
					read: false,
				} as ChatUI.ErrorMessage,
				{
					id: 'error-2',
					role: 'assistant',
					type: 'error',
					content: 'Second error',
					retry: oldRetryFn,
					read: false,
				} as ChatUI.ErrorMessage,
			];

			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'error',
					role: 'assistant',
					content: 'New error',
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
				newRetryFn,
			);

			expect(result.messages).toHaveLength(3);

			// First error should have retry removed
			const firstError = result.messages[0] as ChatUI.ErrorMessage;
			expect(firstError.content).toBe('First error');
			expect('retry' in firstError).toBe(false);

			// Second error should have retry removed
			const secondError = result.messages[1] as ChatUI.ErrorMessage;
			expect(secondError.content).toBe('Second error');
			expect('retry' in secondError).toBe(false);

			// New error should have the new retry function
			const newError = result.messages[2] as ChatUI.ErrorMessage;
			expect(newError.content).toBe('New error');
			expect(newError.retry).toBe(newRetryFn);
		});

		it('should only keep retry on the last error message when multiple errors exist', () => {
			const retryFn = vi.fn(async () => {});
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'error',
					role: 'assistant',
					content: 'First error in batch',
				},
				{
					type: 'error',
					role: 'assistant',
					content: 'Second error in batch',
				},
				{
					type: 'error',
					role: 'assistant',
					content: 'Third error in batch',
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
				retryFn,
			);

			expect(result.messages).toHaveLength(3);

			// First error should not have retry
			const firstError = result.messages[0] as ChatUI.ErrorMessage;
			expect(firstError.content).toBe('First error in batch');
			expect('retry' in firstError).toBe(false);

			// Second error should not have retry
			const secondError = result.messages[1] as ChatUI.ErrorMessage;
			expect(secondError.content).toBe('Second error in batch');
			expect('retry' in secondError).toBe(false);

			// Only the last error should have retry
			const lastError = result.messages[2] as ChatUI.ErrorMessage;
			expect(lastError.content).toBe('Third error in batch');
			expect(lastError.retry).toBe(retryFn);
		});

		it('should handle mixed message types and only affect error messages with retry logic', () => {
			const retryFn = vi.fn(async () => {});
			const currentMessages: ChatUI.AssistantMessage[] = [
				{
					id: 'msg-1',
					role: 'assistant',
					type: 'text',
					content: 'Normal message',
					read: false,
				},
				{
					id: 'error-1',
					role: 'assistant',
					type: 'error',
					content: 'Old error',
					retry: retryFn,
					read: false,
				} as ChatUI.ErrorMessage,
			];

			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'assistant',
					text: 'New text message',
				},
				{
					type: 'error',
					role: 'assistant',
					content: 'New error message',
				},
			];

			const result = builderMessages.processAssistantMessages(
				currentMessages,
				newMessages,
				'test-id',
				retryFn,
			);

			expect(result.messages).toHaveLength(4);

			// Normal text message should be unchanged
			expect(result.messages[0]).toMatchObject({
				type: 'text',
				content: 'Normal message',
			});
			expect('retry' in result.messages[0]).toBe(false);

			// Old error should have retry removed
			const oldError = result.messages[1] as ChatUI.ErrorMessage;
			expect(oldError.content).toBe('Old error');
			expect('retry' in oldError).toBe(false);

			// New text message should not have retry
			expect(result.messages[2]).toMatchObject({
				type: 'text',
				content: 'New text message',
			});
			expect('retry' in result.messages[2]).toBe(false);

			// Only the new error should have retry
			const newError = result.messages[3] as ChatUI.ErrorMessage;
			expect(newError.content).toBe('New error message');
			expect(newError.retry).toBe(retryFn);
		});
	});

	describe('applyRatingLogic', () => {
		it('should apply rating to the last assistant text message after workflow-updated when no tools are running', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: 'msg-1',
					role: 'assistant',
					type: 'text',
					content: 'Starting process...',
					read: false,
				},
				{
					id: 'workflow-1',
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{"nodes": [], "connections": {}}',
					read: false,
				},
				{
					id: 'msg-2',
					role: 'assistant',
					type: 'text',
					content: 'Process completed!',
					read: false,
				},
			];

			const result = builderMessages.applyRatingLogic(messages);

			expect(result).toHaveLength(3);
			expect(result[0].showRating).toBeUndefined();
			expect(result[1].showRating).toBeUndefined();
			expect(result[1].type).toBe('workflow-updated');
			expect(result[2]).toMatchObject({
				id: 'msg-2',
				content: 'Process completed!',
				showRating: true,
				ratingStyle: 'regular',
			});
		});

		it('should not apply rating when tools are still running', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: 'workflow-1',
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{}',
					read: false,
				},
				{
					id: 'tool-1',
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-1',
					status: 'running',
					updates: [],
					read: false,
				},
				{
					id: 'msg-1',
					role: 'assistant',
					type: 'text',
					content: 'Working on it...',
					read: false,
				},
			];

			const result = builderMessages.applyRatingLogic(messages);

			expect(result).toHaveLength(3);
			result.forEach((message) => {
				expect(message.showRating).toBeUndefined();
			});
		});

		it('should not apply rating when still thinking (tools completed but no text response)', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: 'workflow-1',
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{}',
					read: false,
				},
				{
					id: 'tool-1',
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-1',
					status: 'completed',
					updates: [],
					read: false,
				},
			];

			const result = builderMessages.applyRatingLogic(messages);

			expect(result).toHaveLength(2);
			result.forEach((message) => {
				expect(message.showRating).toBeUndefined();
			});
		});

		it('should not apply rating when no workflow-updated message exists', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: 'msg-1',
					role: 'assistant',
					type: 'text',
					content: 'Hello there!',
					read: false,
				},
				{
					id: 'msg-2',
					role: 'assistant',
					type: 'text',
					content: 'How can I help?',
					read: false,
				},
			];

			const result = builderMessages.applyRatingLogic(messages);

			expect(result).toHaveLength(2);
			expect(result[0].showRating).toBeUndefined();
			expect(result[1].showRating).toBeUndefined();
		});

		it('should remove existing ratings when tools are running', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: 'msg-1',
					role: 'assistant',
					type: 'text',
					content: 'Previous message',
					showRating: true,
					ratingStyle: 'regular',
					read: false,
				},
				{
					id: 'tool-1',
					role: 'assistant',
					type: 'tool',
					toolName: 'add_nodes',
					toolCallId: 'call-1',
					status: 'running',
					updates: [],
					read: false,
				},
			];

			const result = builderMessages.applyRatingLogic(messages);

			expect(result).toHaveLength(2);
			expect(result[0]).not.toHaveProperty('showRating');
			expect(result[0]).not.toHaveProperty('ratingStyle');
		});

		it('should remove ratings from non-target messages when applying rating to target message', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: 'msg-1',
					role: 'assistant',
					type: 'text',
					content: 'Earlier message',
					showRating: true,
					ratingStyle: 'minimal',
					read: false,
				},
				{
					id: 'workflow-1',
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{}',
					read: false,
				},
				{
					id: 'msg-2',
					role: 'assistant',
					type: 'text',
					content: 'Target message',
					read: false,
				},
			];

			const result = builderMessages.applyRatingLogic(messages);

			expect(result).toHaveLength(3);
			expect(result[0]).not.toHaveProperty('showRating');
			expect(result[0]).not.toHaveProperty('ratingStyle');
			expect(result[2]).toMatchObject({
				showRating: true,
				ratingStyle: 'regular',
			});
		});

		it('should handle multiple workflow-updated messages and apply rating after the last one', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: 'workflow-1',
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{"nodes": []}',
					read: false,
				},
				{
					id: 'msg-1',
					role: 'assistant',
					type: 'text',
					content: 'First update done',
					read: false,
				},
				{
					id: 'workflow-2',
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{"nodes": [{"name": "HTTP"}]}',
					read: false,
				},
				{
					id: 'msg-2',
					role: 'assistant',
					type: 'text',
					content: 'Final update complete',
					read: false,
				},
			];

			const result = builderMessages.applyRatingLogic(messages);

			expect(result).toHaveLength(4);
			expect(result[1].showRating).toBeUndefined(); // First text message
			expect(result[3]).toMatchObject({
				content: 'Final update complete',
				showRating: true,
				ratingStyle: 'regular',
			});
		});

		it('should handle user messages mixed with assistant messages', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: 'user-1',
					role: 'user',
					type: 'text',
					content: 'Create a workflow',
					read: true,
				},
				{
					id: 'workflow-1',
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{}',
					read: false,
				},
				{
					id: 'msg-1',
					role: 'assistant',
					type: 'text',
					content: 'Workflow created!',
					read: false,
				},
			];

			const result = builderMessages.applyRatingLogic(messages);

			expect(result).toHaveLength(3);
			expect(result[0].showRating).toBeUndefined(); // User message
			expect(result[2]).toMatchObject({
				content: 'Workflow created!',
				showRating: true,
				ratingStyle: 'regular',
			});
		});

		it('should handle empty message array', () => {
			const result = builderMessages.applyRatingLogic([]);
			expect(result).toHaveLength(0);
		});

		it('should apply rating only to assistant text messages, not user text messages', () => {
			const messages: ChatUI.AssistantMessage[] = [
				{
					id: 'workflow-1',
					role: 'assistant',
					type: 'workflow-updated',
					codeSnippet: '{}',
					read: false,
				},
				{
					id: 'user-1',
					role: 'user',
					type: 'text',
					content: 'Thanks!',
					read: true,
				},
				{
					id: 'msg-1',
					role: 'assistant',
					type: 'text',
					content: 'You are welcome!',
					read: false,
				},
			];

			const result = builderMessages.applyRatingLogic(messages);

			expect(result).toHaveLength(3);
			expect(result[1].showRating).toBeUndefined(); // User message should not have rating
			expect(result[2]).toMatchObject({
				content: 'You are welcome!',
				showRating: true,
				ratingStyle: 'regular',
			});
		});
	});
});
