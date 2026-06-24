import { mock } from 'jest-mock-extended';
import type { CronRegistry } from 'n8n-core';

import { AgentTaskScheduler } from '../agent-task-scheduler';

describe('AgentTaskScheduler', () => {
	const cronRegistry = mock<CronRegistry>();
	const scheduler = new AgentTaskScheduler(cronRegistry);

	beforeEach(() => {
		jest.clearAllMocks();
		cronRegistry.register.mockReturnValue(true);
	});

	it('registers task crons in the agent-task namespace', () => {
		const onTick = jest.fn();

		const registered = scheduler.register('agent-1', 'task-1', '0 9 * * *', 'UTC', onTick);

		expect(registered).toBe(true);
		expect(cronRegistry.register).toHaveBeenCalledWith(
			{
				namespace: 'agent-task',
				ownerId: 'agent-1',
				targetId: 'task-1',
				expression: '0 9 * * *',
				timezone: 'UTC',
			},
			onTick,
		);
	});

	it('deregisters a task cron in the agent-task namespace', () => {
		scheduler.deregister('agent-1', 'task-1');

		expect(cronRegistry.deregisterTarget).toHaveBeenCalledWith('agent-task', 'agent-1', 'task-1');
	});

	it('returns false when the cron registry skips a duplicate registration', () => {
		cronRegistry.register.mockReturnValue(false);

		const registered = scheduler.register('agent-1', 'task-1', '0 9 * * *', 'UTC', jest.fn());

		expect(registered).toBe(false);
	});
});
