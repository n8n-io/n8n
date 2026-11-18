import { createHeartbeatMessage, type PushMessage } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { EventEmitter } from 'events';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';
import type WebSocket from 'ws';

import { WebSocketPush } from '@/push/websocket.push';

vi.useFakeTimers();

class MockWebSocket extends EventEmitter {
	isAlive = true;

	ping = vi.fn();

	send = vi.fn();

	terminate = vi.fn();

	close = vi.fn();
}

const createMockWebSocket = () => new MockWebSocket() as unknown as Mocked<WebSocket>;

describe('WebSocketPush', () => {
	const pushRef1 = 'test-session1';
	const pushRef2 = 'test-session2';
	const userId: User['id'] = 'test-user';
	const otherUserId: User['id'] = 'other-user';
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
		vi.resetAllMocks();
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
		webSocketPush.sendToOne(pushMessage, pushRef1, userId);

		expect(mockWebSocket1.send).toHaveBeenCalledWith(expectedMsg, { binary: false });
		expect(mockWebSocket2.send).not.toHaveBeenCalled();
	});

	it('sends to one connection only when the connection belongs to the given user', () => {
		const userSocket = createMockWebSocket();
		const otherUserSocket = createMockWebSocket();
		webSocketPush.add(pushRef1, userId, userSocket);
		webSocketPush.add(pushRef1, otherUserId, otherUserSocket);

		webSocketPush.sendToOne(pushMessage, pushRef1, userId);

		expect(otherUserSocket.send).not.toHaveBeenCalled();
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

		vi.runOnlyPendingTimers();

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

	it('excludes one connection when sending to a user', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);
		webSocketPush.sendToUsers(pushMessage, [userId], { excludePushRef: pushRef1 });

		expect(mockWebSocket1.send).not.toHaveBeenCalled();
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
		webSocketPush.sendToOne(pushMessage, pushRef1, userId);
		expect(newSocket.send).toHaveBeenCalledWith(expectedMsg, { binary: false });
		expect(oldSocket.send).not.toHaveBeenCalled();
	});

	it('closes the old connection when the same user connects again with the same push ref', () => {
		const push = new WebSocketPush(mock(), mock());
		const oldSocket = createMockWebSocket();
		push.add(pushRef1, userId, oldSocket);

		push.add(pushRef1, userId, createMockWebSocket());

		expect(oldSocket.close).toHaveBeenCalled();
	});

	it('emits message event when connection receives data', async () => {
		vi.useRealTimers();
		const mockOnMessageReceived = vi.fn();
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
		const mockOnMessageReceived = vi.fn();
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

	describe('when another user connects with the same push ref', () => {
		let push: WebSocketPush;
		let userSocket: Mocked<WebSocket>;
		let otherUserSocket: Mocked<WebSocket>;

		beforeEach(() => {
			push = new WebSocketPush(mock(), mock());
			userSocket = createMockWebSocket();
			otherUserSocket = createMockWebSocket();
			push.add(pushRef1, userId, userSocket);
			push.add(pushRef1, otherUserId, otherUserSocket);
		});

		it('keeps the connection of the first user open', () => {
			expect(userSocket.close).not.toHaveBeenCalled();
		});

		it('delivers to the first user', () => {
			push.sendToOne(pushMessage, pushRef1, userId);

			expect(userSocket.send).toHaveBeenCalledWith(expectedMsg, { binary: false });
		});

		it("keeps the first user's connection when the other user's connection closes", () => {
			otherUserSocket.emit('close');

			push.sendToOne(pushMessage, pushRef1, userId);

			expect(userSocket.send).toHaveBeenCalledWith(expectedMsg, { binary: false });
		});

		it("reports the sender's user for a message", async () => {
			const data = { test: 'data' };
			const onMessageReceived = vi.fn();
			push.on('message', onMessageReceived);

			userSocket.emit('message', Buffer.from(JSON.stringify(data)));
			await new Promise(process.nextTick);

			expect(onMessageReceived).toHaveBeenCalledWith({ msg: data, pushRef: pushRef1, userId });
		});
	});
});
