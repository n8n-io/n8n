import Container from 'typedi';
import { EventEmitter } from 'events';
import type WebSocket from 'ws';
import { WebSocketPush } from '@/push/websocket.push';
import { Logger } from '@/Logger';
import type { User } from '@db/entities/User';
import type { PushDataExecutionRecovered } from '@/Interfaces';
import { mockInstance } from '../../shared/mocking';

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

	mockInstance(Logger);
	const webSocketPush = Container.get(WebSocketPush);
	const mockWebSocket1 = createMockWebSocket();
	const mockWebSocket2 = createMockWebSocket();

	beforeEach(() => {
		jest.resetAllMocks();
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

		expect(mockWebSocket1.listenerCount('close')).toBe(0);
		expect(mockWebSocket1.listenerCount('pong')).toBe(0);
		expect(mockWebSocket1.listenerCount('message')).toBe(0);
	});

	it('sends data to one connection', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);
		const data: PushDataExecutionRecovered = {
			type: 'executionRecovered',
			data: {
				executionId: 'test-execution-id',
			},
		};

		webSocketPush.sendToOneSession('executionRecovered', data, pushRef1);

		expect(mockWebSocket1.send).toHaveBeenCalledWith(
			JSON.stringify({
				type: 'executionRecovered',
				data: {
					type: 'executionRecovered',
					data: {
						executionId: 'test-execution-id',
					},
				},
			}),
		);
		expect(mockWebSocket2.send).not.toHaveBeenCalled();
	});

	it('sends data to all connections', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);
		const data: PushDataExecutionRecovered = {
			type: 'executionRecovered',
			data: {
				executionId: 'test-execution-id',
			},
		};

		webSocketPush.sendToAll('executionRecovered', data);

		const expectedMsg = JSON.stringify({
			type: 'executionRecovered',
			data: {
				type: 'executionRecovered',
				data: {
					executionId: 'test-execution-id',
				},
			},
		});
		expect(mockWebSocket1.send).toHaveBeenCalledWith(expectedMsg);
		expect(mockWebSocket2.send).toHaveBeenCalledWith(expectedMsg);
	});

	it('sends data to all users connections', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);
		const data: PushDataExecutionRecovered = {
			type: 'executionRecovered',
			data: {
				executionId: 'test-execution-id',
			},
		};

		webSocketPush.sendToUsers('executionRecovered', data, [userId]);

		const expectedMsg = JSON.stringify({
			type: 'executionRecovered',
			data: {
				type: 'executionRecovered',
				data: {
					executionId: 'test-execution-id',
				},
			},
		});
		expect(mockWebSocket1.send).toHaveBeenCalledWith(expectedMsg);
		expect(mockWebSocket2.send).toHaveBeenCalledWith(expectedMsg);
	});

	it('pings all connections', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);

		jest.runOnlyPendingTimers();

		expect(mockWebSocket1.ping).toHaveBeenCalled();
		expect(mockWebSocket2.ping).toHaveBeenCalled();
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
