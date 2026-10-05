import type { ExecuteResumableStreamResult } from '../../../src/runtime/resumable-stream-executor';
import { resolveStreamStatus } from '../stream-status';

function streamResult(
	overrides: Partial<ExecuteResumableStreamResult> = {},
): ExecuteResumableStreamResult {
	return {
		status: 'completed',
		agentRunId: 'run-1',
		workSummary: {
			toolCalls: [],
			totalToolCalls: 0,
			totalToolErrors: 0,
			askedClarifyingQuestion: false,
		},
		...overrides,
	};
}

describe('resolveStreamStatus', () => {
	it('reports a clean finish as completed', () => {
		expect(resolveStreamStatus(streamResult({ finishReason: 'stop' }), false)).toBe('completed');
	});

	it('reports a run that hit its step cap as step-exhausted', () => {
		expect(resolveStreamStatus(streamResult({ finishReason: 'max-iterations' }), false)).toBe(
			'step-exhausted',
		);
	});

	it.each(['length', 'content-filter', 'error', 'other', 'tool-calls'] as const)(
		'reports a run cut short by %s as errored',
		(finishReason) => {
			expect(resolveStreamStatus(streamResult({ finishReason }), false)).toBe('errored');
		},
	);

	it('never reads a missing finish chunk as a clean finish', () => {
		expect(resolveStreamStatus(streamResult(), false)).toBe('errored');
	});

	it('prefers timed-out over the step cap', () => {
		expect(resolveStreamStatus(streamResult({ finishReason: 'max-iterations' }), true)).toBe(
			'timed-out',
		);
	});

	it('prefers errored over the step cap', () => {
		expect(
			resolveStreamStatus(
				streamResult({ status: 'errored', finishReason: 'max-iterations' }),
				false,
			),
		).toBe('errored');
	});

	it('reports the budget sentinel as timed-out', () => {
		expect(resolveStreamStatus('timed-out', false)).toBe('timed-out');
	});

	it.each([streamResult({ status: 'suspended' }), streamResult({ finishReason: 'paused' })])(
		'reports a suspended or paused run as suspended',
		(result) => {
			expect(resolveStreamStatus(result, false)).toBe('suspended');
		},
	);

	it('never reads a cancelled run as a clean finish', () => {
		expect(resolveStreamStatus(streamResult({ status: 'cancelled' }), false)).toBe('timed-out');
	});

	it('reports a run ended at its committing call as stopped-on-route', () => {
		expect(resolveStreamStatus(streamResult({ status: 'cancelled' }), true, true)).toBe(
			'stopped-on-route',
		);
	});

	it('prefers stopped-on-route over a budget that expired during the stop', () => {
		expect(resolveStreamStatus('timed-out', true, true)).toBe('stopped-on-route');
	});
});
