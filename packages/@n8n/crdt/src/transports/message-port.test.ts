import { MessagePortTransport } from './message-port';

function waitForMessage(transport: MessagePortTransport): {
	promise: Promise<Uint8Array>;
	received: Uint8Array[];
} {
	const received: Uint8Array[] = [];
	let resolve: (data: Uint8Array) => void;
	const promise = new Promise<Uint8Array>((r) => {
		resolve = r;
	});
	transport.onReceive((data) => {
		received.push(data);
		resolve(data);
	});
	return { promise, received };
}

describe('MessagePortTransport', () => {
	let channel: MessageChannel;
	let transport1: MessagePortTransport;
	let transport2: MessagePortTransport;

	beforeEach(() => {
		channel = new MessageChannel();
		transport1 = new MessagePortTransport(channel.port1);
		transport2 = new MessagePortTransport(channel.port2);
	});

	afterEach(() => {
		transport1.disconnect();
		transport2.disconnect();
		channel.port1.close();
		channel.port2.close();
	});

	describe('connection lifecycle', () => {
		it('should start disconnected', () => {
			expect(transport1.connected).toBe(false);
			expect(transport2.connected).toBe(false);
		});

		it('should be connected after connect()', async () => {
			await transport1.connect();
			expect(transport1.connected).toBe(true);
		});

		it('should be disconnected after disconnect()', async () => {
			await transport1.connect();
			transport1.disconnect();
			expect(transport1.connected).toBe(false);
		});

		it('should allow reconnection', async () => {
			await transport1.connect();
			transport1.disconnect();
			await transport1.connect();
			expect(transport1.connected).toBe(true);
		});

		it('should be idempotent for multiple connect() calls', async () => {
			await transport1.connect();
			await transport1.connect();
			expect(transport1.connected).toBe(true);
		});

		it('should be idempotent for multiple disconnect() calls', async () => {
			await transport1.connect();
			transport1.disconnect();
			transport1.disconnect();
			expect(transport1.connected).toBe(false);
		});
	});

	describe('send/receive', () => {
		beforeEach(async () => {
			await transport1.connect();
			await transport2.connect();
		});

		it('should send data from port1 to port2', async () => {
			const { promise, received } = waitForMessage(transport2);

			const testData = new Uint8Array([1, 2, 3, 4, 5]);
			transport1.send(testData);

			await promise;

			expect(received).toHaveLength(1);
			expect(Array.from(received[0])).toEqual([1, 2, 3, 4, 5]);
		});

		it('should send data from port2 to port1', async () => {
			const { promise, received } = waitForMessage(transport1);

			const testData = new Uint8Array([5, 4, 3, 2, 1]);
			transport2.send(testData);

			await promise;

			expect(received).toHaveLength(1);
			expect(Array.from(received[0])).toEqual([5, 4, 3, 2, 1]);
		});

		it('should support bidirectional communication', async () => {
			const { promise: promise1, received: received1 } = waitForMessage(transport1);
			const { promise: promise2, received: received2 } = waitForMessage(transport2);

			transport1.send(new Uint8Array([1, 2, 3]));
			transport2.send(new Uint8Array([4, 5, 6]));

			await Promise.all([promise1, promise2]);

			expect(received1).toHaveLength(1);
			expect(received2).toHaveLength(1);
			expect(Array.from(received1[0])).toEqual([4, 5, 6]);
			expect(Array.from(received2[0])).toEqual([1, 2, 3]);
		});

		it('should deliver to multiple handlers', async () => {
			const { promise, received: received1 } = waitForMessage(transport2);
			const received2: Uint8Array[] = [];
			transport2.onReceive((data) => received2.push(data));

			transport1.send(new Uint8Array([1, 2, 3]));

			await promise;

			expect(received1).toHaveLength(1);
			expect(received2).toHaveLength(1);
		});

		it('should throw when sending on disconnected transport', () => {
			transport1.disconnect();

			expect(() => {
				transport1.send(new Uint8Array([1, 2, 3]));
			}).toThrow('Transport not connected');
		});
	});

	describe('unsubscribe', () => {
		beforeEach(async () => {
			await transport1.connect();
			await transport2.connect();
		});

		it('should stop receiving after unsubscribe', async () => {
			const received: Uint8Array[] = [];
			let resolveFirst: () => void;
			const firstMessage = new Promise<void>((r) => {
				resolveFirst = r;
			});
			const unsubscribe = transport2.onReceive((data) => {
				received.push(data);
				resolveFirst();
			});

			transport1.send(new Uint8Array([1, 2, 3]));
			await firstMessage;
			expect(received).toHaveLength(1);

			unsubscribe();

			transport1.send(new Uint8Array([4, 5, 6]));
			// No event to wait for since handler is removed; use a tick to confirm no delivery
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(received).toHaveLength(1); // No new data
		});

		it('should only unsubscribe the specific handler', async () => {
			const received1: Uint8Array[] = [];
			const received2: Uint8Array[] = [];
			let resolveMessage: () => void;
			const messageReceived = new Promise<void>((r) => {
				resolveMessage = r;
			});

			const unsubscribe1 = transport2.onReceive((data) => received1.push(data));
			transport2.onReceive((data) => {
				received2.push(data);
				resolveMessage();
			});

			unsubscribe1();

			transport1.send(new Uint8Array([1, 2, 3]));
			await messageReceived;

			expect(received1).toHaveLength(0);
			expect(received2).toHaveLength(1);
		});
	});

	describe('large data transfer', () => {
		beforeEach(async () => {
			await transport1.connect();
			await transport2.connect();
		});

		it('should handle large payloads', async () => {
			const { promise, received } = waitForMessage(transport2);

			// 1MB payload
			const largeData = new Uint8Array(1024 * 1024);
			for (let i = 0; i < largeData.length; i++) {
				largeData[i] = i % 256;
			}

			transport1.send(largeData);

			await promise;

			expect(received).toHaveLength(1);
			expect(received[0].length).toBe(1024 * 1024);
			// Verify data integrity
			expect(received[0][0]).toBe(0);
			expect(received[0][255]).toBe(255);
			expect(received[0][256]).toBe(0);
		});
	});
});
