import type { TaskRunnersConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { Time } from '@/constants';
import { TaskRunnerWsServer } from '@/runners/runner-ws-server';

describe('TaskRunnerWsServer', () => {
	describe('heartbeat timer', () => {
		it('should set up heartbeat timer on server start', async () => {
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			const server = new TaskRunnerWsServer(
				mock(),
				mock(),
				mock(),
				mock<TaskRunnersConfig>({ path: '/runners', heartbeatInterval: 30 }),
				mock(),
			);

			expect(setIntervalSpy).toHaveBeenCalledWith(
				expect.any(Function),
				30 * Time.seconds.toMilliseconds,
			);

			await server.shutdown();
		});

		it('should clear heartbeat timer on server stop', async () => {
			jest.spyOn(global, 'setInterval');
			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

			const server = new TaskRunnerWsServer(
				mock(),
				mock(),
				mock(),
				mock<TaskRunnersConfig>({ path: '/runners', heartbeatInterval: 30 }),
				mock(),
			);

			await server.shutdown();

			expect(clearIntervalSpy).toHaveBeenCalled();
		});
	});
});
