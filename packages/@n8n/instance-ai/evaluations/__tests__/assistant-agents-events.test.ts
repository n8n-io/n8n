import type { AgentPersistedMessageDto, AgentThreadUsageResponse } from '@n8n/api-types';

import {
	eventsFromHistory,
	runDebugFromUsage,
	syncEventsFromHistory,
} from '../harness/assistant-agents';
import { buildConversationMetrics, extractOutcomeFromEvents } from '../outcome/event-parser';
import { buildTranscriptFromEvents } from '../outcome/transcript-from-events';
import { USER_TURN_EVENT, type CapturedEvent } from '../types';
import { transcriptAsText } from '../utils/conversation-text';

const T0 = Date.parse('2026-11-11T10:00:00.000Z');

function userMessage(id: string, text: string, at: number): AgentPersistedMessageDto {
	return {
		id,
		role: 'user',
		content: [{ type: 'text', text }],
		createdAt: new Date(at).toISOString(),
	};
}

function marker(text: string, at: number): CapturedEvent {
	return {
		timestamp: at,
		type: USER_TURN_EVENT,
		data: { type: USER_TURN_EVENT, payload: { text } },
	};
}

/** One build turn: narration, a tool call with a result, a failed tool call, a final reply. */
const buildTurn: AgentPersistedMessageDto = {
	id: 'exec-1:assistant',
	role: 'assistant',
	executionId: 'exec-1',
	executionStatus: 'success',
	createdAt: new Date(T0 + 1_000).toISOString(),
	content: [
		{ type: 'text', text: 'I will build it.', startTime: T0 + 1_100, endTime: T0 + 1_200 },
		{
			type: 'tool-call',
			toolCallId: 'call-build',
			toolName: 'workflow_builder_build_workflow',
			input: { prompt: 'Slack digest' },
			output: { success: true, workflowId: 'wf-1' },
			state: 'output-available',
			startTime: T0 + 1_300,
			endTime: T0 + 5_000,
		},
		{
			type: 'tool-call',
			toolCallId: 'call-run',
			toolName: 'workflows_run',
			input: { workflowId: 'wf-1' },
			error: 'Node "Slack" has no credential',
			state: 'output-error',
			startTime: T0 + 5_100,
			endTime: T0 + 5_400,
		},
		{ type: 'reasoning', text: 'internal', startTime: T0 + 5_500 },
		{ type: 'text', text: 'Done. Connect Slack to run it.' },
	],
};

