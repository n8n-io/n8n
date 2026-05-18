import type { AgentExecution } from '../entities/agent-execution.entity';
import {
	executionToMessagesDto,
	executionsToMessagesDto,
} from '../utils/execution-to-message-mapper';

function execution(overrides: Partial<AgentExecution> = {}): AgentExecution {
	return {
		id: 'execution-1',
		userMessage: 'Hello',
		assistantResponse: '',
		toolCalls: null,
		timeline: null,
		error: null,
		...overrides,
	} as unknown as AgentExecution;
}

describe('execution-to-message-mapper', () => {
	it('maps execution timeline text and tool calls into assistant message content', () => {
		const result = executionToMessagesDto(
			execution({
				assistantResponse: 'Let me check.Done.',
				timeline: [
					{ type: 'text', content: 'Let me check.', timestamp: 100, endTime: 110 },
					{
						type: 'tool-call',
						kind: 'workflow',
						name: 'search_tool',
						toolCallId: 'call-1',
						input: { query: 'n8n' },
						output: { items: [1] },
						startTime: 111,
						endTime: 120,
						success: true,
						workflowId: 'workflow-1',
						workflowName: 'Search workflow',
					},
					{ type: 'text', content: 'Done.', timestamp: 121, endTime: 130 },
				],
			}),
		);

		expect(result).toEqual([
			{
				id: 'execution-1:user',
				role: 'user',
				content: [{ type: 'text', text: 'Hello' }],
			},
			{
				id: 'execution-1:assistant',
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Let me check.' },
					{
						type: 'tool-call',
						toolName: 'search_tool',
						toolCallId: 'call-1',
						input: { query: 'n8n' },
						state: 'resolved',
						output: { items: [1] },
					},
					{ type: 'text', text: 'Done.' },
				],
			},
		]);
	});

	it('maps failed timeline tool calls as rejected content parts', () => {
		const result = executionToMessagesDto(
			execution({
				timeline: [
					{
						type: 'tool-call',
						kind: 'tool',
						name: 'failing_tool',
						toolCallId: 'call-1',
						input: { id: '123' },
						output: { message: 'Tool failed' },
						startTime: 100,
						endTime: 120,
						success: false,
					},
				],
			}),
		);

		expect(result).toEqual([
			{
				id: 'execution-1:user',
				role: 'user',
				content: [{ type: 'text', text: 'Hello' }],
			},
			{
				id: 'execution-1:assistant',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'failing_tool',
						toolCallId: 'call-1',
						input: { id: '123' },
						state: 'rejected',
						error: 'Tool failed',
					},
				],
			},
		]);
	});

	it('falls back to recorded tool calls when execution timeline is unavailable', () => {
		const result = executionToMessagesDto(
			execution({
				assistantResponse: 'Legacy done.',
				toolCalls: [{ name: 'legacy_tool', input: { id: '123' }, output: 'ok' }],
			}),
		);

		expect(result).toEqual([
			{
				id: 'execution-1:user',
				role: 'user',
				content: [{ type: 'text', text: 'Hello' }],
			},
			{
				id: 'execution-1:assistant',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'legacy_tool',
						toolCallId: 'execution-1:tool:0',
						input: { id: '123' },
						output: 'ok',
					},
					{ type: 'text', text: 'Legacy done.' },
				],
			},
		]);
	});

	it('does not infer resolved state from legacy recorded tool call output', () => {
		const result = executionToMessagesDto(
			execution({
				toolCalls: [
					{
						name: 'legacy_tool',
						input: { id: '123' },
						output: { message: 'Tool failed before timeline recording was available' },
					},
				],
			}),
		);

		expect(result).toEqual([
			{
				id: 'execution-1:user',
				role: 'user',
				content: [{ type: 'text', text: 'Hello' }],
			},
			{
				id: 'execution-1:assistant',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'legacy_tool',
						toolCallId: 'execution-1:tool:0',
						input: { id: '123' },
						output: { message: 'Tool failed before timeline recording was available' },
					},
				],
			},
		]);
	});

	it('does not expose raw working-memory timeline events as chat message content', () => {
		const result = executionToMessagesDto(
			execution({
				assistantResponse: 'Done.',
				timeline: [{ type: 'working-memory', content: 'private memory', timestamp: 100 }],
			}),
		);

		expect(result).toEqual([
			{
				id: 'execution-1:user',
				role: 'user',
				content: [{ type: 'text', text: 'Hello' }],
			},
			{
				id: 'execution-1:assistant',
				role: 'assistant',
				content: [{ type: 'text', text: 'Done.' }],
			},
		]);
	});

	it('flattens multiple executions into a single message list', () => {
		const result = executionsToMessagesDto([
			execution({ id: 'execution-1', userMessage: 'Hello', assistantResponse: 'Hi' }),
			execution({ id: 'execution-2', userMessage: 'Again', assistantResponse: 'There' }),
		]);

		expect(result.map((message) => message.id)).toEqual([
			'execution-1:user',
			'execution-1:assistant',
			'execution-2:user',
			'execution-2:assistant',
		]);
	});
});
