import {
	buildConversationMetrics,
	buildMetrics,
	extractOutcomeFromEvents,
	mergeSeededConversationMetrics,
	seededTurnCounters,
} from '../outcome/event-parser';
import type { CapturedEvent, ConversationMetrics, TranscriptTurn } from '../types';

// ---------------------------------------------------------------------------
// extractOutcomeFromEvents
// ---------------------------------------------------------------------------

describe('extractOutcomeFromEvents', () => {
	it('returns empty outcome for no events', () => {
		const result = extractOutcomeFromEvents([]);
		expect(result.workflowIds).toEqual([]);
		expect(result.executionIds).toEqual([]);
		expect(result.dataTableIds).toEqual([]);
		expect(result.finalText).toBe('');
		expect(result.toolCalls).toEqual([]);
		expect(result.agentActivities).toEqual([]);
	});

	it('collects text from text-delta events', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1000, type: 'text-delta', data: { type: 'text-delta', text: 'Hello ' } },
			{ timestamp: 1001, type: 'text-delta', data: { type: 'text-delta', text: 'World' } },
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.finalText).toBe('Hello World');
	});

	it('extracts text from payload field', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1000,
				type: 'text-delta',
				data: { type: 'text-delta', payload: { text: 'nested text' } },
			},
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.finalText).toBe('nested text');
	});

	it('tracks tool calls with duration', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1000,
				type: 'tool-call',
				data: {
					type: 'tool-call',
					payload: {
						toolCallId: 'tc-1',
						toolName: 'build-workflow',
						args: { name: 'Test' },
					},
				},
			},
			{
				timestamp: 1500,
				type: 'tool-result',
				data: {
					type: 'tool-result',
					payload: {
						toolCallId: 'tc-1',
						toolName: 'build-workflow',
						result: { workflowId: 'wf-123' },
					},
				},
			},
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.toolCalls).toHaveLength(1);
		expect(result.toolCalls[0].toolName).toBe('build-workflow');
		expect(result.toolCalls[0].durationMs).toBe(500);
		expect(result.workflowIds).toContain('wf-123');
	});

	it('extracts workflow IDs from known tool results', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1000,
				type: 'tool-call',
				data: {
					type: 'tool-call',
					payload: { toolCallId: 'tc-1', toolName: 'submit-workflow', args: {} },
				},
			},
			{
				timestamp: 1100,
				type: 'tool-result',
				data: {
					type: 'tool-result',
					payload: { toolCallId: 'tc-1', result: { id: 'wf-456' } },
				},
			},
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.workflowIds).toContain('wf-456');
	});

	it('extracts execution IDs from run-workflow results', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1000,
				type: 'tool-call',
				data: {
					type: 'tool-call',
					payload: { toolCallId: 'tc-1', toolName: 'run-workflow', args: {} },
				},
			},
			{
				timestamp: 1100,
				type: 'tool-result',
				data: {
					type: 'tool-result',
					payload: {
						toolCallId: 'tc-1',
						toolName: 'run-workflow',
						result: { executionId: 'exec-789' },
					},
				},
			},
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.executionIds).toContain('exec-789');
	});

	it('extracts data table IDs from create-data-table results', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1000,
				type: 'tool-call',
				data: {
					type: 'tool-call',
					payload: { toolCallId: 'tc-1', toolName: 'create-data-table', args: {} },
				},
			},
			{
				timestamp: 1100,
				type: 'tool-result',
				data: {
					type: 'tool-result',
					payload: {
						toolCallId: 'tc-1',
						toolName: 'create-data-table',
						result: { dataTableId: 'dt-001' },
					},
				},
			},
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.dataTableIds).toContain('dt-001');
	});

	it('captures tool errors', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1000,
				type: 'tool-call',
				data: {
					type: 'tool-call',
					payload: { toolCallId: 'tc-err', toolName: 'build-workflow', args: {} },
				},
			},
			{
				timestamp: 1200,
				type: 'tool-error',
				data: {
					type: 'tool-error',
					payload: { toolCallId: 'tc-err', error: 'Something went wrong' },
				},
			},
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.toolCalls).toHaveLength(1);
		expect(result.toolCalls[0].error).toBe('Something went wrong');
		expect(result.toolCalls[0].durationMs).toBe(200);
	});

	it('tracks agent activities', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1000,
				type: 'agent-spawned',
				data: {
					type: 'agent-spawned',
					agentId: 'agent-1',
					payload: { agentId: 'agent-1', role: 'builder', parentId: 'root' },
				},
			},
			{
				timestamp: 2000,
				type: 'agent-completed',
				data: {
					type: 'agent-completed',
					agentId: 'agent-1',
					payload: { agentId: 'agent-1', status: 'completed', result: 'Done' },
				},
			},
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.agentActivities).toHaveLength(1);
		expect(result.agentActivities[0].role).toBe('builder');
		expect(result.agentActivities[0].status).toBe('completed');
	});

	it('deduplicates resource IDs', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1000,
				type: 'tool-call',
				data: {
					type: 'tool-call',
					payload: { toolCallId: 'tc-1', toolName: 'build-workflow', args: {} },
				},
			},
			{
				timestamp: 1100,
				type: 'tool-result',
				data: {
					type: 'tool-result',
					payload: { toolCallId: 'tc-1', result: { workflowId: 'wf-1' } },
				},
			},
			{
				timestamp: 1200,
				type: 'tool-call',
				data: {
					type: 'tool-call',
					payload: { toolCallId: 'tc-2', toolName: 'patch-workflow', args: {} },
				},
			},
			{
				timestamp: 1300,
				type: 'tool-result',
				data: {
					type: 'tool-result',
					payload: { toolCallId: 'tc-2', result: { workflowId: 'wf-1' } },
				},
			},
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.workflowIds).toEqual(['wf-1']);
	});
});

