import { BroadcastChannelTransport } from './broadcast-channel';

describe('BroadcastChannelTransport', () => {
	let transport1: BroadcastChannelTransport;
	let transport2: BroadcastChannelTransport;

	beforeEach(() => {
		transport1 = new BroadcastChannelTransport('test-channel');
		transport2 = new BroadcastChannelTransport('test-channel');
	});

	afterEach(() => {
		transport1.disconnect();
		transport2.disconnect();
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

		it('should send data from transport1 to transport2', async () => {
			const received: Uint8Array[] = [];
			transport2.onReceive((data) => received.push(data));

			const testData = new Uint8Array([1, 2, 3, 4, 5]);
			transport1.send(testData);

			// BroadcastChannel is async
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(received).toHaveLength(1);
			expect(Array.from(received[0])).toEqual([1, 2, 3, 4, 5]);
		});

		it('should send data from transport2 to transport1', async () => {
			const received: Uint8Array[] = [];
			transport1.onReceive((data) => received.push(data));

			const testData = new Uint8Array([5, 4, 3, 2, 1]);
			transport2.send(testData);

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(received).toHaveLength(1);
			expect(Array.from(received[0])).toEqual([5, 4, 3, 2, 1]);
		});

		it('should support bidirectional communication', async () => {
			const received1: Uint8Array[] = [];
			const received2: Uint8Array[] = [];

			transport1.onReceive((data) => received1.push(data));
			transport2.onReceive((data) => received2.push(data));

			transport1.send(new Uint8Array([1, 2, 3]));
			transport2.send(new Uint8Array([4, 5, 6]));

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(received1).toHaveLength(1);
			expect(received2).toHaveLength(1);
			expect(Array.from(received1[0])).toEqual([4, 5, 6]);
			expect(Array.from(received2[0])).toEqual([1, 2, 3]);
		});

		it('should not receive own messages', async () => {
			const received: Uint8Array[] = [];
			transport1.onReceive((data) => received.push(data));

			transport1.send(new Uint8Array([1, 2, 3]));

			await new Promise((resolve) => setTimeout(resolve, 50));

			// Should not receive own message
			expect(received).toHaveLength(0);
		});

		it('should deliver to multiple handlers', async () => {
			const received1: Uint8Array[] = [];
			const received2: Uint8Array[] = [];

			transport2.onReceive((data) => received1.push(data));
			transport2.onReceive((data) => received2.push(data));

			transport1.send(new Uint8Array([1, 2, 3]));

			await new Promise((resolve) => setTimeout(resolve, 50));

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
			const unsubscribe = transport2.onReceive((data) => received.push(data));

			transport1.send(new Uint8Array([1, 2, 3]));
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(received).toHaveLength(1);

			unsubscribe();

			transport1.send(new Uint8Array([4, 5, 6]));
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(received).toHaveLength(1); // No new data
		});

		it('should only unsubscribe the specific handler', async () => {
			const received1: Uint8Array[] = [];
			const received2: Uint8Array[] = [];

			const unsubscribe1 = transport2.onReceive((data) => received1.push(data));
			transport2.onReceive((data) => received2.push(data));

			unsubscribe1();

			transport1.send(new Uint8Array([1, 2, 3]));
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(received1).toHaveLength(0);
			expect(received2).toHaveLength(1);
		});
	});

	describe('channel isolation', () => {
		it('should not receive messages from different channels', async () => {
			const otherTransport = new BroadcastChannelTransport('other-channel');

			await transport1.connect();
			await otherTransport.connect();

			const received: Uint8Array[] = [];
			transport1.onReceive((data) => received.push(data));

			otherTransport.send(new Uint8Array([1, 2, 3]));

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(received).toHaveLength(0);

			otherTransport.disconnect();
		});
	});

	describe('multiple tabs simulation', () => {
		it('should broadcast to all connected transports', async () => {
			const transport3 = new BroadcastChannelTransport('test-channel');

			await transport1.connect();
			await transport2.connect();
			await transport3.connect();

			const received1: Uint8Array[] = [];
			const received2: Uint8Array[] = [];
			const received3: Uint8Array[] = [];

			transport1.onReceive((data) => received1.push(data));
			transport2.onReceive((data) => received2.push(data));
			transport3.onReceive((data) => received3.push(data));

			// Send from transport1
			transport1.send(new Uint8Array([1, 2, 3]));

			await new Promise((resolve) => setTimeout(resolve, 50));

			// transport1 should not receive (self-filter)
			expect(received1).toHaveLength(0);
			// transport2 and transport3 should receive
			expect(received2).toHaveLength(1);
			expect(received3).toHaveLength(1);

			transport3.disconnect();
		});
	});

	describe('large data transfer', () => {
		beforeEach(async () => {
			await transport1.connect();
			await transport2.connect();
		});

		it('should handle large payloads', async () => {
			const received: Uint8Array[] = [];
			transport2.onReceive((data) => received.push(data));

			// 100KB payload (smaller than MessagePort test due to serialization overhead)
			const largeData = new Uint8Array(100 * 1024);
			for (let i = 0; i < largeData.length; i++) {
				largeData[i] = i % 256;
			}

			transport1.send(largeData);

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(received).toHaveLength(1);
			expect(received[0].length).toBe(100 * 1024);
			expect(received[0][0]).toBe(0);
			expect(received[0][255]).toBe(255);
			expect(received[0][256]).toBe(0);
		});
	});
});
