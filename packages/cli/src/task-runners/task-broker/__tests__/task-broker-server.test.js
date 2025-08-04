'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const node_http_1 = require('node:http');
const task_broker_server_1 = require('@/task-runners/task-broker/task-broker-server');
describe('TaskBrokerServer', () => {
	describe('handleUpgradeRequest', () => {
		it('should close WebSocket when response status code is > 200', () => {
			const ws = (0, jest_mock_extended_1.mock)();
			const request = (0, jest_mock_extended_1.mock)({
				url: '/runners/_ws',
				ws,
			});
			const server = new task_broker_server_1.TaskBrokerServer(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)({ taskRunners: { path: '/runners' } }),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
			);
			server.handleUpgradeRequest(request, (0, jest_mock_extended_1.mock)(), Buffer.from(''));
			const response = new node_http_1.ServerResponse(request);
			response.writeHead = (statusCode) => {
				if (statusCode > 200) ws.close();
				return response;
			};
			response.writeHead(401);
			expect(ws.close).toHaveBeenCalledWith();
		});
		it('should not close WebSocket when response status code is 200', () => {
			const ws = (0, jest_mock_extended_1.mock)();
			const request = (0, jest_mock_extended_1.mock)({
				url: '/runners/_ws',
				ws,
			});
			const server = new task_broker_server_1.TaskBrokerServer(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)({ taskRunners: { path: '/runners' } }),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
			);
			server.handleUpgradeRequest(request, (0, jest_mock_extended_1.mock)(), Buffer.from(''));
			const response = new node_http_1.ServerResponse(request);
			response.writeHead = (statusCode) => {
				if (statusCode > 200) ws.close();
				return response;
			};
			response.writeHead(200);
			expect(ws.close).not.toHaveBeenCalled();
		});
	});
});
//# sourceMappingURL=task-broker-server.test.js.map
