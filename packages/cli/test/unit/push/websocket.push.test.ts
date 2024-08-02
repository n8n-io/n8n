import { EventEmitter } from 'events';
import type WebSocket from 'ws';
import { sleep } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';

import { EMPTY_BUFFER, WebSocketPush } from '@/push/websocket.push';
import { Logger } from '@/Logger';
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

	mockInstance(Logger);
	let webSocketPush: WebSocketPush;
	const mockWebSocket1 = createMockWebSocket();
	const mockWebSocket2 = createMockWebSocket();

	beforeEach(() => {
		jest.resetAllMocks();
		webSocketPush = new WebSocketPush(mock());
	});

	it('can add a connection', () => {
		webSocketPush.add(pushRef1, mockWebSocket1);

		expect(mockWebSocket1.listenerCount('close')).toBe(1);
		expect(mockWebSocket1.listenerCount('pong')).toBe(1);
	});

	it('closes a connection', () => {
		webSocketPush.add(pushRef1, mockWebSocket1);

		mockWebSocket1.emit('close');

		expect(mockWebSocket1.listenerCount('close')).toBe(0);
		expect(mockWebSocket1.listenerCount('pong')).toBe(0);
	});

	it('sends data to one connection', async () => {
		webSocketPush.add(pushRef1, mockWebSocket1);
		webSocketPush.add(pushRef2, mockWebSocket2);
		const data: PushDataExecutionRecovered = {
			type: 'executionRecovered',
			data: {
				executionId: 'test-execution-id',
			},
		};

		// Use real timers to yield back to the event-loop, to finish streaming the data
		jest.useRealTimers();
		webSocketPush.sendToOne('executionRecovered', data, pushRef1);
		await sleep(100);
		jest.useFakeTimers();

		expect(mockWebSocket1.send).toHaveBeenNthCalledWith(
			1,
			JSON.stringify({
				type: 'executionRecovered',
				data: {
					type: 'executionRecovered',
					data: {
						executionId: 'test-execution-id',
					},
				},
			}),
			{ fin: false },
		);
		expect(mockWebSocket1.send).toHaveBeenNthCalledWith(2, EMPTY_BUFFER);

		expect(mockWebSocket2.send).not.toHaveBeenCalled();
	});

	it('sends data to all connections', async () => {
		webSocketPush.add(pushRef1, mockWebSocket1);
		webSocketPush.add(pushRef2, mockWebSocket2);
		const data: PushDataExecutionRecovered = {
			type: 'executionRecovered',
			data: {
				executionId: 'test-execution-id',
			},
		};

		jest.useRealTimers();
		webSocketPush.sendToAll('executionRecovered', data);
		await sleep(100);
		jest.useFakeTimers();

		const expectedMsg = JSON.stringify({
			type: 'executionRecovered',
			data: {
				type: 'executionRecovered',
				data: {
					executionId: 'test-execution-id',
				},
			},
		});
		expect(mockWebSocket1.send).toHaveBeenCalledWith(expectedMsg, { fin: false });
		expect(mockWebSocket1.send).toHaveBeenCalledWith(EMPTY_BUFFER);
		expect(mockWebSocket2.send).toHaveBeenCalledWith(expectedMsg, { fin: false });
		expect(mockWebSocket2.send).toHaveBeenCalledWith(EMPTY_BUFFER);
	});

	it('pings all connections', () => {
		webSocketPush.add(pushRef1, mockWebSocket1);
		webSocketPush.add(pushRef2, mockWebSocket2);

		jest.runOnlyPendingTimers();

		expect(mockWebSocket1.ping).toHaveBeenCalled();
		expect(mockWebSocket2.ping).toHaveBeenCalled();
	});
});
