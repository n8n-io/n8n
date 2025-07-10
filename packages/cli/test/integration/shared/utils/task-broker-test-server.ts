import { TaskRunnersConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';

import { TaskBrokerServer } from '@/task-runners/task-broker/task-broker-server';

export interface TestTaskBrokerServer {
	server: TaskBrokerServer;
	agent: TestAgent;
	config: TaskRunnersConfig;
}

/**
 * Sets up a Task Broker Server for testing purposes. The server needs
 * to be started and stopped manually.
 *
 * @example
 * const { server, agent, config } = setupBrokerTestServer();
 *
 * beforeAll(async () => await server.start());
 * afterAll(async () => await server.stop());
 */
export const setupBrokerTestServer = (
	config: Partial<TaskRunnersConfig> = {},
): TestTaskBrokerServer => {
	const runnerConfig = Container.get(TaskRunnersConfig);
	Object.assign(runnerConfig, config);
	runnerConfig.enabled = true;
	runnerConfig.port = 0; // Use any port

	const taskBrokerServer = Container.get(TaskBrokerServer);
	const agent = request.agent(taskBrokerServer.app);

	return {
		server: taskBrokerServer,
		agent,
		config: runnerConfig,
	};
};
