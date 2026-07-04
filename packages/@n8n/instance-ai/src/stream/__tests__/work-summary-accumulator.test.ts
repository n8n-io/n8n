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

function toolResultEvent(toolCallId: string): InstanceAiEvent {
	return {
		type: 'tool-result',
		runId: 'run-1',
		agentId: 'agent-1',
		payload: { toolCallId, result: 'ok' },
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

function textDeltaEvent(text: string): InstanceAiEvent {
	return {
		type: 'text-delta',
		runId: 'run-1',
		agentId: 'agent-1',
		payload: { text },
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

	it('tracks text segments split on tool-call boundaries', () => {
		const accumulator = new WorkSummaryAccumulator();
		accumulator.observe(textDeltaEvent('First summary. '));
		accumulator.observe(toolCallEvent('tc-1', 'list-workflows'));
		accumulator.observe(toolResultEvent('tc-1'));
		accumulator.observe(textDeltaEvent('Final summary.'));

		const summary = accumulator.toSummary();
		expect(summary.lastTextSummary).toBe('Final summary.');
	});

	it('returns the only text segment when no tools were called', () => {
		const accumulator = new WorkSummaryAccumulator();
		accumulator.observe(textDeltaEvent('Only summary.'));

		const summary = accumulator.toSummary();
		expect(summary.lastTextSummary).toBe('Only summary.');
	});

	it('ignores non-tool events except text-delta', () => {
		const accumulator = new WorkSummaryAccumulator();
		accumulator.observe(textDeltaEvent('hello'));
		accumulator.observe({
			type: 'reasoning-delta',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: { text: 'thinking' },
		});

		const summary = accumulator.toSummary();
		expect(summary.totalToolCalls).toBe(0);
		expect(summary.lastTextSummary).toBe('hello');
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
});