// ---------------------------------------------------------------------------
// buildMetrics
// ---------------------------------------------------------------------------

describe('buildMetrics', () => {
	const startTime = 1000;

	it('returns zero metrics for no events', () => {
		const metrics = buildMetrics([], startTime);
		expect(metrics.totalTimeMs).toBe(0);
		expect(metrics.timeToFirstTextMs).toBe(0);
		expect(metrics.timeToRunFinishMs).toBe(0);
		expect(metrics.totalToolCalls).toBe(0);
		expect(metrics.subAgentsSpawned).toBe(0);
		expect(metrics.confirmationRequests).toBe(0);
	});

	it('computes time to first text', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1500, type: 'tool-call', data: { type: 'tool-call' } },
			{ timestamp: 2000, type: 'text-delta', data: { type: 'text-delta', text: 'hi' } },
			{ timestamp: 2500, type: 'text-delta', data: { type: 'text-delta', text: ' there' } },
		];

		const metrics = buildMetrics(events, startTime);
		expect(metrics.timeToFirstTextMs).toBe(1000); // 2000 - 1000
	});

	it('counts tool calls', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1100, type: 'tool-call', data: { type: 'tool-call' } },
			{ timestamp: 1200, type: 'tool-call', data: { type: 'tool-call' } },
			{ timestamp: 1300, type: 'tool-call', data: { type: 'tool-call' } },
		];

		const metrics = buildMetrics(events, startTime);
		expect(metrics.totalToolCalls).toBe(3);
	});

	it('counts sub-agents spawned', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1100,
				type: 'agent-spawned',
				data: { type: 'agent-spawned', agentId: 'a1', payload: { agentId: 'a1', role: 'builder' } },
			},
			{
				timestamp: 1200,
				type: 'agent-spawned',
				data: {
					type: 'agent-spawned',
					agentId: 'a2',
					payload: { agentId: 'a2', role: 'data-table-manager' },
				},
			},
		];

		const metrics = buildMetrics(events, startTime);
		expect(metrics.subAgentsSpawned).toBe(2);
	});

	it('counts confirmation requests', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1100, type: 'confirmation-request', data: { type: 'confirmation-request' } },
		];

		const metrics = buildMetrics(events, startTime);
		expect(metrics.confirmationRequests).toBe(1);
	});

	it('captures time to run finish', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1100, type: 'tool-call', data: { type: 'tool-call' } },
			{ timestamp: 3000, type: 'run-finish', data: { type: 'run-finish' } },
		];

		const metrics = buildMetrics(events, startTime);
		expect(metrics.timeToRunFinishMs).toBe(2000); // 3000 - 1000
	});

	it('computes total time from last event', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1100, type: 'tool-call', data: { type: 'tool-call' } },
			{ timestamp: 5000, type: 'run-finish', data: { type: 'run-finish' } },
		];

		const metrics = buildMetrics(events, startTime);
		expect(metrics.totalTimeMs).toBe(4000); // 5000 - 1000
	});
});

// ---------------------------------------------------------------------------
// buildConversationMetrics — per-turn counters
// ---------------------------------------------------------------------------

