import { testDb } from '@n8n/backend-test-utils';
import { CacheService, EventService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { ScheduledJobRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import promClient from 'prom-client';

import { PrometheusSystemTaskMetricsService } from '@/metrics/prometheus/system-task-metrics.service';
import { emitSystemTaskMetric } from '@/scheduling/system-tasks/emit-system-task-metric';

import { createDueJobFactory } from './shared/job-factory';

/**
 * The scheduled and next-run series of a durable system task, read from its
 * stored job on scrape, against the real database.
 */
describe('system task durable job metrics', () => {
	let jobRepo: ScheduledJobRepository;
	let cacheService: CacheService;
	let createJob: ReturnType<typeof createDueJobFactory>;

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		cacheService = Container.get(CacheService);
		await cacheService.init();
		createJob = createDueJobFactory(jobRepo, 'system:prune', 'metrics');

		const { metrics } = Container.get(GlobalConfig).endpoints;
		metrics.prefix = 'n8n_';
		metrics.includeSystemTaskMetrics = true;
	});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
		await cacheService.reset();
		promClient.register.clear();
		Container.get(EventService).removeAllListeners();
		Container.get(PrometheusSystemTaskMetricsService).init();
		emitSystemTaskMetric(Container.get(EventService), 'system-task-routed', {
			name: 'prune',
			mode: 'durable',
		});
		emitSystemTaskMetric(Container.get(EventService), 'system-task-next-run-planned', {
			name: 'prune',
			nextRunAtMs: Date.now(),
		});
	});

	afterAll(async () => {
		promClient.register.clear();
		await testDb.terminate();
	});

	async function valueOf(metricName: string, labels: Record<string, string>) {
		const { values } = await promClient.register.getSingleMetric(metricName)!.get();
		return values.find(({ labels: actual }) =>
			Object.entries(labels).every(([key, value]) => actual[key] === value),
		)?.value;
	}

	it('exports the stored next run of a runnable job', async () => {
		const nextRunAt = new Date('2030-01-01T00:00:00.000Z');
		await createJob({ ownerId: 'prune', nextRunAt });

		expect(await valueOf('n8n_system_task_scheduled', { task: 'prune', mode: 'durable' })).toBe(1);
		expect(await valueOf('n8n_system_task_next_run_timestamp_seconds', { task: 'prune' })).toBe(
			nextRunAt.getTime() / 1000,
		);
	});

	it('marks the task unscheduled once its job is quarantined', async () => {
		await createJob({ ownerId: 'prune', orphanedAt: new Date() });

		expect(await valueOf('n8n_system_task_scheduled', { task: 'prune', mode: 'durable' })).toBe(0);
		expect(
			await valueOf('n8n_system_task_next_run_timestamp_seconds', { task: 'prune' }),
		).toBeUndefined();
	});

	it('marks the task unscheduled when no job is stored', async () => {
		expect(await valueOf('n8n_system_task_scheduled', { task: 'prune', mode: 'durable' })).toBe(0);
	});
});
