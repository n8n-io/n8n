import {
	MESSAGE_SYNC,
	MESSAGE_SUBSCRIBE,
	MESSAGE_UNSUBSCRIBE,
	MESSAGE_CONNECTED,
	MESSAGE_DISCONNECTED,
	MESSAGE_INITIAL_SYNC,
	encodeWithDocId,
	decodeWithDocId,
	decodeString,
} from '../protocol';
import { WorkerTransport } from './worker';

/**
 * Mock MessagePort for testing WorkerTransport.
 * Simulates the behavior of a SharedWorker port or regular Worker.
 */
class MockPort {
	private handlers: Set<(event: MessageEvent) => void> = new Set();
	private started = false;
	sentMessages: Uint8Array[] = [];
	otherPort: MockPort | null = null;

	addEventListener(type: string, handler: EventListener) {
		if (type === 'message') {
			this.handlers.add(handler as (event: MessageEvent) => void);
		}
	}

	removeEventListener(type: string, handler: EventListener) {
		if (type === 'message') {
			this.handlers.delete(handler as (event: MessageEvent) => void);
		}
	}

	start() {
		this.started = true;
	}

	postMessage(data: Uint8Array) {
		this.sentMessages.push(new Uint8Array(data));
	}

	/**
	 * Simulate receiving a message from the worker.
	 */
	simulateMessage(data: Uint8Array) {
		const event = { data } as MessageEvent;
		for (const handler of this.handlers) {
			handler(event);
		}
	}

	get isStarted() {
		return this.started;
	}

	get handlerCount() {
		return this.handlers.size;
	}
}

