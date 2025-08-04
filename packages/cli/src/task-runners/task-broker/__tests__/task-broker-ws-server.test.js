'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const constants_1 = require('@n8n/constants');
const jest_mock_extended_1 = require('jest-mock-extended');
const constants_2 = require('@/constants');
const task_broker_ws_server_1 = require('@/task-runners/task-broker/task-broker-ws-server');
describe('TaskBrokerWsServer', () => {
	describe('removeConnection', () => {
		it('should close with 1000 status code by default', async () => {
			const server = new task_broker_ws_server_1.TaskBrokerWsServer(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
			);
			const ws = (0, jest_mock_extended_1.mock)();
			server.runnerConnections.set('test-runner', ws);
			await server.removeConnection('test-runner');
			expect(ws.close).toHaveBeenCalledWith(constants_2.WsStatusCodes.CloseNormal);
		});
	});
	describe('heartbeat timer', () => {
		it('should set up heartbeat timer on server start', async () => {
			const setIntervalSpy = jest.spyOn(global, 'setInterval');
			const server = new task_broker_ws_server_1.TaskBrokerWsServer(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)({ path: '/runners', heartbeatInterval: 30 }),
				(0, jest_mock_extended_1.mock)(),
			);
			server.start();
			expect(setIntervalSpy).toHaveBeenCalledWith(
				expect.any(Function),
				30 * constants_1.Time.seconds.toMilliseconds,
			);
			await server.stop();
		});
		it('should clear heartbeat timer on server stop', async () => {
			jest.spyOn(global, 'setInterval');
			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
			const server = new task_broker_ws_server_1.TaskBrokerWsServer(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)({ path: '/runners', heartbeatInterval: 30 }),
				(0, jest_mock_extended_1.mock)(),
			);
			server.start();
			await server.stop();
			expect(clearIntervalSpy).toHaveBeenCalled();
		});
	});
	describe('sendMessage', () => {
		it('should work with a message containing circular references', () => {
			const server = new task_broker_ws_server_1.TaskBrokerWsServer(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
			);
			const ws = (0, jest_mock_extended_1.mock)();
			server.runnerConnections.set('test-runner', ws);
			const messageData = {};
			messageData.circular = messageData;
			expect(() =>
				server.sendMessage('test-runner', {
					type: 'broker:taskdataresponse',
					taskId: 'taskId',
					requestId: 'requestId',
					data: messageData,
				}),
			).not.toThrow();
			expect(ws.send).toHaveBeenCalledWith(
				'{"type":"broker:taskdataresponse","taskId":"taskId","requestId":"requestId","data":{"circular":"[Circular Reference]"}}',
			);
		});
	});
});
//# sourceMappingURL=task-broker-ws-server.test.js.map
