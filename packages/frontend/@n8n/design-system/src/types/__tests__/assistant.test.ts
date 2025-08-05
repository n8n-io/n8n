/**
 * Comprehensive test suite for assistant type guards and utilities
 */

import { vi } from 'vitest';
import {
	type ChatUI,
	isTextMessage,
	isSummaryBlock,
	isCodeDiffMessage,
	isErrorMessage,
	isEndSessionMessage,
	isSessionTimeoutMessage,
	isSessionErrorMessage,
	isAgentSuggestionMessage,
	isWorkflowUpdatedMessage,
	isToolMessage,
	hasRequiredProps,
} from '../assistant';

describe('Assistant Type Guards', () => {
	// Mock message data for testing
	const createBaseMessage = (overrides: Partial<ChatUI.AssistantMessage> = {}) => ({
		id: 'test-id',
		role: 'assistant' as const,
		read: false,
		...overrides,
	});

	describe('isTextMessage', () => {
		it('should return true for text message', () => {
			const message = createBaseMessage({
				type: 'text',
				content: 'Hello world',
			}) as ChatUI.AssistantMessage;

			expect(isTextMessage(message)).toBe(true);
		});

		it('should return false for non-text message', () => {
			const message = createBaseMessage({
				type: 'error',
				content: 'Error occurred',
			}) as ChatUI.AssistantMessage;

			expect(isTextMessage(message)).toBe(false);
		});

		it('should handle text message with code snippet', () => {
			const message = createBaseMessage({
				type: 'text',
				content: 'Here is code',
				codeSnippet: 'console.log("test")',
			}) as ChatUI.AssistantMessage;

			expect(isTextMessage(message)).toBe(true);
		});

		it('should handle text message with quick replies', () => {
			const message = createBaseMessage({
				type: 'text',
				content: 'Choose an option',
				quickReplies: [{ type: 'button', text: 'Option 1' }],
			}) as ChatUI.AssistantMessage;

			expect(isTextMessage(message)).toBe(true);
		});
	});

	describe('isSummaryBlock', () => {
		it('should return true for summary block message', () => {
			const message = createBaseMessage({
				type: 'block',
				title: 'Summary',
				content: 'This is a summary',
			}) as ChatUI.AssistantMessage;

			expect(isSummaryBlock(message)).toBe(true);
		});

		it('should return false for non-block message', () => {
			const message = createBaseMessage({
				type: 'text',
				content: 'Regular text',
			}) as ChatUI.AssistantMessage;

			expect(isSummaryBlock(message)).toBe(false);
		});

		it('should handle summary block with quick replies', () => {
			const message = createBaseMessage({
				type: 'block',
				title: 'Summary',
				content: 'Summary content',
				quickReplies: [{ type: 'feedback', text: 'Helpful', isFeedback: true }],
			}) as ChatUI.AssistantMessage;

			expect(isSummaryBlock(message)).toBe(true);
		});
	});

	describe('isCodeDiffMessage', () => {
		it('should return true for code diff message', () => {
			const message = createBaseMessage({
				type: 'code-diff',
				suggestionId: 'suggestion-123',
				codeDiff: 'diff content',
			}) as ChatUI.AssistantMessage;

			expect(isCodeDiffMessage(message)).toBe(true);
		});

		it('should return false for non-code-diff message', () => {
			const message = createBaseMessage({
				type: 'text',
				content: 'Not a diff',
			}) as ChatUI.AssistantMessage;

			expect(isCodeDiffMessage(message)).toBe(false);
		});

		it('should handle code diff with all optional properties', () => {
			const message = createBaseMessage({
				type: 'code-diff',
				suggestionId: 'suggestion-456',
				description: 'Code changes',
				codeDiff: 'diff content',
				replacing: true,
				replaced: false,
				error: false,
			}) as ChatUI.AssistantMessage;

			expect(isCodeDiffMessage(message)).toBe(true);
		});

		it('should handle error code diff', () => {
			const message = createBaseMessage({
				type: 'code-diff',
				suggestionId: 'suggestion-error',
				error: true,
			}) as ChatUI.AssistantMessage;

			expect(isCodeDiffMessage(message)).toBe(true);
		});
	});

	describe('isErrorMessage', () => {
		it('should return true for error message', () => {
			const message = createBaseMessage({
				type: 'error',
				content: 'An error occurred',
			}) as ChatUI.AssistantMessage;

			expect(isErrorMessage(message)).toBe(true);
		});

		it('should return false for non-error message', () => {
			const message = createBaseMessage({
				type: 'text',
				content: 'Normal message',
			}) as ChatUI.AssistantMessage;

			expect(isErrorMessage(message)).toBe(false);
		});

		it('should handle error message with retry function', () => {
			const retryFn = vi.fn().mockResolvedValue(undefined);
			const message = createBaseMessage({
				type: 'error',
				content: 'Retryable error',
				retry: retryFn,
			}) as ChatUI.AssistantMessage;

			expect(isErrorMessage(message)).toBe(true);
		});
	});

	describe('isEndSessionMessage', () => {
		it('should return true for end session event message', () => {
			const message = createBaseMessage({
				type: 'event',
				eventName: 'end-session',
			}) as ChatUI.AssistantMessage;

			expect(isEndSessionMessage(message)).toBe(true);
		});

		it('should return false for non-event message', () => {
			const message = createBaseMessage({
				type: 'text',
				content: 'Not an event',
			}) as ChatUI.AssistantMessage;

			expect(isEndSessionMessage(message)).toBe(false);
		});

		it('should return false for event message with different event name', () => {
			const message = createBaseMessage({
				type: 'event',
				eventName: 'session-timeout',
			}) as ChatUI.AssistantMessage;

			expect(isEndSessionMessage(message)).toBe(false);
		});

		it('should return false for non-event type with event name', () => {
			const message = createBaseMessage({
				type: 'text',
				eventName: 'end-session',
				content: 'Text message',
			}) as any;

			expect(isEndSessionMessage(message)).toBe(false);
		});
	});

	describe('isSessionTimeoutMessage', () => {
		it('should return true for session timeout event message', () => {
			const message = createBaseMessage({
				type: 'event',
				eventName: 'session-timeout',
			}) as ChatUI.AssistantMessage;

			expect(isSessionTimeoutMessage(message)).toBe(true);
		});

		it('should return false for non-event message', () => {
			const message = createBaseMessage({
				type: 'text',
				content: 'Not an event',
			}) as ChatUI.AssistantMessage;

			expect(isSessionTimeoutMessage(message)).toBe(false);
		});

		it('should return false for event message with different event name', () => {
			const message = createBaseMessage({
				type: 'event',
				eventName: 'end-session',
			}) as ChatUI.AssistantMessage;

			expect(isSessionTimeoutMessage(message)).toBe(false);
		});
	});

	describe('isSessionErrorMessage', () => {
		it('should return true for session error event message', () => {
			const message = createBaseMessage({
				type: 'event',
				eventName: 'session-error',
			}) as ChatUI.AssistantMessage;

			expect(isSessionErrorMessage(message)).toBe(true);
		});

		it('should return false for non-event message', () => {
			const message = createBaseMessage({
				type: 'text',
				content: 'Not an event',
			}) as ChatUI.AssistantMessage;

			expect(isSessionErrorMessage(message)).toBe(false);
		});

		it('should return false for event message with different event name', () => {
			const message = createBaseMessage({
				type: 'event',
				eventName: 'session-timeout',
			}) as ChatUI.AssistantMessage;

			expect(isSessionErrorMessage(message)).toBe(false);
		});
	});

	describe('isAgentSuggestionMessage', () => {
		it('should return true for agent suggestion message', () => {
			const message = createBaseMessage({
				type: 'agent-suggestion',
				title: 'Suggestion Title',
				content: 'Suggestion content',
				suggestionId: 'suggestion-789',
			}) as ChatUI.AssistantMessage;

			expect(isAgentSuggestionMessage(message)).toBe(true);
		});

		it('should return false for non-agent-suggestion message', () => {
			const message = createBaseMessage({
				type: 'text',
				content: 'Not a suggestion',
			}) as ChatUI.AssistantMessage;

			expect(isAgentSuggestionMessage(message)).toBe(false);
		});

		it('should handle agent suggestion with quick replies', () => {
			const message = createBaseMessage({
				type: 'agent-suggestion',
				title: 'AI Suggestion',
				content: 'Try this approach',
				suggestionId: 'ai-123',
				quickReplies: [
					{ type: 'accept', text: 'Accept' },
					{ type: 'reject', text: 'Decline' },
				],
			}) as ChatUI.AssistantMessage;

			expect(isAgentSuggestionMessage(message)).toBe(true);
		});
	});

	describe('isWorkflowUpdatedMessage', () => {
		it('should return true for workflow updated message', () => {
			const message = createBaseMessage({
				type: 'workflow-updated',
				codeSnippet: 'Updated workflow code',
			}) as ChatUI.AssistantMessage;

			expect(isWorkflowUpdatedMessage(message)).toBe(true);
		});

		it('should return false for non-workflow-updated message', () => {
			const message = createBaseMessage({
				type: 'text',
				content: 'Not a workflow update',
			}) as ChatUI.AssistantMessage;

			expect(isWorkflowUpdatedMessage(message)).toBe(false);
		});

		it('should handle workflow updated with complex code snippet', () => {
			const complexCode = `
				function updateWorkflow() {
					return {
						nodes: [],
						connections: {}
					};
				}
			`;
			const message = createBaseMessage({
				type: 'workflow-updated',
				codeSnippet: complexCode,
			}) as ChatUI.AssistantMessage;

			expect(isWorkflowUpdatedMessage(message)).toBe(true);
		});
	});

	describe('isToolMessage', () => {
		it('should return true for tool message', () => {
			const message = createBaseMessage({
				type: 'tool',
				toolName: 'TestTool',
				status: 'running',
				updates: [
					{
						type: 'input',
						data: { param: 'value' },
						timestamp: '2023-01-01T00:00:00Z',
					},
				],
			}) as ChatUI.AssistantMessage;

			expect(isToolMessage(message)).toBe(true);
		});

		it('should return false for non-tool message', () => {
			const message = createBaseMessage({
				type: 'text',
				content: 'Not a tool message',
			}) as ChatUI.AssistantMessage;

			expect(isToolMessage(message)).toBe(false);
		});

		it('should handle tool message with different statuses', () => {
			const statuses: Array<'running' | 'completed' | 'error'> = ['running', 'completed', 'error'];

			statuses.forEach((status) => {
				const message = createBaseMessage({
					type: 'tool',
					toolName: 'StatusTool',
					status,
					updates: [],
				}) as ChatUI.AssistantMessage;

				expect(isToolMessage(message)).toBe(true);
			});
		});

		it('should handle tool message with multiple update types', () => {
			const message = createBaseMessage({
				type: 'tool',
				toolName: 'ComplexTool',
				toolCallId: 'call-123',
				status: 'completed',
				updates: [
					{ type: 'input', data: { input: 'test' } },
					{ type: 'progress', data: { percent: 50 } },
					{ type: 'output', data: { result: 'success' } },
					{ type: 'error', data: { message: 'warning' } },
				],
			}) as ChatUI.AssistantMessage;

			expect(isToolMessage(message)).toBe(true);
		});
	});

	describe('hasRequiredProps', () => {
		it('should return true when message has required id and read properties', () => {
			const message = createBaseMessage({
				type: 'text',
				content: 'Test message',
				id: 'required-id',
				read: true,
			}) as ChatUI.AssistantMessage;

			expect(hasRequiredProps(message)).toBe(true);
		});

		it('should return false when message is missing id', () => {
			const message = createBaseMessage({
				type: 'text',
				content: 'Test message',
				read: true,
			}) as ChatUI.AssistantMessage;
			delete message.id;

			expect(hasRequiredProps(message)).toBe(false);
		});

		it('should return false when message is missing read property', () => {
			const message = createBaseMessage({
				type: 'text',
				content: 'Test message',
				id: 'test-id',
			}) as ChatUI.AssistantMessage;
			delete message.read;

			expect(hasRequiredProps(message)).toBe(false);
		});

		it('should return false when id is not a string', () => {
			const message = {
				type: 'text',
				content: 'Test message',
				role: 'assistant',
				id: 123, // Not a string
				read: true,
			} as any;

			expect(hasRequiredProps(message)).toBe(false);
		});

		it('should return false when read is not a boolean', () => {
			const message = {
				type: 'text',
				content: 'Test message',
				role: 'assistant',
				id: 'test-id',
				read: 'true', // Not a boolean
			} as any;

			expect(hasRequiredProps(message)).toBe(false);
		});

		it('should return false when both id and read are missing', () => {
			const message = {
				type: 'text',
				content: 'Test message',
				role: 'assistant',
			} as any;

			expect(hasRequiredProps(message)).toBe(false);
		});

		it('should work with different message types', () => {
			const messageTypes = [
				{ type: 'text', content: 'Text' },
				{ type: 'error', content: 'Error' },
				{ type: 'block', title: 'Block', content: 'Content' },
				{ type: 'code-diff', suggestionId: 'diff-1' },
				{ type: 'agent-suggestion', title: 'AI', content: 'Suggestion', suggestionId: 'ai-1' },
				{ type: 'workflow-updated', codeSnippet: 'code' },
				{ type: 'tool', toolName: 'Tool', status: 'running', updates: [] },
				{ type: 'event', eventName: 'end-session' },
			] as const;

			messageTypes.forEach((msgType) => {
				// Test with required props
				const messageWithProps = {
					...createBaseMessage(msgType),
					id: 'test-id',
					read: false,
				} as ChatUI.AssistantMessage;
				expect(hasRequiredProps(messageWithProps)).toBe(true);

				// Test without required props
				const messageWithoutProps = createBaseMessage(msgType) as ChatUI.AssistantMessage;
				delete messageWithoutProps.id;
				delete messageWithoutProps.read;
				expect(hasRequiredProps(messageWithoutProps)).toBe(false);
			});
		});
	});

	describe('Type Guard Edge Cases', () => {
		it('should handle messages with extra properties', () => {
			const messageWithExtra = {
				...createBaseMessage({
					type: 'text',
					content: 'Test',
				}),
				extraProp: 'should be ignored',
				anotherExtra: 123,
			} as any;

			expect(isTextMessage(messageWithExtra)).toBe(true);
		});

		it('should handle malformed messages gracefully', () => {
			const malformedMessage = {
				// Missing required properties
				type: 'text',
				// missing content, role, etc.
			} as any;

			expect(isTextMessage(malformedMessage)).toBe(true); // Only checks type
			expect(hasRequiredProps(malformedMessage)).toBe(false);
		});

		it('should handle null and undefined inputs safely', () => {
			// These may throw errors for null/undefined since they try to access .type property
			expect(() => isTextMessage(null as any)).toThrow();
			expect(() => isTextMessage(undefined as any)).toThrow();
			expect(() => hasRequiredProps(null as any)).toThrow();
			expect(() => hasRequiredProps(undefined as any)).toThrow();
		});

		it('should handle empty object', () => {
			const emptyMessage = {} as any;

			expect(isTextMessage(emptyMessage)).toBe(false);
			expect(isErrorMessage(emptyMessage)).toBe(false);
			expect(hasRequiredProps(emptyMessage)).toBe(false);
		});
	});

	describe('Type Guard Combinations', () => {
		it('should correctly identify mutually exclusive message types', () => {
			const textMessage = createBaseMessage({
				type: 'text',
				content: 'Hello',
			}) as ChatUI.AssistantMessage;

			expect(isTextMessage(textMessage)).toBe(true);
			expect(isErrorMessage(textMessage)).toBe(false);
			expect(isSummaryBlock(textMessage)).toBe(false);
			expect(isCodeDiffMessage(textMessage)).toBe(false);
			expect(isToolMessage(textMessage)).toBe(false);
		});

		it('should handle event messages with different event names', () => {
			const endSessionMsg = createBaseMessage({
				type: 'event',
				eventName: 'end-session',
			}) as ChatUI.AssistantMessage;

			const timeoutMsg = createBaseMessage({
				type: 'event',
				eventName: 'session-timeout',
			}) as ChatUI.AssistantMessage;

			const errorMsg = createBaseMessage({
				type: 'event',
				eventName: 'session-error',
			}) as ChatUI.AssistantMessage;

			// End session
			expect(isEndSessionMessage(endSessionMsg)).toBe(true);
			expect(isSessionTimeoutMessage(endSessionMsg)).toBe(false);
			expect(isSessionErrorMessage(endSessionMsg)).toBe(false);

			// Timeout
			expect(isEndSessionMessage(timeoutMsg)).toBe(false);
			expect(isSessionTimeoutMessage(timeoutMsg)).toBe(true);
			expect(isSessionErrorMessage(timeoutMsg)).toBe(false);

			// Error
			expect(isEndSessionMessage(errorMsg)).toBe(false);
			expect(isSessionTimeoutMessage(errorMsg)).toBe(false);
			expect(isSessionErrorMessage(errorMsg)).toBe(true);
		});
	});
});