describe('buildConversationMetrics', () => {
	it('returns empty metrics for no events', () => {
		const result = buildConversationMetrics([]);
		expect(result.turnCount).toBe(0);
		expect(result.perTurn).toEqual([]);
		expect(result.confirmationAskedTotal).toBe(0);
		expect(result.confirmationAskedByKind).toEqual({});
		expect(result.reachedRunFinishCleanly).toBe(false);
	});

	it('segments a single turn and counts tool calls + errors', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1, type: 'run-start', data: { type: 'run-start' } },
			{
				timestamp: 2,
				type: 'tool-call',
				data: { type: 'tool-call', payload: { toolName: 'foo' } },
			},
			{ timestamp: 3, type: 'tool-error', data: { type: 'tool-error' } },
			{
				timestamp: 4,
				type: 'tool-call',
				data: { type: 'tool-call', payload: { toolName: 'bar' } },
			},
			{
				timestamp: 5,
				type: 'run-finish',
				data: { type: 'run-finish', payload: { status: 'completed' } },
			},
		];

		const result = buildConversationMetrics(events);
		expect(result.turnCount).toBe(1);
		expect(result.perTurn).toHaveLength(1);
		expect(result.perTurn[0].turn).toBe(1);
		expect(result.perTurn[0].toolCallCount).toBe(2);
		expect(result.perTurn[0].toolErrorCount).toBe(1);
		expect(result.perTurn[0].runFinishStatus).toBe('completed');
		expect(result.reachedRunFinishCleanly).toBe(true);
	});

	it('segments multiple turns by run-start boundaries', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1, type: 'run-start', data: { type: 'run-start' } },
			{
				timestamp: 2,
				type: 'tool-call',
				data: { type: 'tool-call', payload: { toolName: 'a' } },
			},
			{
				timestamp: 3,
				type: 'run-finish',
				data: { type: 'run-finish', payload: { status: 'completed' } },
			},
			{ timestamp: 4, type: 'run-start', data: { type: 'run-start' } },
			{
				timestamp: 5,
				type: 'tool-call',
				data: { type: 'tool-call', payload: { toolName: 'b' } },
			},
			{
				timestamp: 6,
				type: 'tool-call',
				data: { type: 'tool-call', payload: { toolName: 'c' } },
			},
			{
				timestamp: 7,
				type: 'run-finish',
				data: { type: 'run-finish', payload: { status: 'completed' } },
			},
		];

		const result = buildConversationMetrics(events);
		expect(result.turnCount).toBe(2);
		expect(result.perTurn).toHaveLength(2);
		expect(result.perTurn[0].toolCallCount).toBe(1);
		expect(result.perTurn[1].toolCallCount).toBe(2);
	});

	it('groups confirmations by inputType', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1, type: 'run-start', data: { type: 'run-start' } },
			{
				timestamp: 2,
				type: 'confirmation-request',
				data: {
					type: 'confirmation-request',
					payload: { requestId: 'r1', inputType: 'questions' },
				},
			},
			{
				timestamp: 3,
				type: 'confirmation-request',
				data: {
					type: 'confirmation-request',
					payload: { requestId: 'r2', inputType: 'plan-review' },
				},
			},
			{
				timestamp: 4,
				type: 'confirmation-request',
				data: {
					type: 'confirmation-request',
					payload: { requestId: 'r3', inputType: 'questions' },
				},
			},
			{
				timestamp: 5,
				type: 'run-finish',
				data: { type: 'run-finish', payload: { status: 'completed' } },
			},
		];

		const result = buildConversationMetrics(events);
		expect(result.confirmationAskedTotal).toBe(3);
		expect(result.confirmationAskedByKind).toEqual({ questions: 2, 'plan-review': 1 });
		expect(result.perTurn[0].confirmationAskedTotal).toBe(3);
		expect(result.perTurn[0].confirmationAskedByKind).toEqual({
			questions: 2,
			'plan-review': 1,
		});
	});

	it('defaults inputType to "approval" when omitted', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1, type: 'run-start', data: { type: 'run-start' } },
			{
				timestamp: 2,
				type: 'confirmation-request',
				data: { type: 'confirmation-request', payload: { requestId: 'r1' } },
			},
			{ timestamp: 3, type: 'run-finish', data: { type: 'run-finish' } },
		];

		const result = buildConversationMetrics(events);
		expect(result.confirmationAskedByKind).toEqual({ approval: 1 });
	});

	it('detects repeat questions by requestId across turns', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1, type: 'run-start', data: { type: 'run-start' } },
			{
				timestamp: 2,
				type: 'confirmation-request',
				data: {
					type: 'confirmation-request',
					payload: { requestId: 'shared', inputType: 'questions' },
				},
			},
			{ timestamp: 3, type: 'run-finish', data: { type: 'run-finish' } },
			{ timestamp: 4, type: 'run-start', data: { type: 'run-start' } },
			{
				timestamp: 5,
				type: 'confirmation-request',
				data: {
					type: 'confirmation-request',
					payload: { requestId: 'shared', inputType: 'questions' },
				},
			},
			{ timestamp: 6, type: 'run-finish', data: { type: 'run-finish' } },
		];

		const result = buildConversationMetrics(events);
		expect(result.perTurn[0].repeatQuestionCount).toBe(0);
		expect(result.perTurn[1].repeatQuestionCount).toBe(1);
	});

	it('counts replan_after_error when a tool-error is followed by tasks-update in the same turn', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1, type: 'run-start', data: { type: 'run-start' } },
			{ timestamp: 2, type: 'tool-error', data: { type: 'tool-error' } },
			{ timestamp: 3, type: 'tasks-update', data: { type: 'tasks-update' } },
			{ timestamp: 4, type: 'run-finish', data: { type: 'run-finish' } },
		];

		const result = buildConversationMetrics(events);
		expect(result.perTurn[0].replanAfterErrorCount).toBe(1);
	});

	it('counts replan_after_error when a tool-error is followed by create-tasks', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1, type: 'run-start', data: { type: 'run-start' } },
			{ timestamp: 2, type: 'tool-error', data: { type: 'tool-error' } },
			{
				timestamp: 3,
				type: 'tool-call',
				data: { type: 'tool-call', payload: { toolName: 'create-tasks' } },
			},
			{ timestamp: 4, type: 'run-finish', data: { type: 'run-finish' } },
		];

		const result = buildConversationMetrics(events);
		expect(result.perTurn[0].replanAfterErrorCount).toBe(1);
	});

	it('does NOT count replan_after_error when the recovery is in a previous turn', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1, type: 'run-start', data: { type: 'run-start' } },
			{ timestamp: 2, type: 'tasks-update', data: { type: 'tasks-update' } },
			{ timestamp: 3, type: 'run-finish', data: { type: 'run-finish' } },
			{ timestamp: 4, type: 'run-start', data: { type: 'run-start' } },
			{ timestamp: 5, type: 'tool-error', data: { type: 'tool-error' } },
			{ timestamp: 6, type: 'run-finish', data: { type: 'run-finish' } },
		];

		const result = buildConversationMetrics(events);
		expect(result.perTurn[1].replanAfterErrorCount).toBe(0);
	});

	it('marks reachedRunFinishCleanly false when the last run-finish is not completed', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1, type: 'run-start', data: { type: 'run-start' } },
			{
				timestamp: 2,
				type: 'run-finish',
				data: { type: 'run-finish', payload: { status: 'completed' } },
			},
			{ timestamp: 3, type: 'run-start', data: { type: 'run-start' } },
			{
				timestamp: 4,
				type: 'run-finish',
				data: { type: 'run-finish', payload: { status: 'cancelled' } },
			},
		];

		const result = buildConversationMetrics(events);
		expect(result.reachedRunFinishCleanly).toBe(false);
		expect(result.perTurn[1].runFinishStatus).toBe('cancelled');
	});
});

