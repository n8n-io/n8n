import type { AgentExecution } from '../entities/agent-execution.entity';
import { MARK_SESSION_FAILED_TOOL_NAME } from '../tools/mark-session-failed.tool';
import {
	executionToMessagesDto,
	executionsToMessagesDto,
} from '../utils/execution-to-message-mapper';
import { MAX_ITERATIONS_STOPPED_MESSAGE } from '../utils/fatal-session-outcome';

const FIXED_CREATED_AT = new Date('2024-01-15T10:00:00.000Z');

function execution(overrides: Partial<AgentExecution> = {}): AgentExecution {
	return {
		id: 'execution-1',
		userMessage: 'Hello',
		timeline: null,
		createdAt: FIXED_CREATED_AT,
		...overrides,
	} as unknown as AgentExecution;
}

describe('execution-to-message-mapper', () => {
	it('splits assistant output around stable additional user messages', () => {
		const inputD = {
			id: 'steer-d',
			role: 'user' as const,
			content: [{ type: 'text' as const, text: 'D' }],
			createdAt: new Date(150).toISOString(),
		};
		const inputB = {
			id: 'steer-b',
			role: 'user' as const,
			content: [{ type: 'text' as const, text: 'B' }],
			createdAt: new Date(250).toISOString(),
		};
		const result = executionToMessagesDto(
			execution({
				status: 'error',
				error: 'Failed after input',
				inputMessages: [
					{ id: 'initial-message', role: 'user', content: [{ type: 'text', text: 'Hello' }] },
					inputD,
					inputB,
				],
				timeline: [
					{ type: 'text', content: 'before', timestamp: 100, endTime: 120 },
					{ type: 'input', messageId: inputD.id, timestamp: 150 },
					{ type: 'text', content: 'between', timestamp: 200, endTime: 220 },
					{ type: 'input', messageId: inputB.id, timestamp: 250 },
					{ type: 'text', content: 'after', timestamp: 300, endTime: 320 },
				],
			}),
		);
		expect(result.map(({ role, content }) => ({ role, content }))).toEqual([
			{ role: 'user', content: [{ type: 'text', text: 'Hello' }] },
			{ role: 'assistant', content: [{ type: 'text', text: 'before' }] },
			{ role: 'user', content: inputD.content },
			{ role: 'assistant', content: [{ type: 'text', text: 'between' }] },
			{ role: 'user', content: inputB.content },
			{ role: 'assistant', content: [{ type: 'text', text: 'after' }] },
		]);
		expect(result[2]).toMatchObject({ ...inputD, executionId: 'execution-1' });
		expect(result[4]).toMatchObject({ ...inputB, executionId: 'execution-1' });
		expect(result.map(({ id }) => id)).toEqual([
			'initial-message',
			'execution-1:assistant',
			'steer-d',
			'execution-1:assistant:steer-d',
			'steer-b',
			'execution-1:assistant:steer-b',
		]);
		expect(result[1].executionStatus).toBe('success');
		expect(result[3].executionStatus).toBe('success');
		expect(result[1].executionError).toBeUndefined();
		expect(result[3].executionError).toBeUndefined();
		expect(result[5]).toMatchObject({
			executionStatus: 'error',
			executionError: 'Failed after input',
		});
	});
	it.each(['running', 'success', 'error', 'cancelled', 'interrupted'] as const)(
		'keeps a signal-only turn with status %s',
		(status) => {
			const signal = {
				tasks: [{ id: 'job-1', title: 'Research', kind: 'subagent', status: 'completed' }],
			} as const;
			const result = executionsToMessagesDto([
				execution({
					userMessage: null,
					status,
					timeline: [
						{
							type: 'background-task-signal',
							signal: { tasks: [...signal.tasks] },
							timestamp: 100,
						},
					],
				}),
			]);
			expect(result).toEqual([
				{
					id: 'execution-1:assistant',
					role: 'assistant',
					executionId: 'execution-1',
					content: [],
					executionStatus: status,
					backgroundTaskSignal: signal,
					createdAt: FIXED_CREATED_AT.toISOString(),
				},
			]);
		},
	);

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

	it('carries the integration author on the user message and omits it when absent', () => {
		const author = { id: 'U1', name: 'alice' };

		expect(executionToMessagesDto(execution({ author }))[0]).toMatchObject({
			role: 'user',
			author,
		});
		expect(executionToMessagesDto(execution({ author: null }))[0]).not.toHaveProperty('author');
	});

	it('keeps an assistant message for an errored turn that produced no output at all', () => {
		const result = executionsToMessagesDto([
			execution({ status: 'error', error: 'fetch failed', timeline: [] }),
		]);

		const assistant = result.find((m) => m.role === 'assistant');
		expect(assistant).toMatchObject({ executionStatus: 'error', executionError: 'fetch failed' });
		expect(assistant?.content).toEqual([]);
	});

	it('does not attach the max-iterations stop as a run error', () => {
		const result = executionToMessagesDto(
			execution({
				status: 'error',
				error: MAX_ITERATIONS_STOPPED_MESSAGE,
				timeline: [
					{
						type: 'text',
						content: MAX_ITERATIONS_STOPPED_MESSAGE,
						timestamp: 100,
						endTime: 110,
					},
				],
			}),
		);

		expect(result[1]).toMatchObject({ role: 'assistant', executionStatus: 'error' });
		expect(result[1]?.executionError).toBeUndefined();
	});

	it('does not attach a mark_session_failed reason as a run error', () => {
		const result = executionToMessagesDto(
			execution({
				status: 'error',
				error: 'Could not recover',
				timeline: [
					{
						type: 'tool-call',
						kind: 'tool',
						name: MARK_SESSION_FAILED_TOOL_NAME,
						toolCallId: 'tc-fail',
						input: { reason: 'Could not recover' },
						output: { marked: true },
						startTime: 100,
						endTime: 110,
						success: true,
					},
				],
			}),
		);

		expect(result[1]?.executionError).toBeUndefined();
	});

	it('keeps a real run error when the turn also marked the session failed', () => {
		const result = executionToMessagesDto(
			execution({
				status: 'error',
				error: 'fetch failed',
				timeline: [
					{
						type: 'tool-call',
						kind: 'tool',
						name: MARK_SESSION_FAILED_TOOL_NAME,
						toolCallId: 'tc-fail',
						input: { reason: 'Could not recover' },
						output: { marked: true },
						startTime: 100,
						endTime: 110,
						success: true,
					},
				],
			}),
		);

		expect(result[1]?.executionError).toBe('fetch failed');
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
				createdAt: FIXED_CREATED_AT.toISOString(),
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
				createdAt: FIXED_CREATED_AT.toISOString(),
			},
		]);
	});

	it('associates a suspension payload with its original tool call', () => {
		const suspendPayload = {
			type: 'approval',
			toolName: 'check_ledger',
			args: { operation: 'get', returnAll: true },
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
				createdAt: FIXED_CREATED_AT.toISOString(),
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
				createdAt: FIXED_CREATED_AT.toISOString(),
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
			createdAt: FIXED_CREATED_AT.toISOString(),
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

	it('maps an execution error without model output into an assistant message', () => {
		const result = executionToMessagesDto(
			execution({
				status: 'error',
				error: 'Model request failed',
			}),
		);

		// The error stays in `executionError`, not in `content`, so the client
		// renders it as an error bubble instead of model output.
		expect(result[1]).toEqual({
			id: 'execution-1:assistant',
			role: 'assistant',
			content: [],
			executionId: 'execution-1',
			executionStatus: 'error',
			executionError: 'Model request failed',
			createdAt: FIXED_CREATED_AT.toISOString(),
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
				createdAt: FIXED_CREATED_AT.toISOString(),
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
				createdAt: FIXED_CREATED_AT.toISOString(),
			},
			{
				id: 'execution-resumed:assistant',
				role: 'assistant',
				content: [{ type: 'text', text: 'Approved.' }],
				executionId: 'execution-resumed',
				createdAt: FIXED_CREATED_AT.toISOString(),
			},
		]);
	});
});

