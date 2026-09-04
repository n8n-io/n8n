import type { Logger } from '@n8n/backend-common';
import type { TaskRunnersConfig } from '@n8n/config';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { TaskBrokerServer } from '@/task-runners/task-broker/task-broker-server';
import type { JsTaskRunnerProcess } from '@/task-runners/task-runner-process-js';
import type { PyTaskRunnerProcess } from '@/task-runners/task-runner-process-py';
import { TaskRunnerModule } from '@/task-runners/task-runner-module';

describe('TaskRunnerModule', () => {
	describe('stop', () => {
		it('should stop the broker server before the runner processes, so the drain can finish in-flight tasks first', async () => {
			const logger = mock<Logger>();
			logger.scoped.mockReturnValue(logger);
			const module = new TaskRunnerModule(
				logger,
				mock<ErrorReporter>(),
				mock<TaskRunnersConfig>(),
				mock<EventService>(),
			);

			const brokerServer = mock<TaskBrokerServer>();
			const jsRunnerProcess = mock<JsTaskRunnerProcess>();
			const pyRunnerProcess = mock<PyTaskRunnerProcess>();
			Object.assign(module, {
				taskBrokerHttpServer: brokerServer,
				jsRunnerProcess,
				pyRunnerProcess,
			});

			let brokerServerStopped = false;
			brokerServer.stop.mockImplementation(async () => {
				brokerServerStopped = true;
			});
			jsRunnerProcess.stop.mockImplementation(async () => {
				expect(brokerServerStopped).toBe(true);
			});
			pyRunnerProcess.stop.mockImplementation(async () => {
				expect(brokerServerStopped).toBe(true);
			});

			await module.stop();

			expect(brokerServer.stop).toHaveBeenCalledTimes(1);
			expect(jsRunnerProcess.stop).toHaveBeenCalledTimes(1);
			expect(pyRunnerProcess.stop).toHaveBeenCalledTimes(1);
		});
	});
});
