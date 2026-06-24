import { describe, it, expect, vi } from 'vitest';
import { encodeMessage, decodeMessage, SYNC_AWARENESS, SYNC_UPDATE } from '@n8n/crdt';
import type { WebSocketTransport } from '@n8n/crdt';
import { createWebSocketAwarenessRelay } from './awarenessRelay';

function createFakeTransport() {
	let connected = false;
	const receiveHandlers = new Set<(data: Uint8Array) => void>();
	const connectionHandlers = new Set<(connected: boolean) => void>();
	const sent: Uint8Array[] = [];

	const transport = {
		get connected() {
			return connected;
		},
		send: (data: Uint8Array) => sent.push(data),
		onReceive: (handler: (data: Uint8Array) => void) => {
			receiveHandlers.add(handler);
			return () => receiveHandlers.delete(handler);
		},
		onConnectionChange: (handler: (c: boolean) => void) => {
			connectionHandlers.add(handler);
			return () => connectionHandlers.delete(handler);
		},
	} as unknown as WebSocketTransport;

	return {
		transport,
		sent,
		emitReceive: (data: Uint8Array) => receiveHandlers.forEach((h) => h(data)),
		setConnected: (value: boolean) => {
			connected = value;
			connectionHandlers.forEach((h) => h(value));
		},
	};
}

describe('createWebSocketAwarenessRelay', () => {
	it('frames outgoing updates as awareness messages only when connected', () => {
		const fake = createFakeTransport();
		const relay = createWebSocketAwarenessRelay(fake.transport);

		relay.send(new Uint8Array([1, 2, 3]));
		expect(fake.sent).toHaveLength(0); // not connected → dropped

		fake.setConnected(true);
		relay.send(new Uint8Array([1, 2, 3]));
		expect(fake.sent).toHaveLength(1);
		const { messageType, payload } = decodeMessage(fake.sent[0]);
		expect(messageType).toBe(SYNC_AWARENESS);
		expect([...payload]).toEqual([1, 2, 3]);
	});

	it('delivers only awareness frames to receivers, ignoring sync frames', () => {
		const fake = createFakeTransport();
		const relay = createWebSocketAwarenessRelay(fake.transport);
		const received: Uint8Array[] = [];
		relay.onReceive((update) => received.push(update));

		fake.emitReceive(encodeMessage(SYNC_UPDATE, new Uint8Array([9, 9]))); // not awareness
		fake.emitReceive(encodeMessage(SYNC_AWARENESS, new Uint8Array([4, 5])));

		expect(received).toHaveLength(1);
		expect([...received[0]]).toEqual([4, 5]);
	});

	it('signals readiness when the transport (re)connects', () => {
		const fake = createFakeTransport();
		const relay = createWebSocketAwarenessRelay(fake.transport);
		const onReady = vi.fn();
		relay.onReceive(() => {});
		relay.onReady(onReady);

		fake.setConnected(false);
		expect(onReady).not.toHaveBeenCalled();
		fake.setConnected(true);
		expect(onReady).toHaveBeenCalledTimes(1);
	});
});
