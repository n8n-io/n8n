import { createHeartbeatMessage, type PushMessage } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { EventEmitter } from 'events';
import type WebSocket from 'ws';

import { WebSocketPush } from '@/push/websocket.push';

jest.useFakeTimers();

class MockWebSocket extends EventEmitter {
	isAlive = true;

	ping = jest.fn();

	send = jest.fn();

	terminate = jest.fn();

	close = jest.fn();
}

const createMockWebSocket = () => new MockWebSocket() as unknown as jest.Mocked<WebSocket>;

describe('WebSocketPush', () => {
	const pushRef1 = 'test-session1';
	const pushRef2 = 'test-session2';
	const userId: User['id'] = 'test-user';
	const pushMessage: PushMessage = {
		type: 'executionRecovered',
		data: {
			executionId: 'test-execution-id',
		},
	};
	const expectedMsg = JSON.stringify({
		type: 'executionRecovered',
		data: {
			executionId: 'test-execution-id',
		},
	});

	mockInstance(Logger);
	const webSocketPush = Container.get(WebSocketPush);
	const mockWebSocket1 = createMockWebSocket();
	const mockWebSocket2 = createMockWebSocket();

	beforeEach(() => {
		jest.resetAllMocks();
		mockWebSocket1.removeAllListeners();
		mockWebSocket2.removeAllListeners();
	});

	it('can add a connection', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);

		expect(mockWebSocket1.listenerCount('close')).toBe(1);
		expect(mockWebSocket1.listenerCount('pong')).toBe(1);
		expect(mockWebSocket1.listenerCount('message')).toBe(1);
	});

	it('closes a connection', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);

		mockWebSocket1.emit('close');

		expect(mockWebSocket1.listenerCount('message')).toBe(0);
		expect(mockWebSocket1.listenerCount('close')).toBe(0);
		expect(mockWebSocket1.listenerCount('pong')).toBe(0);
	});

	it('sends data to one connection', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);
		webSocketPush.sendToOne(pushMessage, pushRef1);

		expect(mockWebSocket1.send).toHaveBeenCalledWith(expectedMsg, { binary: false });
		expect(mockWebSocket2.send).not.toHaveBeenCalled();
	});

	it('sends data to all connections', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);
		webSocketPush.sendToAll(pushMessage);

		expect(mockWebSocket1.send).toHaveBeenCalledWith(expectedMsg, { binary: false });
		expect(mockWebSocket2.send).toHaveBeenCalledWith(expectedMsg, { binary: false });
	});

	it('pings all connections', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);

		jest.runOnlyPendingTimers();

		expect(mockWebSocket1.ping).toHaveBeenCalled();
		expect(mockWebSocket2.ping).toHaveBeenCalled();
	});

	it('sends data to all users connections', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);
		webSocketPush.sendToUsers(pushMessage, [userId]);

		expect(mockWebSocket1.send).toHaveBeenCalledWith(expectedMsg, { binary: false });
		expect(mockWebSocket2.send).toHaveBeenCalledWith(expectedMsg, { binary: false });
	});

	it('skips sending when user has no connections', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.sendToUsers(pushMessage, ['nonexistent-user']);

		expect(mockWebSocket1.send).not.toHaveBeenCalled();
	});

	it('does not remove replaced connection when old connection closes', () => {
		const oldSocket = createMockWebSocket();
		const newSocket = createMockWebSocket();

		webSocketPush.add(pushRef1, userId, oldSocket);
		expect(webSocketPush.hasPushRef(pushRef1)).toBe(true);

		// Second add with same pushRef replaces the connection and closes old one
		webSocketPush.add(pushRef1, userId, newSocket);

		// Old connection's close event fires — should NOT remove the new connection
		oldSocket.emit('close');
		expect(webSocketPush.hasPushRef(pushRef1)).toBe(true);

		// New connection still works
		webSocketPush.sendToOne(pushMessage, pushRef1);
		expect(newSocket.send).toHaveBeenCalledWith(expectedMsg, { binary: false });
		expect(oldSocket.send).not.toHaveBeenCalled();
	});

	it('emits message event when connection receives data', async () => {
		jest.useRealTimers();
		const mockOnMessageReceived = jest.fn();
		webSocketPush.on('message', mockOnMessageReceived);
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);

		const data = { test: 'data' };
		const buffer = Buffer.from(JSON.stringify(data));

		mockWebSocket1.emit('message', buffer);

		// Flush the event loop
		await new Promise(process.nextTick);

		expect(mockOnMessageReceived).toHaveBeenCalledWith({
			msg: data,
			pushRef: pushRef1,
			userId,
		});
	});

	it("emits doesn' emit message for client heartbeat", async () => {
		const mockOnMessageReceived = jest.fn();
		webSocketPush.on('message', mockOnMessageReceived);
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);

		const data = createHeartbeatMessage();
		const buffer = Buffer.from(JSON.stringify(data));

		mockWebSocket1.emit('message', buffer);

		// Flush the event loop
		await new Promise(process.nextTick);

		expect(mockOnMessageReceived).not.toHaveBeenCalled();
	});

	// Regression tests for ADO-5084: WS push connections dropping at ~2s with code 1005
	// Issue: https://linear.app/n8n/issue/ADO-5084
	// GitHub: https://github.com/n8n-io/n8n/issues/28281
	describe('ADO-5084 regression: connection stability', () => {
		it('should not spontaneously close connections within 2-3 second window', () => {
			jest.useRealTimers();
			const socket = createMockWebSocket();
			webSocketPush.add(pushRef1, userId, socket);

			// Connection should be alive
			expect(webSocketPush.hasPushRef(pushRef1)).toBe(true);
			expect(socket.close).not.toHaveBeenCalled();

			// Fast-forward through the critical 2-3 second window where bug manifests
			jest.useFakeTimers();
			jest.advanceTimersByTime(3000);

			// Connection should still be alive (no spontaneous close)
			expect(webSocketPush.hasPushRef(pushRef1)).toBe(true);
			expect(socket.close).not.toHaveBeenCalled();
		});

		it('should handle rapid duplicate add() for same pushRef without connection instability', () => {
			const socket1 = createMockWebSocket();
			const socket2 = createMockWebSocket();

			// Initial connection
			webSocketPush.add(pushRef1, userId, socket1);
			expect(webSocketPush.hasPushRef(pushRef1)).toBe(true);

			// Simulate rapid duplicate add within 2s window (as might happen in multi-main
			// with instance registry timing issues or pubsub relay boomerang)
			jest.advanceTimersByTime(1500);
			webSocketPush.add(pushRef1, userId, socket2);

			// Old socket should be closed (this is expected behavior)
			expect(socket1.close).toHaveBeenCalledTimes(1);
			// Critically: close() is called without arguments, yielding WS code 1005
			expect(socket1.close).toHaveBeenCalledWith();

			// New connection should be active
			expect(webSocketPush.hasPushRef(pushRef1)).toBe(true);

			// Old connection's close event should not affect new connection
			socket1.emit('close');
			expect(webSocketPush.hasPushRef(pushRef1)).toBe(true);

			// New connection should be functional
			webSocketPush.sendToOne(pushMessage, pushRef1);
			expect(socket2.send).toHaveBeenCalled();
			expect(socket1.send).not.toHaveBeenCalled();
		});

		it('should not trigger duplicate add() in normal workflowOpened scenario', async () => {
			jest.useRealTimers();
			const socket = createMockWebSocket();

			// Simulate normal editor connection flow
			webSocketPush.add(pushRef1, userId, socket);

			// Client sends workflowOpened message (typical first message after handshake)
			const workflowOpenedMsg = { type: 'workflowOpened', workflowId: 'test-workflow-id' };
			const buffer = Buffer.from(JSON.stringify(workflowOpenedMsg));
			socket.emit('message', buffer);

			await new Promise(process.nextTick);

			// Should not trigger any spontaneous re-add or close
			expect(socket.close).not.toHaveBeenCalled();
			expect(webSocketPush.hasPushRef(pushRef1)).toBe(true);

			// Advance through critical 2s window
			jest.useFakeTimers();
			jest.advanceTimersByTime(2500);

			// Connection should remain stable
			expect(socket.close).not.toHaveBeenCalled();
			expect(webSocketPush.hasPushRef(pushRef1)).toBe(true);
		});

		it('should maintain connection stability when receiving collaboratorsChanged messages', () => {
			const socket = createMockWebSocket();
			webSocketPush.add(pushRef1, userId, socket);

			// Server sends collaboratorsChanged (typical message after workflowOpened)
			const collaboratorsMsg: PushMessage = {
				type: 'collaboratorsChanged',
				data: { workflowId: 'test-workflow-id', collaborators: [] },
			};

			webSocketPush.sendToOne(collaboratorsMsg, pushRef1);
			expect(socket.send).toHaveBeenCalled();

			// Send a second collaboratorsChanged (as happens in real scenario)
			webSocketPush.sendToOne(collaboratorsMsg, pushRef1);

			// Advance through the 1.5-2.4s window where connections die in the bug
			jest.advanceTimersByTime(2400);

			// Connection should not be closed
			expect(socket.close).not.toHaveBeenCalled();
			expect(webSocketPush.hasPushRef(pushRef1)).toBe(true);
		});

		it('should detect pathological rapid re-add loop (multi-main relay boomerang scenario)', () => {
			// Simulates the suspected bug pattern: something causes add() to be called
			// repeatedly for the same pushRef, closing the connection each time
			const sockets: Array<jest.Mocked<WebSocket>> = [];

			// Create 10 connections in rapid succession (simulating relay boomerang)
			for (let i = 0; i < 10; i++) {
				const socket = createMockWebSocket();
				sockets.push(socket);
				webSocketPush.add(pushRef1, userId, socket);
				jest.advanceTimersByTime(200); // Each ~200ms apart
			}

			// First 9 sockets should have been closed
			for (let i = 0; i < 9; i++) {
				expect(sockets[i].close).toHaveBeenCalledWith();
			}

			// Last socket should be active
			expect(sockets[9].close).not.toHaveBeenCalled();
			expect(webSocketPush.hasPushRef(pushRef1)).toBe(true);

			// This pattern would produce the exact symptom: rapid reconnect loop
			// with uniform ~2s lifetime per connection
		});
	});
});
