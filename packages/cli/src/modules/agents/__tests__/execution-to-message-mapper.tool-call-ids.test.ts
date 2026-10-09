import type { AgentPersistedMessageContentPart } from '@n8n/api-types';

import type { AgentExecution } from '../entities/agent-execution.entity';
import type { TimelineEvent } from '../execution-recorder';
import { executionsToMessagesDto } from '../utils/execution-to-message-mapper';

// Some models count their tool call ids from 1 in each response, so a later turn can use
// the id of an earlier call again. Each call must keep its own part in the history.
const REUSED_ID = 'toolu_1';
const grace = { id: 'user-2', name: 'Grace Hopper' };
const proposal = { message: 'Turn on "Daily digest"?', automationProposal: { workflowId: 'wf-1' } };

function execution(
	id: string,
	timeline: TimelineEvent[],
	userMessage: string | null = 'Hello',
): AgentExecution {
	return {
		id,
		userMessage,
		timeline,
		createdAt: new Date('2024-01-15T10:00:00.000Z'),
	} as unknown as AgentExecution;
}

type ToolCallEvent = Extract<TimelineEvent, { type: 'tool-call' }>;

/** A tool call as the recorder stores it. An end time of 0 means that it still waits. */
function toolCall(name: string, toolCallId: string, endTime = 0, output?: unknown): ToolCallEvent {
	return {
		type: 'tool-call',
		kind: 'tool',
		name,
		toolCallId,
		input: { name },
		output,
		startTime: 100,
		endTime,
		success: endTime > 0,
	};
}

/** The result of a resumed call. The recorder stores it without the input of the call. */
function resumedResult(
	name: string,
	toolCallId: string,
	endTime: number,
	output: unknown,
): ToolCallEvent {
	return { ...toolCall(name, toolCallId, endTime, output), input: undefined };
}

/** A call of the model with its own input. */
function callWithInput(call: ToolCallEvent, input: Record<string, unknown>): ToolCallEvent {
	return { ...call, input };
}

function suspension(toolName: string, toolCallId: string): TimelineEvent {
	return { type: 'suspension', toolName, toolCallId, timestamp: 110, suspendPayload: proposal };
}

function answer(toolCallId: string, approved: boolean): TimelineEvent {
	return {
		type: 'hitl-response',
		toolCallId,
		response: { approved },
		timestamp: 300,
		respondedBy: grace,
	};
}

const toolParts = (executions: AgentExecution[]) =>
	executionsToMessagesDto(executions)
		.flatMap((message) => message.content)
		.filter((part): part is AgentPersistedMessageContentPart => part.type === 'tool-call');

/** Turn 1 builds a workflow. Turn 2 proposes it and waits, with the id of the build call. */
const buildThenPropose = () => [
	execution('build', [toolCall('build-workflow', REUSED_ID, 200, { workflowId: 'wf-1' })]),
	execution('propose', [
		toolCall('propose_automation', REUSED_ID),
		suspension('propose_automation', REUSED_ID),
	]),
];

