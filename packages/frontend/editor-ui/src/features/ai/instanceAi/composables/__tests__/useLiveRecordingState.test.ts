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

function emitScreenshot(data: {
	threadId: string;
	actionId: string;
	mimeType: string;
	data: string;
}) {
	pushHandler?.({ type: 'instanceAiRecordingScreenshotReceived', data } as PushMessage);
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

	it('clears live state on a terminal "discarded" status, with no recap', () => {
		const state = useLiveRecordingState(() => 'thread-1');
		emitRecordingState({ threadId: 'thread-1', status: 'recording', actionCount: 5 });

		emitRecordingState({ threadId: 'thread-1', status: 'discarded', actionCount: 0 });

		expect(state.isRecording.value).toBe(false);
		expect(state.hasRecap.value).toBe(false);
		expect(state.actionCount.value).toBe(0);
	});

	it('keeps the last known state as a recap once "stopped", instead of clearing it', () => {
		const state = useLiveRecordingState(() => 'thread-1');
		emitRecordingState({ threadId: 'thread-1', status: 'recording', actionCount: 5 });

		emitRecordingState({ threadId: 'thread-1', status: 'stopped', actionCount: 0 });

		expect(state.isRecording.value).toBe(false);
		expect(state.hasRecap.value).toBe(true);
		expect(state.actionCount.value).toBe(5);
	});

	it('ticks elapsed time locally while recording, without needing further pushes', () => {
		const state = useLiveRecordingState(() => 'thread-1');
		emitRecordingState({ threadId: 'thread-1', status: 'recording', actionCount: 0 });
		expect(state.elapsedMs.value).toBe(0);

		vi.advanceTimersByTime(3000);

		expect(state.elapsedMs.value).toBeGreaterThanOrEqual(3000);
	});

	it('resets elapsed time to zero once a recording is discarded', () => {
		const state = useLiveRecordingState(() => 'thread-1');
		emitRecordingState({ threadId: 'thread-1', status: 'recording', actionCount: 0 });
		vi.advanceTimersByTime(3000);

		emitRecordingState({ threadId: 'thread-1', status: 'discarded', actionCount: 0 });

		expect(state.elapsedMs.value).toBe(0);
	});

	it('keeps the final elapsed time once a recording stops, as part of the recap', () => {
		const state = useLiveRecordingState(() => 'thread-1');
		emitRecordingState({ threadId: 'thread-1', status: 'recording', actionCount: 0 });
		vi.advanceTimersByTime(3000);

		emitRecordingState({ threadId: 'thread-1', status: 'stopped', actionCount: 0 });

		expect(state.elapsedMs.value).toBeGreaterThanOrEqual(3000);
	});

	it('runs no ticking timer before a recording starts, or after it ends', () => {
		useLiveRecordingState(() => 'thread-1');
		expect(vi.getTimerCount()).toBe(0);

		emitRecordingState({ threadId: 'thread-1', status: 'recording', actionCount: 0 });
		expect(vi.getTimerCount()).toBe(1);

		emitRecordingState({ threadId: 'thread-1', status: 'stopped', actionCount: 0 });
		expect(vi.getTimerCount()).toBe(0);
	});

	it('accumulates screenshots for this thread as they arrive, ignoring other threads', () => {
		const state = useLiveRecordingState(() => 'thread-1');
		emitRecordingState({ threadId: 'thread-1', status: 'recording', actionCount: 1 });

		emitScreenshot({ threadId: 'thread-1', actionId: 'a1', mimeType: 'image/jpeg', data: 'x' });
		emitScreenshot({ threadId: 'thread-2', actionId: 'a2', mimeType: 'image/jpeg', data: 'y' });

		expect(state.screenshots.value).toEqual([
			{ actionId: 'a1', mimeType: 'image/jpeg', data: 'x' },
		]);
	});

	it('keeps screenshots around once stopped, but clears them on a fresh recording', () => {
		const state = useLiveRecordingState(() => 'thread-1');
		emitRecordingState({ threadId: 'thread-1', status: 'recording', actionCount: 1 });
		emitScreenshot({ threadId: 'thread-1', actionId: 'a1', mimeType: 'image/jpeg', data: 'x' });

		emitRecordingState({ threadId: 'thread-1', status: 'stopped', actionCount: 1 });
		expect(state.screenshots.value).toHaveLength(1);

		emitRecordingState({ threadId: 'thread-1', status: 'recording', actionCount: 0 });
		expect(state.screenshots.value).toHaveLength(0);
	});
});
