import type { InstanceAiEvent } from '@n8n/api-types';

import { WorkSummaryAccumulator } from '../work-summary-accumulator';

function toolCallEvent(toolCallId: string, toolName: string): InstanceAiEvent {
	return {
		type: 'tool-call',
		runId: 'run-1',
		agentId: 'agent-1',
		payload: { toolCallId, toolName, args: {} },
	};
}

function toolCallWithArgs(
	toolCallId: string,
	toolName: string,
	args: Record<string, unknown>,
): Extract<InstanceAiEvent, { type: 'tool-call' }> {
	return {
		type: 'tool-call',
		runId: 'run-1',
		agentId: 'agent-1',
		payload: { toolCallId, toolName, args },
	};
}

function confirmationEvent(
	inputType?: 'questions' | 'text' | 'approval',
): Extract<InstanceAiEvent, { type: 'confirmation-request' }> {
	return {
		type: 'confirmation-request',
		runId: 'run-1',
		agentId: 'agent-1',
		payload: {
			requestId: 'req-1',
			toolCallId: 'tc-1',
			toolName: 'ask',
			args: {},
			severity: 'info',
			message: 'which one?',
			...(inputType ? { inputType } : {}),
		},
	};
}

function toolResultEvent(toolCallId: string, result: unknown = 'ok'): InstanceAiEvent {
	return {
		type: 'tool-result',
		runId: 'run-1',
		agentId: 'agent-1',
		payload: { toolCallId, result },
	};
}

function toolErrorEvent(toolCallId: string, error: string): InstanceAiEvent {
	return {
		type: 'tool-error',
		runId: 'run-1',
		agentId: 'agent-1',
		payload: { toolCallId, error },
	};
}