describe('eventsFromHistory', () => {
	it('rebuilds text, tool call, result and error events with the execution id as run id', () => {
		const events = eventsFromHistory([userMessage('u1', 'Build it', T0), buildTurn]);

		expect(events.map((event) => event.type)).toEqual([
			'run-start',
			'text-delta',
			'tool-call',
			'tool-result',
			'tool-call',
			'tool-error',
			'text-delta',
			'run-finish',
		]);
		for (const event of events) {
			expect(event.data).toMatchObject({ runId: 'exec-1', agentId: 'agent-001' });
		}
		expect(events[0].timestamp).toBe(T0 + 1_000);
		expect(events[2].data.payload).toEqual({
			toolCallId: 'call-build',
			toolName: 'workflow_builder_build_workflow',
			args: { prompt: 'Slack digest' },
		});
		expect(events[3]).toMatchObject({
			timestamp: T0 + 5_000,
			data: {
				payload: { toolCallId: 'call-build', result: { success: true, workflowId: 'wf-1' } },
			},
		});
		expect(events[5].data.payload).toEqual({
			toolCallId: 'call-run',
			toolName: 'workflows_run',
			error: 'Node "Slack" has no credential',
		});
		// The last text part has no time of its own, so it takes the latest settled time.
		expect(events[6].timestamp).toBe(T0 + 5_500);
		expect(events[7].data.payload).toEqual({ status: 'completed' });
	});

	it('feeds the outcome parser the same shapes as the Instance AI event log', () => {
		const outcome = extractOutcomeFromEvents(eventsFromHistory([buildTurn]));

		expect(outcome.toolCalls.map((call) => [call.toolName, call.error ?? 'ok'])).toEqual([
			['workflow_builder_build_workflow', 'ok'],
			['workflows_run', 'Node "Slack" has no credential'],
		]);
		expect(outcome.toolCalls[0].durationMs).toBe(3_700);
		expect(outcome.finalText).toContain('Done. Connect Slack to run it.');
	});

	it('records the real tool of a tool catalog `call_tool` call, so the built workflow is found', () => {
		const catalogTurn: AgentPersistedMessageDto = {
			id: 'exec-cat:assistant',
			role: 'assistant',
			executionId: 'exec-cat',
			executionStatus: 'success',
			createdAt: new Date(T0).toISOString(),
			content: [
				{
					type: 'tool-call',
					toolCallId: 'call-build',
					toolName: 'call_tool',
					input: {
						tool: 'workflow_builder_build_workflow',
						arguments: { name: 'Image flow', sourceCode: 'export default workflow()' },
					},
					output: { success: true, workflowId: 'wf-built-1', workflowName: 'Image flow' },
				},
			],
		};

		const events = eventsFromHistory([catalogTurn]);
		const outcome = extractOutcomeFromEvents(events);

		expect(events.find((event) => event.type === 'tool-call')?.data.payload).toEqual({
			toolCallId: 'call-build',
			toolName: 'workflow_builder_build_workflow',
			args: { name: 'Image flow', sourceCode: 'export default workflow()' },
		});
		expect(outcome.workflowIds).toEqual(['wf-built-1']);
	});

	it('rebuilds an open card as a confirmation request without a result and without a finish', () => {
		const suspended: AgentPersistedMessageDto = {
			id: 'exec-2:assistant',
			role: 'assistant',
			executionId: 'exec-2',
			executionStatus: 'awaiting',
			createdAt: new Date(T0).toISOString(),
			content: [
				{
					type: 'tool-call',
					toolCallId: 'call-ask',
					toolName: 'ask_user',
					input: { questions: [] },
					suspendPayload: { requestId: 'req-1', inputType: 'questions', questions: [] },
					state: 'input-available',
					startTime: T0 + 10,
				},
			],
		};

		const events = eventsFromHistory([suspended]);

		expect(events.map((event) => event.type)).toEqual([
			'run-start',
			'tool-call',
			'confirmation-request',
		]);
		expect(events[2].data.payload).toEqual({
			requestId: 'req-1',
			inputType: 'questions',
			questions: [],
			toolCallId: 'call-ask',
			toolName: 'ask_user',
		});
	});

	it('keys a card without a request id by its tool call id', () => {
		const events = eventsFromHistory([
			{
				id: 'exec-3:assistant',
				role: 'assistant',
				executionId: 'exec-3',
				executionStatus: 'awaiting',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'call-approve',
						toolName: 'workflows_delete',
						suspendPayload: { message: 'Delete?' },
						startTime: T0,
					},
				],
			},
		]);

		expect(events.find((event) => event.type === 'confirmation-request')?.data.payload).toEqual(
			expect.objectContaining({ requestId: 'call-approve', toolCallId: 'call-approve' }),
		);
	});

	it('rebuilds each execution as its own run, and maps the settled status', () => {
		const events = eventsFromHistory([
			userMessage('u1', 'first', T0),
			{
				id: 'exec-a:assistant',
				role: 'assistant',
				executionId: 'exec-a',
				executionStatus: 'error',
				executionError: 'Provider overloaded',
				createdAt: new Date(T0 + 100).toISOString(),
				content: [],
			},
			userMessage('u2', 'again', T0 + 1_000),
			{
				id: 'exec-b:assistant',
				role: 'assistant',
				executionId: 'exec-b',
				executionStatus: 'cancelled',
				createdAt: new Date(T0 + 1_100).toISOString(),
				content: [{ type: 'text', text: 'Stopping.' }],
			},
			{
				id: 'exec-c:assistant',
				role: 'assistant',
				executionId: 'exec-c',
				executionStatus: 'running',
				createdAt: new Date(T0 + 2_000).toISOString(),
				content: [{ type: 'text', text: 'Working' }],
			},
		]);

		const finishes = events.filter((event) => event.type === 'run-finish');
		expect(finishes.map((event) => [event.data.runId, event.data.payload])).toEqual([
			['exec-a', { status: 'error', error: 'Provider overloaded' }],
			['exec-b', { status: 'cancelled' }],
		]);
		// A failed run also gets the run-level error event of Instance AI.
		expect(
			events
				.filter((event) => event.type === 'error')
				.map((event) => [event.data.runId, event.data.payload]),
		).toEqual([['exec-a', { content: 'Provider overloaded' }]]);
		expect(
			events.filter((event) => event.type === 'run-start').map((event) => event.data.runId),
		).toEqual(['exec-a', 'exec-b', 'exec-c']);
	});

	describe('a request that needs approval', () => {
		/** An execution that stopped at a card. A chat turn that suspends is saved as 'success'. */
		function suspendedTurn(
			executionId: string,
			at: number,
			answered = true,
		): AgentPersistedMessageDto {
			return {
				id: `${executionId}:assistant`,
				role: 'assistant',
				executionId,
				executionStatus: 'success',
				createdAt: new Date(at).toISOString(),
				content: [
					{ type: 'text', text: 'I need your approval.', startTime: at + 10 },
					{
						type: 'tool-call',
						toolCallId: `call-${executionId}`,
						toolName: 'workflows_delete',
						suspendPayload: { requestId: `req-${executionId}`, message: 'Delete?' },
						startTime: at + 20,
						// History merges the result of the resumed execution into the card's tool call.
						...(answered ? { output: { success: true }, endTime: at + 500 } : {}),
					},
				],
			};
		}

		const resumed = (executionId: string, at: number): AgentPersistedMessageDto => ({
			id: `${executionId}:assistant`,
			role: 'assistant',
			executionId,
			executionStatus: 'success',
			createdAt: new Date(at).toISOString(),
			content: [{ type: 'text', text: 'Deleted.', startTime: at + 10 }],
		});

		const runEvents = (events: CapturedEvent[], type: string) =>
			events.filter((event) => event.type === type).map((event) => event.data.runId);

		it('gives one run-start and one run-finish across the resumed execution', () => {
			const events = eventsFromHistory([
				userMessage('u1', 'Delete it', T0),
				suspendedTurn('exec-a', T0 + 100),
				resumed('exec-b', T0 + 1_000),
			]);

			expect(runEvents(events, 'run-start')).toEqual(['exec-a']);
			expect(runEvents(events, 'run-finish')).toEqual(['exec-b']);
			// Each execution keeps its run id, so the usage records still join.
			expect(new Set(events.map((event) => event.data.runId))).toEqual(
				new Set(['exec-a', 'exec-b']),
			);

			const metrics = buildConversationMetrics(events);
			expect(metrics.turnCount).toBe(1);
			expect(metrics.perTurn).toHaveLength(1);
			expect(metrics.perTurn[0]).toMatchObject({
				confirmationAskedTotal: 1,
				runFinishStatus: 'completed',
			});
			expect(metrics.reachedRunFinishCleanly).toBe(true);
		});

		it('still gives one turn for two approvals in a row', () => {
			const events = eventsFromHistory([
				userMessage('u1', 'Delete both', T0),
				suspendedTurn('exec-a', T0 + 100),
				suspendedTurn('exec-b', T0 + 1_000),
				resumed('exec-c', T0 + 2_000),
			]);

			expect(runEvents(events, 'run-start')).toEqual(['exec-a']);
			expect(runEvents(events, 'run-finish')).toEqual(['exec-c']);
			expect(buildConversationMetrics(events).turnCount).toBe(1);
		});

		it('gives no run-finish while the card is open', () => {
			const events: CapturedEvent[] = [];
			syncEventsFromHistory(events, {
				messages: [userMessage('u1', 'Delete it', T0), suspendedTurn('exec-a', T0 + 100, false)],
				openSuspensions: [{ toolCallId: 'call-exec-a', runId: 'run-a', suspendPayload: {} }],
				activeExecutionId: null,
			});

			expect(runEvents(events, 'run-start')).toEqual(['exec-a']);
			expect(runEvents(events, 'run-finish')).toEqual([]);
		});

		it('finishes the turn when the resumed execution wrote no message and the thread is settled', () => {
			const events: CapturedEvent[] = [];
			const messages = [userMessage('u1', 'Delete it', T0), suspendedTurn('exec-a', T0 + 100)];

			syncEventsFromHistory(events, { messages, openSuspensions: [], activeExecutionId: 'exec-b' });
			expect(runEvents(events, 'run-finish')).toEqual([]);

			syncEventsFromHistory(events, { messages, openSuspensions: [], activeExecutionId: null });
			expect(runEvents(events, 'run-finish')).toEqual(['exec-a']);
		});

		it('finishes the turn at the next user message when the resumed execution wrote no message', () => {
			const events = eventsFromHistory([
				userMessage('u1', 'Delete it', T0),
				suspendedTurn('exec-a', T0 + 100),
				userMessage('u2', 'Now rename it', T0 + 5_000),
				resumed('exec-c', T0 + 5_100),
			]);

			expect(runEvents(events, 'run-start')).toEqual(['exec-a', 'exec-c']);
			expect(runEvents(events, 'run-finish')).toEqual(['exec-a', 'exec-c']);
		});
	});

	it('skips seeded history: messages without an execution status', () => {
		const seeded: AgentPersistedMessageDto = {
			id: 'seed-2',
			role: 'assistant',
			createdAt: new Date(T0 - 60_000).toISOString(),
			content: [
				{ type: 'text', text: 'Here is your workflow.' },
				{
					type: 'tool-call',
					toolCallId: 'seed-call',
					toolName: 'workflow_builder_build_workflow',
					output: { workflowId: 'seed-wf' },
				},
			],
		};

		const events = eventsFromHistory([
			userMessage('seed-1', 'old', T0 - 61_000),
			seeded,
			buildTurn,
		]);

		expect(events.some((event) => event.data.runId === 'seed-2')).toBe(false);
		expect(new Set(events.map((event) => event.data.runId))).toEqual(new Set(['exec-1']));
	});
});

