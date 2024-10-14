import type { PushMessage } from '@n8n/api-types';
import { EventEmitter } from 'events';
import { sleep } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';
import type WebSocket from 'ws';

import type { User } from '@/databases/entities/user';
import { EMPTY_BUFFER, WebSocketPush } from '@/push/websocket.push';

jest.useFakeTimers();

class MockWebSocket extends EventEmitter {
	public isAlive = true;

	public ping = jest.fn();

	public send = jest.fn();

	public terminate = jest.fn();

	public close = jest.fn();
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

	let webSocketPush: WebSocketPush;
	const mockWebSocket1 = createMockWebSocket();
	const mockWebSocket2 = createMockWebSocket();

	beforeEach(() => {
		jest.resetAllMocks();
		webSocketPush = new WebSocketPush(mock());
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

	const assertSendCall = (ws: jest.Mocked<WebSocket>) => {
		expect(ws.send).toHaveBeenNthCalledWith(1, expectedMsg, { fin: false });
		expect(ws.send).toHaveBeenNthCalledWith(2, EMPTY_BUFFER);
	};

	it('sends data to one connection', async () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);
		// Use real timers to yield back to the event-loop, to finish streaming the data
		jest.useRealTimers();
		webSocketPush.sendToOne(pushMessage.type, pushMessage.data, pushRef1);
		await sleep(100);
		jest.useFakeTimers();

		assertSendCall(mockWebSocket1);
		expect(mockWebSocket2.send).not.toHaveBeenCalled();
	});

	it('sends data to all connections', async () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);

		jest.useRealTimers();
		webSocketPush.sendToAll(pushMessage.type, pushMessage.data);
		await sleep(100);
		jest.useFakeTimers();

		assertSendCall(mockWebSocket1);
		assertSendCall(mockWebSocket2);
	});

	it('pings all connections', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);

		jest.runOnlyPendingTimers();

		expect(mockWebSocket1.ping).toHaveBeenCalled();
		expect(mockWebSocket2.ping).toHaveBeenCalled();
	});

	it('sends data to all users connections', async () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);

		jest.useRealTimers();
		webSocketPush.sendToUsers(pushMessage.type, pushMessage.data, [userId]);
		await sleep(100);
		jest.useFakeTimers();

		assertSendCall(mockWebSocket1);
		assertSendCall(mockWebSocket2);
	});

	it('emits message event when connection receives data', () => {
		const mockOnMessageReceived = jest.fn();
		webSocketPush.on('message', mockOnMessageReceived);
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);

		const data = { test: 'data' };
		const buffer = Buffer.from(JSON.stringify(data));

		mockWebSocket1.emit('message', buffer);

		expect(mockOnMessageReceived).toHaveBeenCalledWith({
			msg: data,
			pushRef: pushRef1,
			userId,
		});
	});
});
