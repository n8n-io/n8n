/* eslint-disable @typescript-eslint/unbound-method */
import { EventEmitter } from 'events';
import type WebSocket from 'ws';
import { WebSocketPush } from '@/push/websocket.push';
import type { Logger } from '@/Logger';
import type { User } from '@/databases/entities/User';
import type { PushDataExecutionRecovered } from '@/Interfaces';

jest.useFakeTimers();

class MockWebSocket extends EventEmitter {
	public isAlive = true;

	public ping = jest.fn();

	public send = jest.fn();

	public terminate = jest.fn();

	public close = jest.fn();
}

const createMockWebSocket = (): jest.Mocked<WebSocket> => {
	return new MockWebSocket() as unknown as jest.Mocked<WebSocket>;
};

describe('WebSocketPush', () => {
	let webSocketPush: WebSocketPush;
	let mockWebSocket1: jest.Mocked<WebSocket>;
	let mockWebSocket2: jest.Mocked<WebSocket>;
	let mockLogger: Logger;

	const sessionId1 = 'test-session1';
	const sessionId2 = 'test-session2';
	const userId: User['id'] = 'test-user';

	beforeEach(() => {
		mockWebSocket1 = createMockWebSocket();
		mockWebSocket2 = createMockWebSocket();
		mockLogger = {
			debug: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			info: jest.fn(),
			verbose: jest.fn(),
		} as unknown as jest.Mocked<Logger>;

		webSocketPush = new WebSocketPush(mockLogger);
	});

	it('can add a connection', () => {
		webSocketPush.add(sessionId1, userId, mockWebSocket1);

		expect(mockWebSocket1.listenerCount('close')).toBe(1);
		expect(mockWebSocket1.listenerCount('pong')).toBe(1);
		expect(mockWebSocket1.listenerCount('message')).toBe(1);
	});

	it('closes a connection', () => {
		webSocketPush.add(sessionId1, userId, mockWebSocket1);

		mockWebSocket1.emit('close');

		expect(mockWebSocket1.listenerCount('close')).toBe(0);
		expect(mockWebSocket1.listenerCount('pong')).toBe(0);
		expect(mockWebSocket1.listenerCount('message')).toBe(0);
	});

	it('sends data to one connection', () => {
		webSocketPush.add(sessionId1, userId, mockWebSocket1);
		webSocketPush.add(sessionId2, userId, mockWebSocket2);
		const data: PushDataExecutionRecovered = {
			type: 'executionRecovered',
			data: {
				executionId: 'test-execution-id',
			},
		};

		webSocketPush.send('executionRecovered', data, sessionId1);

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
		webSocketPush.add(sessionId1, userId, mockWebSocket1);
		webSocketPush.add(sessionId2, userId, mockWebSocket2);
		const data: PushDataExecutionRecovered = {
			type: 'executionRecovered',
			data: {
				executionId: 'test-execution-id',
			},
		};

		webSocketPush.send('executionRecovered', data, undefined);

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
		webSocketPush.add(sessionId1, userId, mockWebSocket1);
		webSocketPush.add(sessionId2, userId, mockWebSocket2);

		jest.runOnlyPendingTimers();

		expect(mockWebSocket1.ping).toHaveBeenCalled();
		expect(mockWebSocket2.ping).toHaveBeenCalled();
	});

	it('emits message event when connection receives data', () => {
		const mockOnMessageReceived = jest.fn();
		webSocketPush.on('message', mockOnMessageReceived);
		webSocketPush.add(sessionId1, userId, mockWebSocket1);
		webSocketPush.add(sessionId2, userId, mockWebSocket2);

		const data = { test: 'data' };
		const buffer = Buffer.from(JSON.stringify(data));

		mockWebSocket1.emit('message', buffer);

		expect(mockOnMessageReceived).toHaveBeenCalledWith({
			msg: data,
			sessionId: sessionId1,
			userId,
		});
	});
});