// ---------------------------------------------------------------------------
// seededTurnCounters / mergeSeededConversationMetrics
// ---------------------------------------------------------------------------

const seededTurn = (steps: TranscriptTurn['steps']): TranscriptTurn => ({ steps, seeded: true });

describe('seededTurnCounters', () => {
	it('counts tool-call steps and their errors', () => {
		const [counter] = seededTurnCounters([
			seededTurn([
				{ kind: 'tool-call', toolName: 'a' },
				{ kind: 'tool-call', toolName: 'b', error: 'boom' },
			]),
		]);
		expect(counter).toMatchObject({ toolCallCount: 2, toolErrorCount: 1 });
	});

	it('counts a plan step as a tool call', () => {
		const [counter] = seededTurnCounters([seededTurn([{ kind: 'plan', tasks: [] }])]);
		expect(counter.toolCallCount).toBe(1);
	});

	it('dual-counts ask-user as a tool call and a questions confirmation (mirrors live)', () => {
		const [counter] = seededTurnCounters([seededTurn([{ kind: 'ask-user', questions: [] }])]);
		expect(counter.toolCallCount).toBe(1);
		expect(counter.confirmationAskedTotal).toBe(1);
		expect(counter.confirmationAskedByKind).toEqual({ questions: 1 });
	});

	it('counts setup-card as a tool call and a setup confirmation', () => {
		const [counter] = seededTurnCounters([
			seededTurn([{ kind: 'setup-card', requests: [], outcome: 'pending' }]),
		]);
		expect(counter.toolCallCount).toBe(1);
		expect(counter.confirmationAskedByKind).toEqual({ setup: 1 });
	});

	it('counts a confirmation as a tool call, keyed by its resumeReason', () => {
		const [counter] = seededTurnCounters([
			seededTurn([{ kind: 'confirmation', toolName: 'workflows', resumeReason: 'plan-review' }]),
		]);
		expect(counter.toolCallCount).toBe(1);
		expect(counter.confirmationAskedTotal).toBe(1);
		expect(counter.confirmationAskedByKind).toEqual({ 'plan-review': 1 });
	});

	it('counts setup-wizard as a tool call, ignores agent-text, leaves non-derivable counters at default', () => {
		const [counter] = seededTurnCounters([
			seededTurn([
				{ kind: 'agent-text', text: 'hello' },
				{ kind: 'setup-wizard', completedNodes: [], skippedNodes: [] },
			]),
		]);
		expect(counter.toolCallCount).toBe(1); // setup-wizard is a tool call; agent-text is not
		expect(counter.confirmationAskedTotal).toBe(0);
		expect(counter.replanAfterErrorCount).toBe(0);
		expect(counter.repeatQuestionCount).toBe(0);
		expect(counter.runFinishStatus).toBeUndefined();
	});

	it('returns one counter per turn (numbered) and [] for no turns', () => {
		expect(seededTurnCounters([])).toEqual([]);
		expect(seededTurnCounters([seededTurn([]), seededTurn([])]).map((c) => c.turn)).toEqual([1, 2]);
	});
});

