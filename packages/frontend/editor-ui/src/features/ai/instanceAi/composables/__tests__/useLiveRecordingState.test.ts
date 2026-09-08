import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PushMessage } from '@n8n/api-types';
import { useLiveRecordingState } from '../useLiveRecordingState';

let pushHandler: ((message: PushMessage) => void) | undefined;
const addEventListener = vi.fn((handler: (message: PushMessage) => void) => {
	pushHandler = handler;
	return vi.fn();
});

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({ addEventListener }),
}));

function emitRecordingState(data: {
	threadId: string;
	status: 'recording' | 'stopped' | 'discarded';
	actionCount: number;
}) {
	pushHandler?.({ type: 'instanceAiRecordingStateChanged', data } as PushMessage);
}

describe('useLiveRecordingState', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		pushHandler = undefined;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('ignores a push for a different thread', () => {
		const state = useLiveRecordingState(() => 'thread-1');

		emitRecordingState({ threadId: 'thread-2', status: 'recording', actionCount: 3 });

		expect(state.isRecording.value).toBe(false);
	});

	it('goes live on a recording push for this thread and tracks the action count', () => {
		const state = useLiveRecordingState(() => 'thread-1');

		emitRecordingState({ threadId: 'thread-1', status: 'recording', actionCount: 0 });
		expect(state.isRecording.value).toBe(true);
		expect(state.actionCount.value).toBe(0);

		emitRecordingState({ threadId: 'thread-1', status: 'recording', actionCount: 3 });
		expect(state.actionCount.value).toBe(3);
	});

	it.each(['stopped', 'discarded'] as const)(
		'clears live state on a terminal "%s" status',
		(status) => {
			const state = useLiveRecordingState(() => 'thread-1');
			emitRecordingState({ threadId: 'thread-1', status: 'recording', actionCount: 5 });

			emitRecordingState({ threadId: 'thread-1', status, actionCount: 0 });

			expect(state.isRecording.value).toBe(false);
			expect(state.actionCount.value).toBe(0);
		},
	);

	it('ticks elapsed time locally while recording, without needing further pushes', () => {
		const state = useLiveRecordingState(() => 'thread-1');
		emitRecordingState({ threadId: 'thread-1', status: 'recording', actionCount: 0 });
		expect(state.elapsedMs.value).toBe(0);

		vi.advanceTimersByTime(3000);

		expect(state.elapsedMs.value).toBeGreaterThanOrEqual(3000);
	});

	it('resets elapsed time to zero once the recording ends', () => {
		const state = useLiveRecordingState(() => 'thread-1');
		emitRecordingState({ threadId: 'thread-1', status: 'recording', actionCount: 0 });
		vi.advanceTimersByTime(3000);

		emitRecordingState({ threadId: 'thread-1', status: 'stopped', actionCount: 0 });

		expect(state.elapsedMs.value).toBe(0);
	});
});