describe('WorkerTransport', () => {
	let port: MockPort;
	let transport: WorkerTransport;
	const testDocId = 'workflow-123';
	const testServerUrl = 'wss://server.example.com/crdt';

	beforeEach(() => {
		port = new MockPort();
		transport = new WorkerTransport({
			port: port as unknown as MessagePort,
			docId: testDocId,
			serverUrl: testServerUrl,
		});
	});

	afterEach(() => {
		transport.disconnect();
	});

	describe('constructor', () => {
		it('should initialize with connected = false', () => {
			expect(transport.connected).toBe(false);
		});
	});

	describe('connect', () => {
		it('should send SUBSCRIBE message with docId and serverUrl', async () => {
			// Start connect (doesn't await - we need to simulate response)
			const connectPromise = transport.connect();

			// Verify SUBSCRIBE message was sent
			expect(port.sentMessages.length).toBe(1);
			const msg = decodeWithDocId(port.sentMessages[0]);
			expect(msg.messageType).toBe(MESSAGE_SUBSCRIBE);
			expect(msg.docId).toBe(testDocId);
			expect(decodeString(msg.payload)).toBe(testServerUrl);

			// Simulate INITIAL_SYNC response from worker
			const initialSyncMsg = encodeWithDocId(MESSAGE_INITIAL_SYNC, testDocId);
			port.simulateMessage(initialSyncMsg);

			await connectPromise;
			expect(transport.connected).toBe(true);
		});

		it('should start MessagePort if it has start method', async () => {
			const connectPromise = transport.connect();

			expect(port.isStarted).toBe(true);

			// Complete connection
			port.simulateMessage(encodeWithDocId(MESSAGE_INITIAL_SYNC, testDocId));
			await connectPromise;
		});

		it('should return immediately if already connected', async () => {
			// First connection
			const connectPromise1 = transport.connect();
			port.simulateMessage(encodeWithDocId(MESSAGE_INITIAL_SYNC, testDocId));
			await connectPromise1;

			// Second connect should return immediately
			const connectPromise2 = transport.connect();
			await connectPromise2;

			// Only one SUBSCRIBE message should have been sent
			expect(port.sentMessages.length).toBe(1);
		});

		it('should not send multiple SUBSCRIBE messages if connection is in progress', async () => {
			const connectPromise1 = transport.connect();
			const connectPromise2 = transport.connect();

			// Only one SUBSCRIBE should be sent
			expect(port.sentMessages.length).toBe(1);

			port.simulateMessage(encodeWithDocId(MESSAGE_INITIAL_SYNC, testDocId));
			await Promise.all([connectPromise1, connectPromise2]);

			// Still only one SUBSCRIBE
			expect(port.sentMessages.length).toBe(1);
		});
	});

	describe('disconnect', () => {
		it('should send UNSUBSCRIBE message', async () => {
			// Connect first
			const connectPromise = transport.connect();
			port.simulateMessage(encodeWithDocId(MESSAGE_INITIAL_SYNC, testDocId));
			await connectPromise;

			transport.disconnect();

			// Should have SUBSCRIBE and UNSUBSCRIBE
			expect(port.sentMessages.length).toBe(2);
			const unsubMsg = decodeWithDocId(port.sentMessages[1]);
			expect(unsubMsg.messageType).toBe(MESSAGE_UNSUBSCRIBE);
			expect(unsubMsg.docId).toBe(testDocId);
		});

		it('should set connected to false', async () => {
			const connectPromise = transport.connect();
			port.simulateMessage(encodeWithDocId(MESSAGE_INITIAL_SYNC, testDocId));
			await connectPromise;

			expect(transport.connected).toBe(true);
			transport.disconnect();
			expect(transport.connected).toBe(false);
		});

		it('should remove message handler', async () => {
			const connectPromise = transport.connect();
			port.simulateMessage(encodeWithDocId(MESSAGE_INITIAL_SYNC, testDocId));
			await connectPromise;

			expect(port.handlerCount).toBe(1);
			transport.disconnect();
			expect(port.handlerCount).toBe(0);
		});

		it('should do nothing if not connected', () => {
			transport.disconnect(); // Should not throw
			expect(port.sentMessages.length).toBe(0);
		});
	});

	describe('send', () => {
		it('should throw if not connected', () => {
			const data = new Uint8Array([MESSAGE_SYNC, 1, 2, 3]);
			expect(() => transport.send(data)).toThrow('Transport not connected');
		});

		it('should add docId to outgoing messages', async () => {
			// Connect
			const connectPromise = transport.connect();
			port.simulateMessage(encodeWithDocId(MESSAGE_INITIAL_SYNC, testDocId));
			await connectPromise;

			// Send a message (in server format: [type, payload])
			const payload = new Uint8Array([10, 20, 30]);
			const serverFormatMsg = new Uint8Array([MESSAGE_SYNC, ...payload]);
			transport.send(serverFormatMsg);

			// Verify it was encoded with docId
			expect(port.sentMessages.length).toBe(2); // SUBSCRIBE + our message
			const sentMsg = decodeWithDocId(port.sentMessages[1]);
			expect(sentMsg.messageType).toBe(MESSAGE_SYNC);
			expect(sentMsg.docId).toBe(testDocId);
			expect(sentMsg.payload).toEqual(payload);
		});
	});

	describe('onReceive', () => {
		it('should forward messages for this docId to handlers', async () => {
			const received: Uint8Array[] = [];
			transport.onReceive((data) => received.push(new Uint8Array(data)));

			// Connect
			const connectPromise = transport.connect();
			port.simulateMessage(encodeWithDocId(MESSAGE_INITIAL_SYNC, testDocId));
			await connectPromise;

			// Simulate incoming SYNC message
			const payload = new Uint8Array([1, 2, 3, 4, 5]);
			const workerMsg = encodeWithDocId(MESSAGE_SYNC, testDocId, payload);
			port.simulateMessage(workerMsg);

			// Handler should receive server-format message
			expect(received.length).toBe(2); // INITIAL_SYNC + SYNC
			expect(received[1][0]).toBe(MESSAGE_SYNC);
			expect(received[1].subarray(1)).toEqual(payload);
		});

		it('should ignore messages for other docIds', async () => {
			const received: Uint8Array[] = [];
			transport.onReceive((data) => received.push(new Uint8Array(data)));

			// Connect
			const connectPromise = transport.connect();
			port.simulateMessage(encodeWithDocId(MESSAGE_INITIAL_SYNC, testDocId));
			await connectPromise;

			// Simulate incoming message for different docId
			const otherDocMsg = encodeWithDocId(MESSAGE_SYNC, 'other-doc-id', new Uint8Array([99]));
			port.simulateMessage(otherDocMsg);

			// Should only have the INITIAL_SYNC message
			expect(received.length).toBe(1);
		});

		it('should support multiple handlers', async () => {
			const received1: Uint8Array[] = [];
			const received2: Uint8Array[] = [];

			transport.onReceive((data) => received1.push(new Uint8Array(data)));
			transport.onReceive((data) => received2.push(new Uint8Array(data)));

			const connectPromise = transport.connect();
			port.simulateMessage(encodeWithDocId(MESSAGE_INITIAL_SYNC, testDocId));
			await connectPromise;

			const workerMsg = encodeWithDocId(MESSAGE_SYNC, testDocId, new Uint8Array([42]));
			port.simulateMessage(workerMsg);

			expect(received1.length).toBe(2);
			expect(received2.length).toBe(2);
		});

		it('should return unsubscribe function', async () => {
			const received: Uint8Array[] = [];
			const unsubscribe = transport.onReceive((data) => received.push(new Uint8Array(data)));

			const connectPromise = transport.connect();
			port.simulateMessage(encodeWithDocId(MESSAGE_INITIAL_SYNC, testDocId));
			await connectPromise;

			// First message should be received
			port.simulateMessage(encodeWithDocId(MESSAGE_SYNC, testDocId, new Uint8Array([1])));
			expect(received.length).toBe(2);

			// Unsubscribe
			unsubscribe();

			// Second message should not be received
			port.simulateMessage(encodeWithDocId(MESSAGE_SYNC, testDocId, new Uint8Array([2])));
			expect(received.length).toBe(2); // Still 2
		});
	});

	describe('control messages', () => {
		it('should update connected state on MESSAGE_CONNECTED', async () => {
			const connectPromise = transport.connect();

			// Simulate CONNECTED message
			port.simulateMessage(encodeWithDocId(MESSAGE_CONNECTED, testDocId));
			expect(transport.connected).toBe(true);

			// Still need INITIAL_SYNC to resolve connect promise
			port.simulateMessage(encodeWithDocId(MESSAGE_INITIAL_SYNC, testDocId));
			await connectPromise;
		});

		it('should update connected state on MESSAGE_DISCONNECTED', async () => {
			const connectPromise = transport.connect();
			port.simulateMessage(encodeWithDocId(MESSAGE_INITIAL_SYNC, testDocId));
			await connectPromise;

			expect(transport.connected).toBe(true);

			// Simulate DISCONNECTED message
			port.simulateMessage(encodeWithDocId(MESSAGE_DISCONNECTED, testDocId));
			expect(transport.connected).toBe(false);
		});

		it('should forward control messages to handlers', async () => {
			const received: Uint8Array[] = [];
			transport.onReceive((data) => received.push(new Uint8Array(data)));

			const connectPromise = transport.connect();
			port.simulateMessage(encodeWithDocId(MESSAGE_INITIAL_SYNC, testDocId));
			await connectPromise;

			// INITIAL_SYNC should have been forwarded
			expect(received.length).toBe(1);
			expect(received[0][0]).toBe(MESSAGE_INITIAL_SYNC);

			// DISCONNECTED should also be forwarded
			port.simulateMessage(encodeWithDocId(MESSAGE_DISCONNECTED, testDocId));
			expect(received.length).toBe(2);
			expect(received[1][0]).toBe(MESSAGE_DISCONNECTED);
		});
	});

	describe('error handling', () => {
		it('should ignore malformed messages', async () => {
			const received: Uint8Array[] = [];
			transport.onReceive((data) => received.push(new Uint8Array(data)));

			const connectPromise = transport.connect();
			port.simulateMessage(encodeWithDocId(MESSAGE_INITIAL_SYNC, testDocId));
			await connectPromise;

			// Send a malformed message (too short to decode)
			port.simulateMessage(new Uint8Array([0]));

			// Should not crash, and no new messages received
			expect(received.length).toBe(1); // Just INITIAL_SYNC
		});
	});
});
