'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.setupBrokerTestServer = void 0;
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const supertest_1 = __importDefault(require('supertest'));
const task_broker_server_1 = require('@/task-runners/task-broker/task-broker-server');
const setupBrokerTestServer = (config = {}) => {
	const runnerConfig = di_1.Container.get(config_1.TaskRunnersConfig);
	Object.assign(runnerConfig, config);
	runnerConfig.enabled = true;
	runnerConfig.port = 0;
	const taskBrokerServer = di_1.Container.get(task_broker_server_1.TaskBrokerServer);
	const agent = supertest_1.default.agent(taskBrokerServer.app);
	return {
		server: taskBrokerServer,
		agent,
		config: runnerConfig,
	};
};
exports.setupBrokerTestServer = setupBrokerTestServer;
//# sourceMappingURL=task-broker-test-server.js.map
