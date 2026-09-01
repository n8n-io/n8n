import type { AgentExecution } from '../entities/agent-execution.entity';
import {
	executionToMessagesDto,
	executionsToMessagesDto,
} from '../utils/execution-to-message-mapper';

function execution(overrides: Partial<AgentExecution> = {}): AgentExecution {
	return {
		id: 'execution-1',
		userMessage: 'Hello',
		timeline: null,
		...overrides,
	} as unknown as AgentExecution;
}

describe('execution-to-message-mapper', () => {
	it('carries the recorded run error on the assistant message of an errored turn', () => {
		const result = executionToMessagesDto(
			execution({
				status: 'error',
				error: 'The model stream stalled: no data received for 90 seconds.',
				timeline: [{ type: 'text', content: 'partial output', timestamp: 100, endTime: 110 }],
			}),
		);

		expect(result[1]).toMatchObject({
			role: 'assistant',
			executionStatus: 'error',
			executionError: 'The model stream stalled: no data received for 90 seconds.',
		});
	});

	it('keeps an assistant message for an errored turn that produced no output at all', () => {
		const result = executionsToMessagesDto([
			execution({ status: 'error', error: 'fetch failed', timeline: [] }),
		]);

		const assistant = result.find((m) => m.role === 'assistant');
		expect(assistant).toMatchObject({ executionStatus: 'error', executionError: 'fetch failed' });
		expect(assistant?.content).toEqual([]);
	});

	it('does not attach the recorded error to successful turns', () => {
		const result = executionToMessagesDto(
			execution({
				status: 'success',
				error: null,
				timeline: [{ type: 'text', content: 'ok', timestamp: 100, endTime: 110 }],
			}),
		);

		expect(result[1]?.executionError).toBeUndefined();
	});

	it('maps reasoning timeline events with timing into assistant message content', () => {
		const result = executionToMessagesDto(
			execution({
				timeline: [
					{
						type: 'reasoning',
						content: 'Check the inputs.',
						timestamp: 100,
						endTime: 150,
					},
					{ type: 'text', content: 'Done.', timestamp: 151, endTime: 160 },
				],
			}),
		);

		expect(result[1]?.content).toEqual([
			{
				type: 'reasoning',
				text: 'Check the inputs.',
				startTime: 100,
				endTime: 150,
			},
			{ type: 'text', text: 'Done.' },
		]);
	});

	it('carries childTrace onto the persisted tool-call content part', () => {
		const childTrace = {
			text: 'child said this',
			reasoningSegments: [{ id: 'r-1', content: 'thinking' }],
			steps: [{ toolCallId: 'child-tc-1', toolName: 'web_search', running: false }],
		};
		const result = executionToMessagesDto(
			execution({
				timeline: [
					{
						type: 'tool-call',
						kind: 'tool',
						name: 'delegate_subagent',
						toolCallId: 'tc-parent',
						input: { goal: 'x' },
						output: { status: 'completed', answer: 'done' },
						startTime: 100,
						endTime: 200,
						success: true,
						childTrace,
					},
				],
			}),
		);

		expect(result[1]?.content).toEqual([
			{
				type: 'tool-call',
				toolName: 'delegate_subagent',
				toolCallId: 'tc-parent',
				input: { goal: 'x' },
				startTime: 100,
				endTime: 200,
				state: 'resolved',
				output: { status: 'completed', answer: 'done' },
				childTrace,
			},
		]);
	});

	it('maps execution timeline text and tool calls into assistant message content', () => {
		const result = executionToMessagesDto(
			execution({
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
				executionId: 'execution-1',
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
						startTime: 111,
						endTime: 120,
						state: 'resolved',
						output: { items: [1] },
					},
					{ type: 'text', text: 'Done.' },
				],
				executionId: 'execution-1',
			},
		]);
	});

	it('associates a suspension payload with its original tool call', () => {
		const suspendPayload = {
			type: 'approval',
			toolName: 'check_ledger',
			args: {},
			details: { node: { parameters: { operation: 'get', returnAll: true } } },
		};
		const result = executionToMessagesDto(
			execution({
				timeline: [
					{
						type: 'tool-call',
						kind: 'node',
						name: 'check_ledger',
						toolCallId: 'call-1',
						input: {},
						output: undefined,
						startTime: 100,
						endTime: 0,
						success: false,
					},
					{
						type: 'suspension',
						toolName: 'check_ledger',
						toolCallId: 'call-1',
						timestamp: 110,
						suspendPayload,
					},
				],
			}),
		);

		expect(result[1]?.content[0]).toMatchObject({
			type: 'tool-call',
			toolCallId: 'call-1',
			suspendPayload,
		});
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
				executionId: 'execution-1',
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
						startTime: 100,
						endTime: 120,
						state: 'rejected',
						error: 'Tool failed',
					},
				],
				executionId: 'execution-1',
			},
		]);
	});

	it('includes attachment file parts on the user message', () => {
		const result = executionToMessagesDto(
			execution({
				attachments: [{ id: 'att-1', fileName: 'photo.png', mimeType: 'image/png', sizeBytes: 33 }],
			}),
		);

		expect(result[0]).toEqual({
			id: 'execution-1:user',
			role: 'user',
			content: [
				{ type: 'text', text: 'Hello' },
				{
					type: 'file',
					fileId: 'att-1',
					fileName: 'photo.png',
					mimeType: 'image/png',
					sizeBytes: 33,
				},
			],
			executionId: 'execution-1',
		});
	});

	it('emits a user message for attachment-only turns without text', () => {
		const result = executionToMessagesDto(
			execution({
				userMessage: null,
				attachments: [
					{ id: 'att-1', fileName: 'voice.ogg', mimeType: 'audio/ogg', sizeBytes: 100 },
				],
			}),
		);

		expect(result[0].role).toBe('user');
		expect(result[0].content).toEqual([
			{
				type: 'file',
				fileId: 'att-1',
				fileName: 'voice.ogg',
				mimeType: 'audio/ogg',
				sizeBytes: 100,
			},
		]);
	});

	it('includes the execution outcome on assistant messages', () => {
		const result = executionToMessagesDto(
			execution({
				status: 'error',
				timeline: [
					{
						type: 'tool-call',
						kind: 'tool',
						name: 'slow_tool',
						toolCallId: 'call-1',
						input: {},
						output: undefined,
						startTime: 100,
						endTime: 0,
						success: false,
					},
				],
			}),
		);

		expect(result[1]).toMatchObject({
			role: 'assistant',
			executionStatus: 'error',
		});
	});

	it('flattens multiple executions into a single message list', () => {
		const result = executionsToMessagesDto([
			execution({
				id: 'execution-1',
				userMessage: 'Hello',
				timeline: [{ type: 'text', content: 'Hi', timestamp: 100 }],
			}),
			execution({
				id: 'execution-2',
				userMessage: 'Again',
				timeline: [{ type: 'text', content: 'There', timestamp: 200 }],
			}),
		]);

		expect(result.map((message) => message.id)).toEqual([
			'execution-1:user',
			'execution-1:assistant',
			'execution-2:user',
			'execution-2:assistant',
		]);
	});

	it('settles an earlier suspended tool call from a later resumed execution', () => {
		const result = executionsToMessagesDto([
			execution({
				id: 'execution-suspended',
				userMessage: 'Show me an action',
				timeline: [
					{ type: 'text', content: 'Pick one.', timestamp: 100, endTime: 110 },
					{
						type: 'tool-call',
						kind: 'tool',
						name: 'chat_action',
						toolCallId: 'tc-action',
						input: {
							action: 'respond',
							input: {
								message: {
									text: 'Choose',
									card: {
										components: [{ type: 'button', label: 'Approve', value: 'approve' }],
									},
								},
							},
						},
						output: undefined,
						startTime: 120,
						endTime: 0,
						success: false,
					},
				],
			}),
			execution({
				id: 'execution-resumed',
				userMessage: null,
				timeline: [
					{
						type: 'tool-call',
						kind: 'tool',
						name: 'chat_action',
						toolCallId: 'tc-action',
						input: undefined,
						output: { type: 'button', value: 'approve' },
						startTime: 200,
						endTime: 220,
						success: true,
					},
					{ type: 'text', content: 'Approved.', timestamp: 230, endTime: 240 },
				],
			}),
		]);

		expect(result).toEqual([
			{
				id: 'execution-suspended:user',
				role: 'user',
				content: [{ type: 'text', text: 'Show me an action' }],
				executionId: 'execution-suspended',
			},
			{
				id: 'execution-suspended:assistant',
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Pick one.' },
					{
						type: 'tool-call',
						toolName: 'chat_action',
						toolCallId: 'tc-action',
						input: {
							action: 'respond',
							input: {
								message: {
									text: 'Choose',
									card: {
										components: [{ type: 'button', label: 'Approve', value: 'approve' }],
									},
								},
							},
						},
						startTime: 120,
						endTime: 220,
						state: 'resolved',
						output: { type: 'button', value: 'approve' },
					},
				],
				executionId: 'execution-suspended',
			},
			{
				id: 'execution-resumed:assistant',
				role: 'assistant',
				content: [{ type: 'text', text: 'Approved.' }],
				executionId: 'execution-resumed',
			},
		]);
	});
});
