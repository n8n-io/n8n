import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import type { Scheduler, SchedulerPasses } from '@n8n/scheduler';
import { createScheduler } from '@n8n/scheduler';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { DurableScheduler } from '../durable-scheduler';
import { SCHEDULE_TRIGGER_TASK_TYPE } from '../schedule-trigger-node/schedule-trigger-task';
import type { ScheduleTriggerTaskHandler } from '../schedule-trigger-node/schedule-trigger-task-handler';

// Keep the real exports (e.g. executorLookaheadSeconds) so the wiring is tested
// against the actual formula; only the scheduler factory is stubbed.
vi.mock('@n8n/scheduler', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/scheduler')>()),
	createScheduler: vi.fn(),
}));

describe('DurableScheduler', () => {
	function makeScheduler({ enabled = true, instanceType = 'main', dbType = 'sqlite' } = {}) {
		const inner = mock<Scheduler & SchedulerPasses>();
		vi.mocked(createScheduler).mockReturnValue(inner);
		const logger = mockLogger();
		const scheduleTriggerTaskHandler = mock<ScheduleTriggerTaskHandler>({
			taskType: SCHEDULE_TRIGGER_TASK_TYPE,
		});
		const scheduler = new DurableScheduler(
			logger,
			mock<DataSource>(),
			mock<ScheduledJobRepository>(),
			mock<ScheduledTaskRepository>(),
			mock<InstanceSettings>({ instanceType: instanceType as 'main' | 'worker' | 'webhook' }),
			mock<GlobalConfig>({
				generic: { timezone: 'UTC' },
				database: { type: dbType as 'sqlite' | 'postgresdb' },
				scheduler: { enabled, executorIntervalSeconds: 5, jitterRatio: 0.1 },
			}),
			scheduleTriggerTaskHandler,
		);
		return { scheduler, inner, logger };
	}

	describe('composition', () => {
		it('widens the executor lookahead by the full symmetric jitter span', () => {
			makeScheduler();

			// Consecutive executor ticks can be up to interval·(1+2·jitter) apart (one early,
			// the next late), so the claim horizon must cover the whole span or a task due in
			// the tail fires late. Defaults 5s · (1 + 2·0.1) = 6.
			const deps = vi.mocked(createScheduler).mock.calls.at(-1)?.[0];
			expect(deps?.executor?.lookaheadSeconds).toBeCloseTo(6.0);
		});

		it('runs passes concurrently on Postgres, which claims with row locks', () => {
			makeScheduler({ dbType: 'postgresdb' });

			const deps = vi.mocked(createScheduler).mock.calls.at(-1)?.[0];
			expect(deps?.lifecycle?.concurrencyMode).toBe('concurrent');
		});

		it('runs passes sequentially on SQLite, which serialises writers', () => {
			makeScheduler({ dbType: 'sqlite' });

			const deps = vi.mocked(createScheduler).mock.calls.at(-1)?.[0];
			expect(deps?.lifecycle?.concurrencyMode).toBe('sequential');
		});
	});

	describe('registerTaskHandler', () => {
		it('delegates to the inner scheduler when active', () => {
			const { scheduler, inner } = makeScheduler();
			const handler = { execute: vi.fn() };

			scheduler.registerTaskHandler('some-task', handler);

			expect(inner.registerTaskHandler).toHaveBeenCalledWith('some-task', handler);
		});
	});

	describe('start', () => {
		it('starts the loops on a main when the scheduler is enabled', () => {
			const { scheduler, inner } = makeScheduler();

			scheduler.start();

			expect(inner.start).toHaveBeenCalledTimes(1);
		});

		it('does not start when the scheduler is disabled', () => {
			const { scheduler, inner } = makeScheduler({ enabled: false });

			scheduler.start();

			expect(inner.start).not.toHaveBeenCalled();
		});

		it('does not start on a non-main instance', () => {
			const { scheduler, inner } = makeScheduler({ instanceType: 'worker' });

			scheduler.start();

			expect(inner.start).not.toHaveBeenCalled();
		});
	});

	describe('stop', () => {
		it('stops a started scheduler', async () => {
			const { scheduler, inner } = makeScheduler();
			scheduler.start();

			await scheduler.stop();

			expect(inner.stop).toHaveBeenCalledTimes(1);
		});

		it('does not stop a scheduler that never started', async () => {
			const { scheduler, inner } = makeScheduler({ enabled: false });
			scheduler.start();

			await scheduler.stop();

			expect(inner.stop).not.toHaveBeenCalled();
		});
	});
});
