'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const api_types_1 = require('@n8n/api-types');
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const events_1 = require('events');
const websocket_push_1 = require('@/push/websocket.push');
jest.useFakeTimers();
class MockWebSocket extends events_1.EventEmitter {
	constructor() {
		super(...arguments);
		this.isAlive = true;
		this.ping = jest.fn();
		this.send = jest.fn();
		this.terminate = jest.fn();
		this.close = jest.fn();
	}
}
const createMockWebSocket = () => new MockWebSocket();
describe('WebSocketPush', () => {
	const pushRef1 = 'test-session1';
	const pushRef2 = 'test-session2';
	const userId = 'test-user';
	const pushMessage = {
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
	(0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	const webSocketPush = di_1.Container.get(websocket_push_1.WebSocketPush);
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
		expect(mockWebSocket1.send).toHaveBeenCalledWith(expectedMsg);
		expect(mockWebSocket2.send).not.toHaveBeenCalled();
	});
	it('sends data to all connections', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);
		webSocketPush.sendToAll(pushMessage);
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
	it('sends data to all users connections', () => {
		webSocketPush.add(pushRef1, userId, mockWebSocket1);
		webSocketPush.add(pushRef2, userId, mockWebSocket2);
		webSocketPush.sendToUsers(pushMessage, [userId]);
		expect(mockWebSocket1.send).toHaveBeenCalledWith(expectedMsg);
		expect(mockWebSocket2.send).toHaveBeenCalledWith(expectedMsg);
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
		const data = (0, api_types_1.createHeartbeatMessage)();
		const buffer = Buffer.from(JSON.stringify(data));
		mockWebSocket1.emit('message', buffer);
		await new Promise(process.nextTick);
		expect(mockOnMessageReceived).not.toHaveBeenCalled();
	});
});
//# sourceMappingURL=websocket.push.test.js.map
