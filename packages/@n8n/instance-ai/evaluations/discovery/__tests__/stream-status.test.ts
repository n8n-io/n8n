import type { ExecuteResumableStreamResult } from '../../../src/runtime/resumable-stream-executor';
import { resolveStreamStatus } from '../stream-status';

function streamResult(
	overrides: Partial<ExecuteResumableStreamResult> = {},
): ExecuteResumableStreamResult {
	return {
		status: 'completed',
		agentRunId: 'run-1',
		workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
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

	it('reports a suspended run as suspended', () => {
		expect(resolveStreamStatus(streamResult({ status: 'suspended' }), false)).toBe('suspended');
	});

	it('never reads a cancelled run as a clean finish', () => {
		expect(resolveStreamStatus(streamResult({ status: 'cancelled' }), false)).toBe('timed-out');
	});
});
