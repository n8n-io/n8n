import { TaskRunnersConfig } from '@n8n/config';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent';
import Container from 'typedi';

import { TaskRunnerServer } from '@/runners/task-runner-server';

export interface TestTaskBrokerServer {
	server: TaskRunnerServer;
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

	const taskRunnerServer = Container.get(TaskRunnerServer);
	const agent = request.agent(taskRunnerServer.app);

	return {
		server: taskRunnerServer,
		agent,
		config: runnerConfig,
	};
};
