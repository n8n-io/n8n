// Explicit vitest imports: the renderer tsconfig deliberately has `types: []`,
// so the vitest globals are not ambiently typed here.
import { describe, expect, it, vi } from 'vitest';

import { ThreadClient } from './thread-client';
import type { InstanceAiEvent } from '../../shared/types';

function makeBridge() {
	let emitThreadEvent: (threadId: string, event: InstanceAiEvent) => void = () => {};
	const bridge = {
		getThread: vi.fn(),
		listenToThread: vi.fn().mockResolvedValue(undefined),
		unlistenToThread: vi.fn().mockResolvedValue(undefined),
		onThreadEvent: vi.fn((onEventCallback: (threadId: string, event: InstanceAiEvent) => void) => {
			emitThreadEvent = onEventCallback;
			return () => {};
		}),
	};
	return {
		bridge,
		emitThreadEvent: (threadId: string, event: unknown) =>
			emitThreadEvent(threadId, event as InstanceAiEvent),
	};
}

const someEvent = { type: 'text-delta', runId: 'r1', agentId: 'a1', payload: { text: 'hi' } };

describe('ThreadClient', () => {
	it('opens the thread stream for the first listener only, passing the cursor through', () => {
		const { bridge } = makeBridge();
		const client = new ThreadClient(bridge);

		client.listen('t1', vi.fn(), { lastEventId: 7 });
		client.listen('t1', vi.fn(), { lastEventId: 99 });

		expect(bridge.listenToThread).toHaveBeenCalledTimes(1);
		expect(bridge.listenToThread).toHaveBeenCalledWith('t1', 7);
	});

	it('subscribes to the bridge event channel exactly once', () => {
		const { bridge } = makeBridge();
		const client = new ThreadClient(bridge);

		client.listen('t1', vi.fn());
		client.listen('t2', vi.fn());

		expect(bridge.onThreadEvent).toHaveBeenCalledTimes(1);
	});

	it('fans events out to all listeners of the matching thread only', () => {
		const { bridge, emitThreadEvent } = makeBridge();
		const client = new ThreadClient(bridge);
		const first = vi.fn();
		const second = vi.fn();
		const otherThread = vi.fn();
		client.listen('t1', first);
		client.listen('t1', second);
		client.listen('t2', otherThread);

		emitThreadEvent('t1', someEvent);

		expect(first).toHaveBeenCalledWith(someEvent);
		expect(second).toHaveBeenCalledWith(someEvent);
		expect(otherThread).not.toHaveBeenCalled();
	});

	it('ignores events for threads nobody listens to', () => {
		const { bridge, emitThreadEvent } = makeBridge();
		const client = new ThreadClient(bridge);
		const listener = vi.fn();
		client.listen('t1', listener);

		emitThreadEvent('t2', someEvent);

		expect(listener).not.toHaveBeenCalled();
	});

	it('closes the thread stream when the last listener is removed', () => {
		const { bridge } = makeBridge();
		const client = new ThreadClient(bridge);
		const first = vi.fn();
		const second = vi.fn();
		client.listen('t1', first);
		client.listen('t1', second);

		client.unlisten('t1', first);
		expect(bridge.unlistenToThread).not.toHaveBeenCalled();

		client.unlisten('t1', second);
		expect(bridge.unlistenToThread).toHaveBeenCalledWith('t1');
	});

	it('removed listeners no longer receive events', () => {
		const { bridge, emitThreadEvent } = makeBridge();
		const client = new ThreadClient(bridge);
		const removed = vi.fn();
		const kept = vi.fn();
		client.listen('t1', removed);
		client.listen('t1', kept);

		client.unlisten('t1', removed);
		emitThreadEvent('t1', someEvent);

		expect(removed).not.toHaveBeenCalled();
		expect(kept).toHaveBeenCalledWith(someEvent);
	});

	it('treats unlisten of an unknown listener as a no-op', () => {
		const { bridge } = makeBridge();
		const client = new ThreadClient(bridge);
		client.listen('t1', vi.fn());

		client.unlisten('t1', vi.fn());
		client.unlisten('unknown-thread', vi.fn());

		expect(bridge.unlistenToThread).not.toHaveBeenCalled();
	});

	it('reopens the stream when a listener is added after the last one was removed', () => {
		const { bridge } = makeBridge();
		const client = new ThreadClient(bridge);
		const listener = vi.fn();
		client.listen('t1', listener);
		client.unlisten('t1', listener);

		client.listen('t1', listener);

		expect(bridge.listenToThread).toHaveBeenCalledTimes(2);
	});

	it('delegates get to the bridge', async () => {
		const { bridge } = makeBridge();
		const snapshot = { threadId: 't1', messages: [], nextEventId: 7 };
		bridge.getThread.mockResolvedValue(snapshot);
		const client = new ThreadClient(bridge);

		const result = await client.get('t1', { refresh: true });

		expect(bridge.getThread).toHaveBeenCalledWith('t1', { refresh: true });
		expect(result).toEqual(snapshot);
	});
});
