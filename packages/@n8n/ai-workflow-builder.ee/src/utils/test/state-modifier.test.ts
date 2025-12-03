import { AIMessage, HumanMessage, RemoveMessage } from '@langchain/core/messages';

import { cleanupDanglingToolCallMessages } from '../cleanup-dangling-tool-call-messages';
import {
	determineStateAction,
	handleCleanupDangling,
	handleDeleteMessages,
} from '../state-modifier';
import { estimateTokenCountFromMessages } from '../token-usage';

jest.mock('../cleanup-dangling-tool-call-messages');
jest.mock('../token-usage');

const mockCleanupDanglingToolCallMessages = cleanupDanglingToolCallMessages as jest.MockedFunction<
	typeof cleanupDanglingToolCallMessages
>;
const mockEstimateTokenCountFromMessages = estimateTokenCountFromMessages as jest.MockedFunction<
	typeof estimateTokenCountFromMessages
>;

describe('state-modifier', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockCleanupDanglingToolCallMessages.mockReturnValue([]);
		mockEstimateTokenCountFromMessages.mockReturnValue(100);
	});

	describe('determineStateAction', () => {
		const emptyWorkflow = { nodes: [], connections: {}, name: '' };
		const defaultNameWorkflow = { nodes: [], connections: {}, name: 'My workflow' };
		const defaultNameNumberedWorkflow = { nodes: [], connections: {}, name: 'My workflow 5' };
		const customNameWorkflow = { nodes: [], connections: {}, name: 'Email automation' };
		const workflowWithNodes = {
			nodes: [
				{
					id: '1',
					name: 'Start',
					type: 'n8n-nodes-base.start',
					position: [0, 0] as [number, number],
					typeVersion: 1,
					parameters: {},
				},
			],
			connections: {},
			name: 'My workflow',
		};

		it('should return cleanup_dangling when dangling tool calls exist', () => {
			mockCleanupDanglingToolCallMessages.mockReturnValue([
				new RemoveMessage({ id: 'dangling-1' }),
			]);

			const result = determineStateAction(
				{
					messages: [new HumanMessage({ id: 'h1', content: 'Hello' })],
					workflowJSON: emptyWorkflow,
				},
				40000,
			);

			expect(result).toBe('cleanup_dangling');
		});

		it('should return compact_messages for /compact command', () => {
			const result = determineStateAction(
				{
					messages: [new HumanMessage({ id: 'h1', content: '/compact' })],
					workflowJSON: emptyWorkflow,
				},
				40000,
			);

			expect(result).toBe('compact_messages');
		});

		it('should return delete_messages for /clear command', () => {
			const result = determineStateAction(
				{
					messages: [new HumanMessage({ id: 'h1', content: '/clear' })],
					workflowJSON: emptyWorkflow,
				},
				40000,
			);

			expect(result).toBe('delete_messages');
		});

		it('should return create_workflow_name for first message with default workflow name', () => {
			const result = determineStateAction(
				{
					messages: [new HumanMessage({ id: 'h1', content: 'Create an email workflow' })],
					workflowJSON: defaultNameWorkflow,
				},
				40000,
			);

			expect(result).toBe('create_workflow_name');
		});

		it('should return create_workflow_name for first message with numbered default name', () => {
			const result = determineStateAction(
				{
					messages: [new HumanMessage({ id: 'h1', content: 'Create an email workflow' })],
					workflowJSON: defaultNameNumberedWorkflow,
				},
				40000,
			);

			expect(result).toBe('create_workflow_name');
		});

		it('should return create_workflow_name for first message with empty workflow name', () => {
			const result = determineStateAction(
				{
					messages: [new HumanMessage({ id: 'h1', content: 'Create an email workflow' })],
					workflowJSON: emptyWorkflow,
				},
				40000,
			);

			expect(result).toBe('create_workflow_name');
		});

		it('should NOT return create_workflow_name for custom workflow name', () => {
			const result = determineStateAction(
				{
					messages: [new HumanMessage({ id: 'h1', content: 'Create an email workflow' })],
					workflowJSON: customNameWorkflow,
				},
				40000,
			);

			expect(result).toBe('continue');
		});

		it('should NOT return create_workflow_name when workflow has nodes', () => {
			const result = determineStateAction(
				{
					messages: [new HumanMessage({ id: 'h1', content: 'Add another node' })],
					workflowJSON: workflowWithNodes,
				},
				40000,
			);

			expect(result).toBe('continue');
		});

		it('should NOT return create_workflow_name when there are multiple messages', () => {
			const result = determineStateAction(
				{
					messages: [
						new HumanMessage({ id: 'h1', content: 'First message' }),
						new AIMessage({ id: 'a1', content: 'Response' }),
						new HumanMessage({ id: 'h2', content: 'Second message' }),
					],
					workflowJSON: defaultNameWorkflow,
				},
				40000,
			);

			expect(result).toBe('continue');
		});

		it('should return auto_compact_messages when tokens exceed threshold', () => {
			mockEstimateTokenCountFromMessages.mockReturnValue(50000);

			const result = determineStateAction(
				{
					messages: [new HumanMessage({ id: 'h1', content: 'A very long conversation' })],
					workflowJSON: customNameWorkflow,
				},
				40000,
			);

			expect(result).toBe('auto_compact_messages');
		});

		it('should return continue as default when no conditions match', () => {
			const result = determineStateAction(
				{
					messages: [
						new HumanMessage({ id: 'h1', content: 'Hello' }),
						new AIMessage({ id: 'a1', content: 'Hi!' }),
					],
					workflowJSON: customNameWorkflow,
				},
				40000,
			);

			expect(result).toBe('continue');
		});

		it('should return continue when there are no human messages', () => {
			const result = determineStateAction(
				{
					messages: [new AIMessage({ id: 'a1', content: 'AI response' })],
					workflowJSON: emptyWorkflow,
				},
				40000,
			);

			expect(result).toBe('continue');
		});
	});

	describe('handleCleanupDangling', () => {
		it('should return RemoveMessage array for dangling messages', () => {
			const danglingRemoveMessages = [
				new RemoveMessage({ id: 'ai-1' }),
				new RemoveMessage({ id: 'ai-2' }),
			];
			mockCleanupDanglingToolCallMessages.mockReturnValue(danglingRemoveMessages);

			const messages = [
				new AIMessage({
					id: 'ai-1',
					content: 'Call',
					tool_calls: [{ id: 'tc1', name: 'tool', args: {} }],
				}),
				new AIMessage({
					id: 'ai-2',
					content: 'Call',
					tool_calls: [{ id: 'tc2', name: 'tool', args: {} }],
				}),
			];

			const result = handleCleanupDangling(messages);

			expect(result.messages).toHaveLength(2);
			expect(result.messages[0]).toBeInstanceOf(RemoveMessage);
			expect(result.messages[1]).toBeInstanceOf(RemoveMessage);
		});

		it('should return empty array when no dangling messages', () => {
			mockCleanupDanglingToolCallMessages.mockReturnValue([]);

			const result = handleCleanupDangling([new HumanMessage({ id: 'h1', content: 'Hello' })]);

			expect(result.messages).toHaveLength(0);
		});
	});

	describe('handleDeleteMessages', () => {
		it('should return RemoveMessage for each input message', () => {
			const messages = [
				new HumanMessage({ id: 'h1', content: 'Hello' }),
				new AIMessage({ id: 'a1', content: 'Hi' }),
				new HumanMessage({ id: 'h2', content: 'Bye' }),
			];

			const result = handleDeleteMessages(messages);

			expect(result.messages).toHaveLength(3);
			expect(result.messages[0]).toBeInstanceOf(RemoveMessage);
			expect(result.messages[0].id).toBe('h1');
			expect(result.messages[1].id).toBe('a1');
			expect(result.messages[2].id).toBe('h2');
		});

		it('should reset workflowJSON to empty state', () => {
			const result = handleDeleteMessages([new HumanMessage({ id: 'h1', content: 'Hello' })]);

			expect(result.workflowJSON).toEqual({
				nodes: [],
				connections: {},
				name: '',
			});
		});

		it('should clear previousSummary', () => {
			const result = handleDeleteMessages([]);

			expect(result.previousSummary).toBe('');
		});

		it('should set discoveryContext to null', () => {
			const result = handleDeleteMessages([]);

			expect(result.discoveryContext).toBeNull();
		});

		it('should add coordination log entry for clear action', () => {
			const result = handleDeleteMessages([]);

			expect(result.coordinationLog).toHaveLength(1);
			expect(result.coordinationLog[0].phase).toBe('state_management');
			expect(result.coordinationLog[0].status).toBe('completed');
			expect(result.coordinationLog[0].summary).toBe('Cleared session and reset workflow');
		});

		it('should return empty workflowOperations array', () => {
			const result = handleDeleteMessages([]);

			expect(result.workflowOperations).toEqual([]);
		});
	});
});