describe('tool calls that share an id across turns', () => {
	it('keeps a waiting call after a settled call of another tool with the same id', () => {
		const messages = executionsToMessagesDto(buildThenPropose());

		const assistantParts = messages
			.filter(({ role }) => role === 'assistant')
			.map(({ id, content }) => ({ id, content }));
		expect(assistantParts).toEqual([
			{
				id: 'build:assistant',
				content: [
					expect.objectContaining({
						toolName: 'build-workflow',
						toolCallId: REUSED_ID,
						state: 'resolved',
						output: { workflowId: 'wf-1' },
					}),
				],
			},
			{
				id: 'propose:assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'propose_automation',
						toolCallId: REUSED_ID,
						input: { name: 'propose_automation' },
						startTime: 100,
						suspendPayload: proposal,
					},
				],
			},
		]);
	});

	it('settles the waiting call when its turn resumes, and leaves the earlier call as it was', () => {
		const parts = toolParts([
			...buildThenPropose(),
			execution(
				'resumed',
				[answer(REUSED_ID, true), resumedResult('propose_automation', REUSED_ID, 400, 'kept')],
				null,
			),
		]);

		expect(parts).toHaveLength(2);
		expect(parts[0]).toMatchObject({ toolName: 'build-workflow', state: 'resolved' });
		expect(parts[0]).not.toHaveProperty('approvedBy');
		expect(parts[1]).toMatchObject({
			toolName: 'propose_automation',
			toolCallId: REUSED_ID,
			input: { name: 'propose_automation' },
			suspendPayload: proposal,
			state: 'resolved',
			output: 'kept',
			endTime: 400,
			approvedBy: grace,
		});
	});

	it('keeps a new waiting call of the same tool after the earlier call with that id settled', () => {
		const parts = toolParts([
			execution('first', [toolCall('executions', REUSED_ID, 200, { ran: true })]),
			execution('second', [toolCall('executions', REUSED_ID), suspension('executions', REUSED_ID)]),
		]);

		expect(parts).toHaveLength(2);
		expect(parts[0]).toMatchObject({ state: 'resolved', output: { ran: true } });
		expect(parts[1]).not.toHaveProperty('state');
		expect(parts[1]).toMatchObject({ toolName: 'executions', suspendPayload: proposal });
	});

	it('keeps two settled calls of the same tool with the same id from different turns', () => {
		const parts = toolParts([
			execution('first', [toolCall('lookup', REUSED_ID, 200, 'one')]),
			execution('second', [toolCall('lookup', REUSED_ID, 300, 'two')]),
		]);

		expect(parts.map((part) => part.output)).toEqual(['one', 'two']);
	});

	it('cancels an open call when a later call has its id and tool, and settles the later call', () => {
		const parts = toolParts([
			execution('first', [toolCall('ask', REUSED_ID)]),
			execution('second', [toolCall('ask', REUSED_ID)], null),
			execution('third', [resumedResult('ask', REUSED_ID, 400, 'answer')], null),
		]);

		expect(parts).toHaveLength(2);
		expect(parts[0]).toEqual({
			type: 'tool-call',
			toolName: 'ask',
			toolCallId: REUSED_ID,
			input: { name: 'ask' },
			startTime: 100,
			canceled: true,
		});
		expect(parts[1]).toMatchObject({ state: 'resolved', output: 'answer', endTime: 400 });
		expect(parts[1].canceled).toBeUndefined();
	});

	it('cancels an open call when a later call with its id and tool is still open', () => {
		const parts = toolParts([
			execution('first', [toolCall('ask', REUSED_ID)]),
			execution('second', [toolCall('ask', REUSED_ID), suspension('ask', REUSED_ID)]),
		]);

		expect(parts).toHaveLength(2);
		expect(parts[0]).toMatchObject({ canceled: true });
		expect(parts[1]).not.toHaveProperty('canceled');
		expect(parts[1]).toMatchObject({ suspendPayload: proposal });
	});

	it('gives the answer and the result to the card that the user answered, not to a stopped card with its id', () => {
		const card = (workflowId: string) =>
			callWithInput(toolCall('propose_automation', REUSED_ID), { workflowId });
		const parts = toolParts([
			// The user stopped this card, so its call never got a result.
			execution('stopped', [card('wf-A'), suspension('propose_automation', REUSED_ID)]),
			execution('proposed', [card('wf-B'), suspension('propose_automation', REUSED_ID)]),
			execution(
				'resumed',
				[
					answer(REUSED_ID, true),
					resumedResult('propose_automation', REUSED_ID, 400, { activated: 'wf-B' }),
				],
				null,
			),
		]);

		expect(parts).toHaveLength(2);
		expect(parts[0]).toMatchObject({ input: { workflowId: 'wf-A' }, canceled: true });
		expect(parts[0]).not.toHaveProperty('state');
		expect(parts[0]).not.toHaveProperty('output');
		expect(parts[0]).not.toHaveProperty('approvedBy');
		expect(parts[1]).toMatchObject({
			input: { workflowId: 'wf-B' },
			state: 'resolved',
			output: { activated: 'wf-B' },
			approvedBy: grace,
		});
		expect(parts[1].canceled).toBeUndefined();
	});

	it('gives the answer to the call that waited, not to a later call with the same id', () => {
		const parts = toolParts([
			execution('run', [toolCall('executions', REUSED_ID), suspension('executions', REUSED_ID)]),
			execution(
				'resumed',
				[answer(REUSED_ID, false), resumedResult('executions', REUSED_ID, 400, 'declined')],
				null,
			),
			execution('build', [toolCall('build-workflow', REUSED_ID, 500, { workflowId: 'wf-2' })]),
		]);

		expect(parts).toHaveLength(2);
		expect(parts[0]).toMatchObject({ toolName: 'executions', declinedBy: grace });
		expect(parts[1]).toMatchObject({ toolName: 'build-workflow', state: 'resolved' });
		expect(parts[1]).not.toHaveProperty('declinedBy');
		expect(parts[1]).not.toHaveProperty('approvedBy');
	});

	it('adds no author when the answer comes before any call with its id', () => {
		const parts = toolParts([
			execution('answer-first', [answer(REUSED_ID, true)], null),
			execution('later', [toolCall('lookup', REUSED_ID, 200, 'done')]),
		]);

		expect(parts).toHaveLength(1);
		expect(parts[0]).not.toHaveProperty('approvedBy');
	});

	it('cancels a call that its run left open when a new call with its id and tool settles at once', () => {
		const messages = executionsToMessagesDto([
			// The run ended before the call got its result (for example after a restart).
			execution('ended', [callWithInput(toolCall('lookup', REUSED_ID), { id: 1 })]),
			execution('again', [
				callWithInput(toolCall('lookup', REUSED_ID, 200, { found: 2 }), { id: 2 }),
			]),
		]);

		const partsOf = (messageId: string) =>
			messages
				.find(({ id }) => id === messageId)
				?.content.filter(({ type }) => type === 'tool-call');
		expect(partsOf('ended:assistant')).toEqual([
			{
				type: 'tool-call',
				toolName: 'lookup',
				toolCallId: REUSED_ID,
				input: { id: 1 },
				startTime: 100,
				canceled: true,
			},
		]);
		expect(partsOf('again:assistant')).toEqual([
			expect.objectContaining({
				toolName: 'lookup',
				input: { id: 2 },
				state: 'resolved',
				output: { found: 2 },
			}),
		]);
	});

	it('cancels a stopped card when a new call with its id and tool settles at once', () => {
		const parts = toolParts([
			execution('stopped', [
				callWithInput(toolCall('propose_automation', REUSED_ID), { workflowId: 'wf-A' }),
				suspension('propose_automation', REUSED_ID),
			]),
			execution('settled', [
				callWithInput(toolCall('propose_automation', REUSED_ID, 300, 'kept'), {
					workflowId: 'wf-B',
				}),
			]),
		]);

		expect(parts).toHaveLength(2);
		expect(parts[0]).toMatchObject({ input: { workflowId: 'wf-A' }, canceled: true });
		expect(parts[0]).not.toHaveProperty('output');
		expect(parts[1]).toMatchObject({ input: { workflowId: 'wf-B' }, output: 'kept' });
		expect(parts[1].canceled).toBeUndefined();
	});

	it('does not give a later result to a call that a new call with its id and tool replaced', () => {
		const parts = toolParts([
			execution('ended', [toolCall('ask', REUSED_ID)]),
			execution('settled', [toolCall('ask', REUSED_ID, 200, 'first')]),
			execution('resumed', [resumedResult('ask', REUSED_ID, 400, 'late')], null),
		]);

		expect(parts.map(({ output, canceled }) => ({ output, canceled }))).toEqual([
			{ output: undefined, canceled: true },
			{ output: 'first', canceled: undefined },
			{ output: 'late', canceled: undefined },
		]);
	});

	it('keeps a result record in its own turn when no call waits for it', () => {
		const parts = toolParts([
			execution('settled', [toolCall('ask', REUSED_ID, 200, 'first')]),
			execution('resumed', [resumedResult('ask', REUSED_ID, 400, 'late')], null),
		]);

		expect(parts).toHaveLength(2);
		expect(parts[1]).toMatchObject({ state: 'resolved', output: 'late' });
		expect(parts[1].input).toBeUndefined();
	});

	it('keeps an open call without an input open until its result arrives', () => {
		const withoutInput = { ...toolCall('ask', REUSED_ID), input: undefined };
		const parts = toolParts([
			execution('asked', [withoutInput, suspension('ask', REUSED_ID)]),
			execution('resumed', [resumedResult('ask', REUSED_ID, 400, 'answer')], null),
		]);

		expect(parts).toHaveLength(1);
		expect(parts[0]).toMatchObject({
			state: 'resolved',
			output: 'answer',
			suspendPayload: proposal,
		});
		expect(parts[0].canceled).toBeUndefined();
	});

	it('keeps the answer author of a later answer to the same call only', () => {
		const parts = toolParts([
			execution('run', [toolCall('executions', REUSED_ID), suspension('executions', REUSED_ID)]),
			execution('declined', [answer(REUSED_ID, false)], null),
			execution(
				'approved',
				[answer(REUSED_ID, true), resumedResult('executions', REUSED_ID, 400, 'ran')],
				null,
			),
		]);

		expect(parts).toHaveLength(1);
		expect(parts[0]).toMatchObject({ approvedBy: grace, state: 'resolved' });
		expect(parts[0]).not.toHaveProperty('declinedBy');
	});
});
