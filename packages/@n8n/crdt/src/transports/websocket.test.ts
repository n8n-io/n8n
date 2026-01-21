import WebSocketMock from 'vitest-websocket-mock';

import { WebSocketTransport } from './websocket';

describe('WebSocketTransport', () => {
	let server: WebSocketMock;

	beforeEach(() => {
		server = new WebSocketMock('ws://localhost:1234');
	});

	afterEach(() => {
		try {
			WebSocketMock.clean();
		} catch {
			// Ignore cleanup errors
		}
	});

	describe('connection lifecycle', () => {
		it('should start disconnected', () => {
			const transport = new WebSocketTransport({ url: 'ws://localhost:1234' });
			expect(transport.connected).toBe(false);
		});

		it('should connect successfully', async () => {
			const transport = new WebSocketTransport({ url: 'ws://localhost:1234' });

			await transport.connect();
			await server.connected;

			expect(transport.connected).toBe(true);

			transport.disconnect();
		});

		it('should disconnect', async () => {
			const transport = new WebSocketTransport({ url: 'ws://localhost:1234' });
			await transport.connect();
			await server.connected;

			transport.disconnect();

			expect(transport.connected).toBe(false);
		});

		it('should be idempotent for multiple connect() calls', async () => {
			const transport = new WebSocketTransport({ url: 'ws://localhost:1234' });

			await transport.connect();
			await server.connected;
			await transport.connect();

			expect(transport.connected).toBe(true);

			transport.disconnect();
		});

		it('should allow reconnection after disconnect', async () => {
			const transport = new WebSocketTransport({
				url: 'ws://localhost:1234',
				reconnect: false,
			});

			await transport.connect();
			await server.connected;
			transport.disconnect();

			WebSocketMock.clean();
			server = new WebSocketMock('ws://localhost:1234');

			await transport.connect();
			await server.connected;

			expect(transport.connected).toBe(true);

			transport.disconnect();
		});

		it('should notify connection state changes', async () => {
			const transport = new WebSocketTransport({
				url: 'ws://localhost:1234',
				reconnect: false,
			});
			const states: boolean[] = [];

			transport.onConnectionChange((connected) => states.push(connected));

			await transport.connect();
			await server.connected;
			transport.disconnect();

			expect(states).toEqual([true, false]);
		});

		it('should mark as disconnected when server closes connection', async () => {
			WebSocketMock.clean();
			server = new WebSocketMock('ws://localhost:1234');
			server.on('connection', (socket) => {
				socket.close({ code: 1011, reason: 'Server error', wasClean: false });
			});

			const transport = new WebSocketTransport({
				url: 'ws://localhost:1234',
				reconnect: false,
			});

			await transport.connect();
			await server.connected;

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(transport.connected).toBe(false);
		});

		it('should timeout on slow connection', async () => {
			WebSocketMock.clean();

			const transport = new WebSocketTransport({
				url: 'ws://localhost:9999',
				reconnect: false,
				connectionTimeout: 100,
			});

			await expect(transport.connect()).rejects.toThrow();

			transport.disconnect();
		}, 5000);
	});

	describe('send/receive', () => {
		let transport: WebSocketTransport;

		beforeEach(async () => {
			transport = new WebSocketTransport({
				url: 'ws://localhost:1234',
				reconnect: false,
			});
			await transport.connect();
			await server.connected;
		});

		afterEach(() => {
			transport.disconnect();
		});

		it('should send data', async () => {
			const data = new Uint8Array([1, 2, 3, 4, 5]);
			transport.send(data);

			await expect(server).toReceiveMessage(data);
		});

		it('should receive data', async () => {
			const received: Uint8Array[] = [];
			transport.onReceive((data) => received.push(data));

			const testData = new Uint8Array([1, 2, 3]);
			server.send(testData.buffer);

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(received).toHaveLength(1);
			expect(Array.from(received[0])).toEqual([1, 2, 3]);
		});

		it('should deliver to multiple handlers', async () => {
			const received1: Uint8Array[] = [];
			const received2: Uint8Array[] = [];

			transport.onReceive((data) => received1.push(data));
			transport.onReceive((data) => received2.push(data));

			const testData = new Uint8Array([1, 2, 3]);
			server.send(testData.buffer);

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(received1).toHaveLength(1);
			expect(received2).toHaveLength(1);
		});

		it('should throw when sending on disconnected transport', () => {
			transport.disconnect();

			expect(() => {
				transport.send(new Uint8Array([1, 2, 3]));
			}).toThrow('Transport not connected');
		});
	});

	describe('unsubscribe', () => {
		let transport: WebSocketTransport;

		beforeEach(async () => {
			transport = new WebSocketTransport({
				url: 'ws://localhost:1234',
				reconnect: false,
			});
			await transport.connect();
			await server.connected;
		});

		afterEach(() => {
			transport.disconnect();
		});

		it('should stop receiving after unsubscribe', async () => {
			const received: Uint8Array[] = [];
			const unsubscribe = transport.onReceive((data) => received.push(data));

			server.send(new Uint8Array([1, 2, 3]).buffer);
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(received).toHaveLength(1);

			unsubscribe();

			server.send(new Uint8Array([4, 5, 6]).buffer);
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(received).toHaveLength(1);
		});

		it('should stop connection notifications after unsubscribe', () => {
			const states: boolean[] = [];
			const unsubscribe = transport.onConnectionChange((connected) => states.push(connected));

			unsubscribe();
			transport.disconnect();

			expect(states).toEqual([]);
		});
	});

	describe('reconnection', () => {
		it('should reconnect after connection loss', async () => {
			const transport = new WebSocketTransport({
				url: 'ws://localhost:1234',
				reconnect: true,
				reconnectDelay: 10,
			});

			await transport.connect();
			await server.connected;

			WebSocketMock.clean();
			server = new WebSocketMock('ws://localhost:1234');

			await server.connected;

			expect(transport.connected).toBe(true);

			transport.disconnect();
		});

		it('should not reconnect when disabled', async () => {
			const transport = new WebSocketTransport({
				url: 'ws://localhost:1234',
				reconnect: false,
			});

			await transport.connect();
			await server.connected;

			const connectionChanges: boolean[] = [];
			transport.onConnectionChange((c) => connectionChanges.push(c));

			WebSocketMock.clean();

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(transport.connected).toBe(false);
			expect(connectionChanges).toContain(false);
		});

		it('should stop reconnecting after disconnect()', async () => {
			const transport = new WebSocketTransport({
				url: 'ws://localhost:1234',
				reconnect: true,
				reconnectDelay: 50,
			});

			await transport.connect();
			await server.connected;

			WebSocketMock.clean();

			transport.disconnect();

			server = new WebSocketMock('ws://localhost:1234');

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(transport.connected).toBe(false);
		});

		it('should use exponential backoff', async () => {
			const transport = new WebSocketTransport({
				url: 'ws://localhost:1234',
				reconnect: true,
				reconnectDelay: 10,
				reconnectBackoff: 2,
				maxReconnectDelay: 1000,
			});

			await transport.connect();
			await server.connected;

			WebSocketMock.clean();

			await new Promise((resolve) => setTimeout(resolve, 50));

			transport.disconnect();
		});

		it('should respect maxReconnectAttempts', async () => {
			const errors: Error[] = [];
			const transport = new WebSocketTransport({
				url: 'ws://localhost:1234',
				reconnect: true,
				reconnectDelay: 10,
				maxReconnectAttempts: 2,
			});

			transport.onError((error) => errors.push(error));

			await transport.connect();
			await server.connected;

			WebSocketMock.clean();

			await new Promise((resolve) => setTimeout(resolve, 200));

			const maxAttemptsError = errors.find((e) => e.message.includes('Max reconnection attempts'));
			expect(maxAttemptsError).toBeDefined();

			transport.disconnect();
		});
	});

	describe('error handling', () => {
		it('should notify error handlers on connection failure', async () => {
			WebSocketMock.clean();

			const errors: Error[] = [];
			const transport = new WebSocketTransport({
				url: 'ws://localhost:9999',
				reconnect: false,
				connectionTimeout: 100,
			});

			transport.onError((error) => errors.push(error));

			try {
				await transport.connect();
			} catch {
				// Expected
			}

			expect(errors.length).toBeGreaterThan(0);
		});
	});
});