describe('who answered a suspended tool call', () => {
	const toolCall = (toolCallId: string, endTime = 0) => ({
		type: 'tool-call' as const,
		kind: 'tool' as const,
		name: 'deploy_workflow',
		toolCallId,
		input: { workflowId: 'wf-1' },
		output: endTime > 0 ? { deployed: true } : undefined,
		startTime: 100,
		endTime,
		success: endTime > 0,
	});
	/** The result of a resumed call. The recorder stores it without the input of the call. */
	const resumedResult = (toolCallId: string, endTime: number) => ({
		...toolCall(toolCallId, endTime),
		input: undefined,
	});
	const suspension = (toolCallId: string) => ({
		type: 'suspension' as const,
		toolName: 'deploy_workflow',
		toolCallId,
		timestamp: 110,
		suspendPayload: { message: 'Deploy?' },
	});
	const answer = (
		toolCallId: string,
		response: unknown,
		respondedBy?: { id: string; name: string },
	) => ({
		type: 'hitl-response' as const,
		toolCallId,
		response,
		timestamp: 300,
		...(respondedBy ? { respondedBy } : {}),
	});
	const grace = { id: 'user-2', name: 'Grace Hopper' };

	/** The turn that suspended, then the resumed turn with the answer. */
	const answeredTurns = (response: unknown, respondedBy?: { id: string; name: string }) => [
		execution({ id: 'suspended', timeline: [toolCall('tc-1'), suspension('tc-1')] }),
		execution({
			id: 'resumed',
			userMessage: null,
			timeline: [answer('tc-1', response, respondedBy), resumedResult('tc-1', 400)],
		}),
	];

	const toolParts = (executions: AgentExecution[]) =>
		executionsToMessagesDto(executions)
			.flatMap((message) => message.content)
			.filter((part) => part.type === 'tool-call');

	it('marks an approved tool call with the user who approved it', () => {
		const parts = toolParts(answeredTurns({ approved: true }, grace));

		expect(parts).toHaveLength(1);
		expect(parts[0]).toMatchObject({
			toolCallId: 'tc-1',
			state: 'resolved',
			suspendPayload: { message: 'Deploy?' },
			approvedBy: grace,
		});
		expect(parts[0]).not.toHaveProperty('declinedBy');
	});

	it('marks a declined tool call with the user who declined it', () => {
		const [part] = toolParts(answeredTurns({ approved: false }, grace));

		expect(part).toMatchObject({ declinedBy: grace });
		expect(part).not.toHaveProperty('approvedBy');
	});

	it('treats an answer without an approved field as an approval', () => {
		const [part] = toolParts(answeredTurns({ answers: [] }, grace));

		expect(part).toMatchObject({ approvedBy: grace });
	});

	it('adds no author to an answer recorded without one', () => {
		const [part] = toolParts(answeredTurns({ approved: true }));

		expect(part).not.toHaveProperty('approvedBy');
		expect(part).not.toHaveProperty('declinedBy');
	});

	it('uses the later answer when a call was answered twice', () => {
		const ada = { id: 'user-1', name: 'Ada Lovelace' };
		const turns = [
			...answeredTurns({ approved: false }, ada),
			execution({
				id: 'again',
				userMessage: null,
				timeline: [answer('tc-1', { approved: true }, grace)],
			}),
		];

		const [part] = toolParts(turns);

		expect(part).toMatchObject({ approvedBy: grace });
	});

	it('marks only the answered call', () => {
		const turns = [
			execution({
				id: 'suspended',
				timeline: [toolCall('tc-1'), toolCall('tc-2', 200), suspension('tc-1')],
			}),
			execution({
				id: 'resumed',
				userMessage: null,
				timeline: [answer('tc-1', { approved: true }, grace), resumedResult('tc-1', 400)],
			}),
		];

		const parts = toolParts(turns);

		expect(parts.find((part) => part.toolCallId === 'tc-2')).not.toHaveProperty('approvedBy');
		expect(parts.find((part) => part.toolCallId === 'tc-1')).toMatchObject({ approvedBy: grace });
	});

	it('copies the author, so a change to one message does not change another', () => {
		const turns = answeredTurns({ approved: true }, grace);
		const [part] = toolParts(turns);

		part.approvedBy!.name = 'Changed';

		expect(turns[1].timeline?.[0]).toMatchObject({ respondedBy: { name: 'Grace Hopper' } });
	});
});