describe('syncEventsFromHistory', () => {
	it('keeps the user-turn markers and orders each turn after its marker', () => {
		const events: CapturedEvent[] = [marker('Build it', T0 + 500)];
		const followUp: AgentPersistedMessageDto = {
			id: 'exec-2:assistant',
			role: 'assistant',
			executionId: 'exec-2',
			executionStatus: 'success',
			createdAt: new Date(T0 + 20_000).toISOString(),
			content: [{ type: 'text', text: 'Renamed.', startTime: T0 + 20_100 }],
		};

		syncEventsFromHistory(events, { messages: [buildTurn] });
		events.push(marker('Rename it', T0 + 19_000));
		syncEventsFromHistory(events, { messages: [buildTurn, followUp] });

		const types = events.map(
			(event) => `${event.type}:${typeof event.data.runId === 'string' ? event.data.runId : ''}`,
		);
		expect(types[0]).toBe(`${USER_TURN_EVENT}:`);
		expect(types.indexOf(`${USER_TURN_EVENT}:`, 1)).toBe(types.indexOf('run-start:exec-2') - 1);
		// A second sync replaces the rebuilt events instead of adding to them.
		expect(events.filter((event) => event.type === 'run-start')).toHaveLength(2);

		const transcript = buildTranscriptFromEvents({ events, openingMessage: 'Build it' });
		expect(transcript.map((turn) => [turn.userMessage, turn.runIds])).toEqual([
			['Build it', ['exec-1']],
			['Rename it', ['exec-2']],
		]);
	});
});