describe('WorkSummaryAccumulator', () => {
	it('returns empty summary when no events observed', () => {
		const accumulator = new WorkSummaryAccumulator();
		const summary = accumulator.toSummary();
		expect(summary.totalToolCalls).toBe(0);
		expect(summary.totalToolErrors).toBe(0);
		expect(summary.toolCalls).toEqual([]);
	});

	it('tracks a successful tool call', () => {
		const accumulator = new WorkSummaryAccumulator();
		accumulator.observe(toolCallEvent('tc-1', 'list-workflows'));
		accumulator.observe(toolResultEvent('tc-1'));

		const summary = accumulator.toSummary();
		expect(summary.totalToolCalls).toBe(1);
		expect(summary.totalToolErrors).toBe(0);
		expect(summary.toolCalls).toEqual([
			{ toolCallId: 'tc-1', toolName: 'list-workflows', succeeded: true },
		]);
	});

	it('retains a semantic config mutation marker from the tool result', () => {
		const accumulator = new WorkSummaryAccumulator();
		accumulator.observe(toolCallEvent('tc-1', 'update_skill'));
		accumulator.observe(toolResultEvent('tc-1', { ok: true, configMutated: true }));

		expect(accumulator.toSummary().toolCalls).toEqual([
			{
				toolCallId: 'tc-1',
				toolName: 'update_skill',
				succeeded: true,
				configMutated: true,
			},
		]);
	});

	it('tracks a failed tool call', () => {
		const accumulator = new WorkSummaryAccumulator();
		accumulator.observe(toolCallEvent('tc-1', 'get-workflow'));
		accumulator.observe(toolErrorEvent('tc-1', 'Not found'));

		const summary = accumulator.toSummary();
		expect(summary.totalToolCalls).toBe(1);
		expect(summary.totalToolErrors).toBe(1);
		expect(summary.toolCalls[0]).toMatchObject({
			toolCallId: 'tc-1',
			toolName: 'get-workflow',
			succeeded: false,
			errorSummary: 'Not found',
		});
	});

	it('tracks multiple tool calls with mixed outcomes', () => {
		const accumulator = new WorkSummaryAccumulator();
		accumulator.observe(toolCallEvent('tc-1', 'list-workflows'));
		accumulator.observe(toolResultEvent('tc-1'));
		accumulator.observe(toolCallEvent('tc-2', 'build-workflow'));
		accumulator.observe(toolErrorEvent('tc-2', 'Compilation error'));
		accumulator.observe(toolCallEvent('tc-3', 'list-credentials'));
		accumulator.observe(toolResultEvent('tc-3'));

		const summary = accumulator.toSummary();
		expect(summary.totalToolCalls).toBe(3);
		expect(summary.totalToolErrors).toBe(1);
	});

	it('ignores non-tool events', () => {
		const accumulator = new WorkSummaryAccumulator();
		accumulator.observe({
			type: 'text-delta',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: { text: 'hello' },
		});

		const summary = accumulator.toSummary();
		expect(summary.totalToolCalls).toBe(0);
	});

	it('is idempotent — multiple toSummary calls return same data', () => {
		const accumulator = new WorkSummaryAccumulator();
		accumulator.observe(toolCallEvent('tc-1', 'list-workflows'));
		accumulator.observe(toolResultEvent('tc-1'));

		const summary1 = accumulator.toSummary();
		const summary2 = accumulator.toSummary();
		expect(summary1).toEqual(summary2);
	});

	it('truncates long error summaries to 500 chars', () => {
		const accumulator = new WorkSummaryAccumulator();
		accumulator.observe(toolCallEvent('tc-1', 'build-workflow'));
		accumulator.observe(toolErrorEvent('tc-1', 'x'.repeat(1000)));

		const summary = accumulator.toSummary();
		expect(summary.toolCalls[0].errorSummary).toHaveLength(500);
	});

	it('de-duplicates by toolCallId (keeps latest outcome)', () => {
		const accumulator = new WorkSummaryAccumulator();
		// First attempt: fails
		accumulator.observe(toolCallEvent('tc-1', 'build-workflow'));
		accumulator.observe(toolErrorEvent('tc-1', 'Failed'));
		// Resumed stream replays the same toolCallId as succeeded
		accumulator.observe(toolCallEvent('tc-1', 'build-workflow'));
		accumulator.observe(toolResultEvent('tc-1'));

		const summary = accumulator.toSummary();
		expect(summary.totalToolCalls).toBe(1);
		expect(summary.toolCalls[0].succeeded).toBe(true);
	});

	/**
	 * Several tools are one name over a discriminated union, so the name alone cannot say
	 * what was asked for — the rung derivation reads the action to tell them apart.
	 */
	it("records a call's action", () => {
		const accumulator = new WorkSummaryAccumulator();
		accumulator.observe(toolCallWithArgs('tc-1', 'activity', { action: 'expand', id: 7 }));

		expect(accumulator.toSummary().toolCalls[0].action).toBe('expand');
	});

	it('leaves the action unset for a call that has none', () => {
		const accumulator = new WorkSummaryAccumulator();
		accumulator.observe(toolCallEvent('tc-1', 'list-workflows'));

		expect(accumulator.toSummary().toolCalls[0].action).toBeUndefined();
	});

	it('leaves the action unset when it is not a string', () => {
		const accumulator = new WorkSummaryAccumulator();
		accumulator.observe(toolCallWithArgs('tc-1', 'activity', { action: 42 }));

		expect(accumulator.toSummary().toolCalls[0].action).toBeUndefined();
	});

	it('reports no clarifying question by default', () => {
		expect(new WorkSummaryAccumulator().toSummary().askedClarifyingQuestion).toBe(false);
	});

	it.each(['questions', 'text'] as const)(
		'reports a clarifying question for a %s confirmation',
		(inputType) => {
			const accumulator = new WorkSummaryAccumulator();
			accumulator.observe(confirmationEvent(inputType));

			expect(accumulator.toSummary().askedClarifyingQuestion).toBe(true);
		},
	);

	/**
	 * An approval prompt is the agent saying what it is about to do. That is not the same
	 * act as not knowing, and counting it would inflate the number the rollout is judged on.
	 */
	it.each([['approval' as const], [undefined]])(
		'does not count a %s confirmation as a clarifying question',
		(inputType) => {
			const accumulator = new WorkSummaryAccumulator();
			accumulator.observe(confirmationEvent(inputType));

			expect(accumulator.toSummary().askedClarifyingQuestion).toBe(false);
		},
	);
});
