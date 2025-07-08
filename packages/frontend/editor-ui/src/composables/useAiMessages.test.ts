import { describe, it, expect, vi } from 'vitest';
import { useAiMessages } from './useAiMessages';
import type { ChatRequest } from '@/types/assistant.types';
import type { ChatUI } from '@n8n/design-system/types/assistant';
import type { INodeTypeDescription } from 'n8n-workflow';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

describe('useAiMessages', () => {
	const {
		processAssistantMessages,
		createUserMessage,
		createErrorMessage,
		addMessages,
		clearMessages,
	} = useAiMessages();

	describe('createUserMessage', () => {
		it('should create a user message with correct properties', () => {
			const content = 'Hello, assistant!';
			const id = 'msg-123';

			const result = createUserMessage(content, id);

			expect(result).toEqual({
				id,
				role: 'user',
				type: 'text',
				content,
				read: true,
			});
		});
	});

	describe('createErrorMessage', () => {
		it('should create an error message without retry function', () => {
			const content = 'Something went wrong';
			const id = 'error-123';

			const result = createErrorMessage(content, id);

			expect(result).toEqual({
				id,
				role: 'assistant',
				type: 'error',
				content,
				read: true,
			});
		});

		it('should create an error message with retry function', () => {
			const content = 'Network error';
			const id = 'error-456';
			const retry = vi.fn();

			const result = createErrorMessage(content, id, retry);

			expect(result).toEqual({
				id,
				role: 'assistant',
				type: 'error',
				content,
				read: true,
				retry,
			});
		});
	});

	describe('addMessages', () => {
		it('should add messages to existing array', () => {
			const existing: ChatUI.AssistantMessage[] = [
				{ id: '1', type: 'text', role: 'user', content: 'First' },
			];
			const newMessages: ChatUI.AssistantMessage[] = [
				{ id: '2', type: 'text', role: 'assistant', content: 'Second' },
				{ id: '3', type: 'text', role: 'user', content: 'Third' },
			];

			const result = addMessages(existing, newMessages);

			expect(result).toHaveLength(3);
			expect(result[0]).toEqual(existing[0]);
			expect(result[1]).toEqual(newMessages[0]);
			expect(result[2]).toEqual(newMessages[1]);
		});

		it('should return a new array instance', () => {
			const existing: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatUI.AssistantMessage[] = [];

			const result = addMessages(existing, newMessages);

			expect(result).not.toBe(existing);
			expect(result).not.toBe(newMessages);
		});
	});

	describe('clearMessages', () => {
		it('should return an empty array', () => {
			const result = clearMessages();

			expect(result).toEqual([]);
			expect(result).toHaveLength(0);
		});
	});

	describe('processAssistantMessages', () => {
		const nodeGetter = vi.fn(
			(nodeType: string): INodeTypeDescription => ({
				displayName: `${nodeType} Node`,
				name: nodeType,
				group: ['test'],
				version: 1,
				description: 'Test node',
				defaults: {},
				inputs: [],
				outputs: [],
				properties: [],
			}),
		);

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should process text messages correctly', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'assistant',
					text: 'Hello, how can I help?',
					quickReplies: [{ type: 'test', text: 'Quick reply' }],
					codeSnippet: 'console.log("hello");',
				} as ChatRequest.TextMessage,
			];
			const id = 'test-id';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]).toEqual({
				id,
				type: 'text',
				role: 'assistant',
				content: 'Hello, how can I help?',
				codeSnippet: 'console.log("hello");',
				read: true,
				quickReplies: [{ type: 'test', text: 'Quick reply' }],
			});
			expect(result.shouldClearThinking).toBe(true);
			expect(result.thinkingMessage).toBeUndefined();
		});

		it('should process summary messages correctly', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'summary',
					role: 'assistant',
					title: 'Summary Title',
					content: 'Summary content here',
				} as ChatRequest.SummaryMessage,
			];
			const id = 'summary-id';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]).toEqual({
				id,
				type: 'block',
				role: 'assistant',
				title: 'Summary Title',
				content: 'Summary content here',
				read: true,
			});
		});

		it('should process agent suggestion messages correctly', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'agent-suggestion',
					role: 'assistant',
					title: 'Suggestion',
					text: 'Try this approach',
					suggestionId: 'suggestion-123',
				} as ChatRequest.AgentSuggestionMessage,
			];
			const id = 'agent-id';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]).toEqual({
				id,
				type: 'agent-suggestion',
				role: 'assistant',
				title: 'Suggestion',
				content: 'Try this approach',
				suggestionId: 'suggestion-123',
				read: true,
			});
		});

		it('should skip agent thinking messages', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'intermediate-step',
					role: 'assistant',
					text: 'Thinking...',
					step: 'step-1',
				} as ChatRequest.AgentThinkingStep,
			];
			const id = 'thinking-id';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.messages).toHaveLength(0);
			expect(result.shouldClearThinking).toBe(false);
		});

		it('should process code diff messages correctly', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'code-diff',
					role: 'assistant',
					description: 'Code changes',
					codeDiff: '- old\n+ new',
					suggestionId: 'diff-123',
					solution_count: 3,
					quickReplies: [{ type: 'apply', text: 'Apply changes' }],
				} as ChatRequest.CodeDiffMessage,
			];
			const id = 'diff-id';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]).toEqual({
				id,
				type: 'code-diff',
				role: 'assistant',
				description: 'Code changes',
				codeDiff: '- old\n+ new',
				suggestionId: 'diff-123',
				quickReplies: [{ type: 'apply', text: 'Apply changes' }],
				read: true,
			});
		});

		it('should process workflow step messages correctly', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'workflow-step',
					role: 'assistant',
					steps: ['Step 1', 'Step 2', 'Step 3'],
				} as ChatRequest.WorkflowStepMessage,
			];
			const id = 'step-id';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]).toEqual({
				id,
				type: 'workflow-step',
				role: 'assistant',
				steps: ['Step 1', 'Step 2', 'Step 3'],
				read: true,
			});
		});

		it('should process workflow node messages with node name mapping', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'workflow-node',
					role: 'assistant',
					nodes: ['httpRequest', 'code', 'ifNode'],
				} as ChatRequest.WorkflowNodeMessage,
			];
			const id = 'node-id';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]).toEqual({
				id,
				type: 'workflow-node',
				role: 'assistant',
				nodes: ['httpRequest Node', 'code Node', 'ifNode Node'],
				read: true,
			});
			expect(nodeGetter).toHaveBeenCalledTimes(3);
		});

		it('should handle workflow node messages without node getter', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'workflow-node',
					role: 'assistant',
					nodes: ['httpRequest', 'code', 'ifNode'],
				} as ChatRequest.WorkflowNodeMessage,
			];
			const id = 'node-id';

			const result = processAssistantMessages(currentMessages, newMessages, id, undefined);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]).toEqual({
				id,
				type: 'workflow-node',
				role: 'assistant',
				nodes: ['httpRequest', 'code', 'ifNode'],
				read: true,
			});
		});

		it('should process workflow composed messages correctly', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const nodes = [
				{
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					parameters: { method: 'GET' },
					position: [100, 200] as [number, number],
				},
			];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'workflow-composed',
					role: 'assistant',
					nodes,
				} as ChatRequest.WorkflowComposedMessage,
			];
			const id = 'composed-id';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]).toEqual({
				id,
				type: 'workflow-composed',
				role: 'assistant',
				nodes,
				read: true,
			});
		});

		it('should process workflow generated/updated messages correctly', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'workflow-generated',
					role: 'assistant',
					codeSnippet: 'workflow code here',
				} as ChatRequest.WorkflowGeneratedMessage,
				{
					type: 'workflow-updated',
					role: 'assistant',
					codeSnippet: 'updated workflow code',
				} as ChatRequest.WorkflowUpdatedMessage,
			];
			const id = 'workflow-id';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.messages).toHaveLength(2);
			expect(result.messages[0]).toEqual({
				id,
				type: 'workflow-generated',
				role: 'assistant',
				codeSnippet: 'workflow code here',
				read: true,
			});
			expect(result.messages[1]).toEqual({
				id,
				type: 'workflow-updated',
				role: 'assistant',
				codeSnippet: 'updated workflow code',
				read: true,
			});
		});

		it('should process rate workflow messages correctly', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'rate-workflow',
					role: 'assistant',
					content: 'Please rate this workflow',
				} as ChatRequest.RateWorkflowMessage,
			];
			const id = 'rate-id';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]).toEqual({
				id,
				type: 'rate-workflow',
				role: 'assistant',
				content: 'Please rate this workflow',
				read: true,
			});
		});

		it('should process prompt validation errors correctly', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'prompt-validation',
					role: 'assistant',
					isWorkflowPrompt: false,
				} as ChatRequest.WorkflowPromptValidationMessage,
			];
			const id = 'validation-id';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]).toEqual({
				id,
				role: 'assistant',
				type: 'error',
				content: 'aiAssistant.builder.invalidPrompt',
				read: true,
			});
		});

		it('should skip prompt validation for workflow prompts', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'prompt-validation',
					role: 'assistant',
					isWorkflowPrompt: true,
				} as ChatRequest.WorkflowPromptValidationMessage,
			];
			const id = 'validation-id';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.messages).toHaveLength(0);
		});

		it('should handle tool messages with running status', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'tool',
					role: 'assistant',
					toolName: 'Code Generator',
					toolCallId: 'tool-123',
					status: 'running',
					updates: [{ type: 'progress', data: { message: 'Starting...' } }],
				} as ChatRequest.ToolMessage,
			];
			const id = 'tool-id';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0]).toEqual({
				id,
				type: 'tool',
				role: 'assistant',
				toolName: 'Code Generator',
				toolCallId: 'tool-123',
				status: 'running',
				updates: [{ type: 'progress', data: { message: 'Starting...' } }],
				read: true,
			});
			expect(result.thinkingMessage).toBeUndefined();
		});

		it('should update existing running tool messages', () => {
			const existingTool: ChatUI.ToolMessage = {
				id: 'tool-id',
				type: 'tool',
				role: 'assistant',
				toolName: 'Code Generator',
				toolCallId: 'tool-123',
				status: 'running',
				updates: [{ type: 'progress', data: { message: 'Starting...' } }],
				read: true,
			};
			const currentMessages: ChatUI.AssistantMessage[] = [existingTool];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'tool',
					role: 'assistant',
					toolName: 'Code Generator',
					toolCallId: 'tool-123',
					status: 'running',
					updates: [{ type: 'progress', data: { message: 'Processing...' } }],
				} as ChatRequest.ToolMessage,
			];
			const id = 'tool-id-2';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0].type).toBe('tool');
			const toolMessage = result.messages[0] as ChatUI.ToolMessage;
			expect(toolMessage.updates).toHaveLength(2);
			expect(toolMessage.updates[0]).toEqual({
				type: 'progress',
				data: { message: 'Starting...' },
			});
			expect(toolMessage.updates[1]).toEqual({
				type: 'progress',
				data: { message: 'Processing...' },
			});
		});

		it('should complete tool messages and show processing message', () => {
			const existingTool: ChatUI.ToolMessage = {
				id: 'tool-id',
				type: 'tool',
				role: 'assistant',
				toolName: 'Code Generator',
				toolCallId: 'tool-123',
				status: 'running',
				updates: [{ type: 'progress', data: { message: 'Processing...' } }],
				read: true,
			};
			const currentMessages: ChatUI.AssistantMessage[] = [existingTool];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'tool',
					role: 'assistant',
					toolName: 'Code Generator',
					toolCallId: 'tool-123',
					status: 'completed',
					updates: [{ type: 'output', data: { result: 'Done!' } }],
				} as ChatRequest.ToolMessage,
			];
			const id = 'tool-id-2';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.messages).toHaveLength(1);
			expect(result.messages[0].type).toBe('tool');
			const toolMessage = result.messages[0] as ChatUI.ToolMessage;
			expect(toolMessage.status).toBe('completed');
			expect(result.thinkingMessage).toBe('aiAssistant.thinkingSteps.processingResults');
		});

		it('should not show processing message if other tools are still running', () => {
			const runningTool: ChatUI.ToolMessage = {
				id: 'tool-1',
				type: 'tool',
				role: 'assistant',
				toolName: 'Tool 1',
				toolCallId: 'tool-1',
				status: 'running',
				updates: [],
				read: true,
			};
			const completingTool: ChatUI.ToolMessage = {
				id: 'tool-2',
				type: 'tool',
				role: 'assistant',
				toolName: 'Tool 2',
				toolCallId: 'tool-2',
				status: 'running',
				updates: [],
				read: true,
			};
			const currentMessages: ChatUI.AssistantMessage[] = [runningTool, completingTool];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'tool',
					role: 'assistant',
					toolName: 'Tool 2',
					toolCallId: 'tool-2',
					status: 'completed',
					updates: [],
				} as ChatRequest.ToolMessage,
			];
			const id = 'tool-id-3';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.thinkingMessage).toBeUndefined();
		});

		it('should process multiple messages in sequence', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const newMessages: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'assistant',
					text: 'First message',
				} as ChatRequest.TextMessage,
				{
					type: 'workflow-step',
					role: 'assistant',
					steps: ['Step 1', 'Step 2'],
				} as ChatRequest.WorkflowStepMessage,
				{
					type: 'code-diff',
					role: 'assistant',
					description: 'Final changes',
					codeDiff: 'diff content',
					suggestionId: 'final-123',
				} as ChatRequest.CodeDiffMessage,
			];
			const id = 'multi-id';

			const result = processAssistantMessages(currentMessages, newMessages, id, nodeGetter);

			expect(result.messages).toHaveLength(3);
			expect(result.messages[0].type).toBe('text');
			expect(result.messages[1].type).toBe('workflow-step');
			expect(result.messages[2].type).toBe('code-diff');
			expect(result.shouldClearThinking).toBe(true);
		});

		it('should clear thinking message when receiving text or tool messages', () => {
			const currentMessages: ChatUI.AssistantMessage[] = [];
			const textMessage: ChatRequest.MessageResponse[] = [
				{
					type: 'message',
					role: 'assistant',
					text: 'Response',
				} as ChatRequest.TextMessage,
			];
			const toolMessage: ChatRequest.MessageResponse[] = [
				{
					type: 'tool',
					role: 'assistant',
					toolName: 'Tool',
					toolCallId: 'tool-1',
					status: 'running',
					updates: [],
				} as ChatRequest.ToolMessage,
			];

			const textResult = processAssistantMessages(currentMessages, textMessage, 'id-1', nodeGetter);
			expect(textResult.shouldClearThinking).toBe(true);

			const toolResult = processAssistantMessages(currentMessages, toolMessage, 'id-2', nodeGetter);
			expect(toolResult.shouldClearThinking).toBe(true);
		});
	});
});
