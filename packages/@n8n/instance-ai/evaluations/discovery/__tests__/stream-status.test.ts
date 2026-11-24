import { resolveStreamStatus } from '../stream-status';
import type { StreamTurnResult } from '../stream-turn';

function streamResult(overrides: Partial<StreamTurnResult> = {}): StreamTurnResult {
	return { status: 'completed', ...overrides };
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

	it('reports a turn that ended at an unanswered tool call as waiting for the user', () => {
		expect(resolveStreamStatus(streamResult({ status: 'suspended' }), false)).toBe(
			'waiting-for-user',
		);
	});

	it('reports a paused run as suspended', () => {
		expect(resolveStreamStatus(streamResult({ finishReason: 'paused' }), false)).toBe('suspended');
	});

	it.each([streamResult({ status: 'cancelled' }), streamResult({ finishReason: 'cancelled' })])(
		'never reads a cancelled run as a clean finish',
		(result) => {
			expect(resolveStreamStatus(result, false)).toBe('timed-out');
		},
	);
});