describe('mergeSeededConversationMetrics', () => {
	const live: ConversationMetrics = {
		turnCount: 1,
		perTurn: [
			{
				turn: 1,
				toolCallCount: 3,
				toolErrorCount: 0,
				confirmationAskedTotal: 2,
				confirmationAskedByKind: { questions: 2 },
				replanAfterErrorCount: 0,
				repeatQuestionCount: 0,
				runFinishStatus: 'completed',
			},
		],
		confirmationAskedTotal: 2,
		confirmationAskedByKind: { questions: 2 },
		reachedRunFinishCleanly: true,
	};

	it('prepends seeded turns, renumbers, sums aggregates, and preserves the live finish status', () => {
		const seeded: TranscriptTurn[] = [
			seededTurn([{ kind: 'ask-user', questions: [] }]),
			seededTurn([{ kind: 'setup-card', requests: [], outcome: 'pending' }]),
		];
		const merged = mergeSeededConversationMetrics(seeded, live);
		expect(merged.perTurn.map((c) => c.turn)).toEqual([1, 2, 3]);
		expect(merged.turnCount).toBe(3); // 2 seeded + live turnCount 1
		expect(merged.confirmationAskedTotal).toBe(4); // seeded 2 + live 2
		expect(merged.confirmationAskedByKind).toEqual({ questions: 3, setup: 1 });
		expect(merged.reachedRunFinishCleanly).toBe(true);
		// The live turn is last, unchanged apart from its new turn number.
		expect(merged.perTurn[2]).toMatchObject({
			turn: 3,
			toolCallCount: 3,
			runFinishStatus: 'completed',
		});
	});

	it('preserves a false live finish status regardless of seeded content', () => {
		const merged = mergeSeededConversationMetrics(
			[seededTurn([{ kind: 'agent-text', text: 'x' }])],
			{
				...live,
				reachedRunFinishCleanly: false,
			},
		);
		expect(merged.reachedRunFinishCleanly).toBe(false);
	});

	it('an empty seeded prefix yields metrics deep-equal to the live metrics (no live regression)', () => {
		expect(mergeSeededConversationMetrics([], live)).toEqual(live);
	});

	it('does not mutate the passed-in live metrics', () => {
		mergeSeededConversationMetrics([seededTurn([{ kind: 'ask-user', questions: [] }])], live);
		expect(live.perTurn[0].turn).toBe(1);
		expect(live.confirmationAskedByKind).toEqual({ questions: 2 });
		expect(live.turnCount).toBe(1);
	});
});