describe('runDebugFromUsage', () => {
	const usage: AgentThreadUsageResponse = {
		executions: [
			{
				executionId: 'exec-1',
				threadId: 'thread-1',
				parentExecutionId: null,
				status: 'success',
				model: 'anthropic/claude-sonnet',
				startedAt: new Date(T0).toISOString(),
				stoppedAt: new Date(T0 + 5_000).toISOString(),
				duration: 5_000,
				promptTokens: 1_000,
				completionTokens: 100,
				totalTokens: 1_100,
				cacheReadTokens: 800,
				cacheWriteTokens: 50,
				cost: 0.01,
				descendants: [],
				total: {
					promptTokens: 1_500,
					completionTokens: 150,
					totalTokens: 1_650,
					cacheReadTokens: 900,
					cacheWriteTokens: 60,
					cost: 0.02,
				},
			},
		],
		total: {
			promptTokens: 1_500,
			completionTokens: 150,
			totalTokens: 1_650,
			cacheReadTokens: 900,
			cacheWriteTokens: 60,
			cost: 0.02,
		},
	};

	it('gives one record per turn with the turn total, joined to the transcript by run id', () => {
		const runDebug = runDebugFromUsage('thread-1', usage);

		expect(runDebug).toHaveLength(1);
		expect(runDebug[0]).toMatchObject({
			threadId: 'thread-1',
			runId: 'exec-1',
			startedAt: T0,
			workflowCode: [],
		});

		const transcript = buildTranscriptFromEvents({
			events: [marker('Build it', T0 + 500), ...eventsFromHistory([buildTurn])],
			openingMessage: 'Build it',
		});
		expect(transcriptAsText(transcript, runDebug)).toContain(
			'(1 step, 1500 tokens in [900 cached], 150 tokens out)',
		);
	});
});
