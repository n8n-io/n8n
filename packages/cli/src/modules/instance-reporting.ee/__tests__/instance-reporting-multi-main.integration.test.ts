import { createFakeOutboundHttp, type Route } from '@n8n/backend-network/testing';
import type { EventService } from '@n8n/backend-services';
import { mockLogger, testDb, testModules } from '@n8n/backend-test-utils';
import { Time } from '@n8n/constants';
import type { LicenseMetricsRepository } from '@n8n/db';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler, type Scheduler, type SchedulerPasses } from '@n8n/scheduler';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { Tracing, type InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { License } from '@/license';
import { InsightsConfig } from '@/modules/insights/insights.config';
import type { InsightsService } from '@/modules/insights/insights.service';
import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';
import { SystemTaskHandler } from '@/scheduling/system-tasks/system-task-handler';
import { systemTaskProvisionRequest } from '@/scheduling/system-tasks/system-task-job-registrar';
import { SystemTaskScheduledJobOwner } from '@/scheduling/system-tasks/system-task-scheduled-job-owner';
import { retryUntil } from '@test-integration/retry-until';

import { InstanceMonitoringReportRepository } from '../database/repositories/instance-monitoring-report.repository';
import type { InstanceReportingSettingsService } from '../instance-reporting-settings.service';
import { InstanceReportingConfig } from '../instance-reporting.config';
import { INSTANCE_REPORTS_PATH } from '../instance-reporting.constants';
import { InstanceReportingService } from '../instance-reporting.service';
import { InstanceReportingTask } from '../instance-reporting.task';

const TASK_TYPE = 'system:instance-reporting';
const REPORT_DAY = new Date(Date.now() - Time.days.toMilliseconds).toISOString().slice(0, 10);
const accepted: Route = { method: 'POST', pathname: INSTANCE_REPORTS_PATH, status: 201 };

describe('instance reporting across mains', () => {
	let reports: InstanceMonitoringReportRepository;
	let jobs: ScheduledJobRepository;
	let occurrences: ScheduledTaskRepository;
	let schedulers: Array<Scheduler & SchedulerPasses> = [];

	beforeAll(async () => {
		await testModules.loadModules(['insights', 'instance-reporting']);
		await testDb.init();
		reports = Container.get(InstanceMonitoringReportRepository);
		jobs = Container.get(ScheduledJobRepository);
		occurrences = Container.get(ScheduledTaskRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['InstanceMonitoringReport', 'ScheduledTask', 'ScheduledJob']);
		// Keep the database clock aligned with the simulated report slots in these tests.
		vi.spyOn(reports, 'readDbNow').mockImplementation(async () => new Date());
	});

	afterEach(async () => {
		await Promise.all(schedulers.map(async (scheduler) => await scheduler.stop()));
		schedulers = [];
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	afterAll(async () => await testDb.terminate());

	function buildMain(hostId: string, isLeader: boolean, routes: Route[] = [accepted]) {
		const { outboundHttp, httpRequest } = createFakeOutboundHttp(
			routes,
			vi.fn as unknown as Parameters<typeof createFakeOutboundHttp>[1],
		);
		const config = new InstanceReportingConfig();
		config.instanceReportingBaseUrl = 'https://receiver.test';
		const insights = mock<InsightsService>();
		insights.getDailyBillableExecutions.mockResolvedValue(new Map([[REPORT_DAY, 5]]));
		const metrics = mock<LicenseMetricsRepository>();
		metrics.getLicenseRenewalMetrics.mockResolvedValue(
			mock<Awaited<ReturnType<LicenseMetricsRepository['getLicenseRenewalMetrics']>>>({
				productionRootExecutions: 10,
			}),
		);
		const events = mock<EventService>();
		const service = new InstanceReportingService(
			config,
			reports,
			mock<InstanceReportingSettingsService>({ getReportTime: async () => '00:00' }),
			insights,
			new InsightsConfig(),
			mock<InstanceSettings>({ instanceId: 'shared-instance', instanceType: 'main', isLeader }),
			metrics,
			mock<License>({ loadCertStr: async () => 'license-cert' }),
			mockLogger(),
			events,
			outboundHttp,
		);
		const task = new InstanceReportingTask(service);
		const scheduler = createScheduler({
			hostId,
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobs,
				occurrences,
			),
			taskStore: occurrences,
			executor: { leaseSeconds: 30, lookaheadSeconds: 0, batchSize: 1 },
		});
		scheduler.registerTaskHandler(
			TASK_TYPE,
			new SystemTaskHandler(
				task,
				new AbortController().signal,
				mockLogger(),
				events,
				new Tracing(),
				vi.fn(),
			),
		);
		schedulers.push(scheduler);
		return { task, scheduler, httpRequest, insights };
	}

	async function provision(task: InstanceReportingTask) {
		await Container.get(DurableJobProvisioner).provision(
			systemTaskProvisionRequest(
				task,
				Container.get(SystemTaskScheduledJobOwner),
				'UTC',
				new Date(),
			),
		);
		return await jobs.findOneByOrFail({ name: TASK_TYPE });
	}

	async function expectOccurrenceStatus(status: 'succeeded' | 'failed') {
		await retryUntil(
			async () => {
				expect(await occurrences.countBy({ status })).toBe(1);
			},
			{ timeoutMs: 5000 },
		);
	}

	it('sends once when two mains claim the same due occurrence', async () => {
		const leader = buildMain('main-a', true);
		const follower = buildMain('main-b', false);
		await provision(leader.task);
		await provision(follower.task);
		expect(await jobs.count()).toBe(1);

		const claims = await Promise.all([leader.scheduler.execute(), follower.scheduler.execute()]);
		expect(claims.flat()).toHaveLength(1);
		await expectOccurrenceStatus('succeeded');

		expect(leader.httpRequest.mock.calls.length + follower.httpRequest.mock.calls.length).toBe(1);
		expect(await reports.countBy({ status: 'delivered' })).toBe(1);
		await Promise.all([leader.task.run(), follower.task.run()]);
		expect(leader.httpRequest.mock.calls.length + follower.httpRequest.mock.calls.length).toBe(1);
	});

	it('delivers on a follower without a leader check', async () => {
		const follower = buildMain('main-b', false);
		await provision(follower.task);
		await follower.scheduler.execute();
		await expectOccurrenceStatus('succeeded');

		expect(follower.httpRequest).toHaveBeenCalledTimes(1);
		expect(await occurrences.findOneByOrFail({ status: 'succeeded' })).toMatchObject({
			claimedBy: 'main-b',
		});
	});

	it('records a failed occurrence once and resumes the report on another main after five minutes', async () => {
		const leader = buildMain('main-a', true, [{ ...accepted, status: 503 }]);
		const job = await provision(leader.task);
		await leader.scheduler.execute();
		await expectOccurrenceStatus('failed');
		expect(await occurrences.findOneByOrFail({ jobId: job.id })).toMatchObject({
			attempts: 1,
			maxAttempts: 1,
		});
		const [pending] = await reports.find();
		expect(pending).toMatchObject({ status: 'pending', attempts: 1 });

		const follower = buildMain('main-b', false);
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(pending.lastAttemptAt!.getTime() + Time.minutes.toMilliseconds);
		await follower.task.run();
		expect(follower.httpRequest).not.toHaveBeenCalled();

		vi.setSystemTime(pending.lastAttemptAt!.getTime() + 5 * Time.minutes.toMilliseconds);
		await follower.task.run();
		expect(follower.httpRequest).toHaveBeenCalledTimes(1);
		expect(follower.httpRequest.mock.calls[0][0].body).toMatchObject({
			batchId: pending.id,
			dataPoints: pending.dataPoints,
		});
		expect(await reports.findOneByOrFail({ id: pending.id })).toMatchObject({
			status: 'delivered',
			attempts: 2,
		});
	});

	it('keeps one batch when two passes collect different measurements at once', async () => {
		const leader = buildMain('main-a', true);
		const follower = buildMain('main-b', false);
		let arrived = 0;
		const barrier = createDeferredPromise();
		for (const [index, main] of [leader, follower].entries()) {
			main.insights.getDailyBillableExecutions.mockImplementation(async () => {
				if (++arrived === 2) barrier.resolve();
				await barrier.promise;
				return new Map([[REPORT_DAY, index + 1]]);
			});
		}

		await Promise.all([leader.task.run(), follower.task.run()]);

		expect(await reports.count()).toBe(1);
		const calls = [...leader.httpRequest.mock.calls, ...follower.httpRequest.mock.calls];
		expect(calls).toHaveLength(1);
		const [report] = await reports.find();
		expect(calls[0][0].body).toMatchObject({ batchId: report.id, dataPoints: report.dataPoints });
	});

	it('resends the same batch after the receiver accepted a report before a main stopped', async () => {
		const pending = await reports.createPending(
			[{ kind: 'daily', name: 'billableExecutions', value: 5, date: REPORT_DAY }],
			new Date(),
		);
		const follower = buildMain('main-b', false, [{ ...accepted, status: 409 }]);
		await provision(follower.task);
		await follower.scheduler.execute();
		await expectOccurrenceStatus('succeeded');

		expect(follower.httpRequest.mock.calls[0][0].body).toMatchObject({
			batchId: pending?.id,
			dataPoints: pending?.dataPoints,
		});
		expect(await reports.countBy({ status: 'delivered' })).toBe(1);
	});

	it('waits for an in-flight send before expiring its report at the next slot', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-03-26T23:59:50.000Z'));
		const pending = await reports.createPending(
			[{ kind: 'daily', name: 'billableExecutions', value: 5, date: '2026-03-25' }],
			new Date(),
		);
		if (!pending) throw new Error('Could not create the pending report');
		await reports.update({ id: pending.id }, { createdAt: new Date() });

		const leader = buildMain('main-a', true);
		const follower = buildMain('main-b', false);
		const requestStarted = createDeferredPromise();
		const releaseResponse = createDeferredPromise();
		vi.mocked(leader.httpRequest).mockImplementation(async () => {
			requestStarted.resolve();
			await releaseResponse.promise;
			return { statusCode: 201, body: undefined, headers: {} };
		});

		const firstPass = leader.task.run();
		await requestStarted.promise;
		vi.setSystemTime(new Date('2026-03-27T00:00:10.000Z'));
		await follower.task.run();
		expect(await reports.count()).toBe(1);
		expect(follower.httpRequest).not.toHaveBeenCalled();

		releaseResponse.resolve();
		await firstPass;
		expect(await reports.findOneByOrFail({ id: pending.id })).toMatchObject({
			status: 'delivered',
		});
		await follower.task.run();
		expect(follower.httpRequest).toHaveBeenCalledTimes(1);
		expect(await reports.count()).toBe(2);
	});

	it('resumes a claim left by a stopped main on a later pass', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-03-26T07:43:00.000Z'));
		const pending = await reports.createPending(
			[{ kind: 'daily', name: 'billableExecutions', value: 5, date: '2026-03-25' }],
			new Date(),
		);
		if (!pending) throw new Error('Could not create the pending report');
		await reports.update({ id: pending.id }, { createdAt: new Date() });
		await reports.claimForSend(pending.id);

		const follower = buildMain('main-b', false);
		vi.setSystemTime(new Date('2026-03-26T07:46:00.000Z'));
		await follower.task.run();
		expect(follower.httpRequest).not.toHaveBeenCalled();
		expect(await reports.findOneByOrFail({ id: pending.id })).toMatchObject({ status: 'pending' });

		vi.setSystemTime(new Date('2026-03-26T07:48:00.000Z'));
		await follower.task.run();
		expect(follower.httpRequest).toHaveBeenCalledTimes(1);
		expect(follower.httpRequest.mock.calls[0][0].body).toMatchObject({ batchId: pending.id });
		expect(await reports.findOneByOrFail({ id: pending.id })).toMatchObject({
			status: 'delivered',
		});
	});

	it('records a late 201 after another main reclaims the batch', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-03-26T07:43:00.000Z'));
		const pending = await reports.createPending(
			[{ kind: 'daily', name: 'billableExecutions', value: 5, date: '2026-03-25' }],
			new Date(),
		);
		if (!pending) throw new Error('Could not create the pending report');
		await reports.update({ id: pending.id }, { createdAt: new Date() });
		const leader = buildMain('main-a', true);
		const follower = buildMain('main-b', false);
		const firstRequestStarted = createDeferredPromise();
		const releaseFirstResponse = createDeferredPromise();
		const secondRequestStarted = createDeferredPromise();
		const releaseSecondResponse = createDeferredPromise();
		vi.mocked(leader.httpRequest).mockImplementationOnce(async () => {
			firstRequestStarted.resolve();
			await releaseFirstResponse.promise;
			return { statusCode: 201, body: undefined, headers: {} };
		});
		vi.mocked(follower.httpRequest).mockImplementationOnce(async () => {
			secondRequestStarted.resolve();
			await releaseSecondResponse.promise;
			throw new Error('Reclaimed request failed');
		});

		const firstPass = leader.task.run();
		await firstRequestStarted.promise;
		vi.setSystemTime(new Date('2026-03-26T07:58:00.000Z'));
		const secondResult = expect(follower.task.run()).rejects.toThrow('Reclaimed request failed');
		await secondRequestStarted.promise;
		expect(follower.httpRequest.mock.calls[0][0].body).toEqual(
			leader.httpRequest.mock.calls[0][0].body,
		);
		expect(await reports.findOneByOrFail({ id: pending.id })).toMatchObject({
			status: 'sending',
			lastAttemptAt: new Date(),
		});

		releaseFirstResponse.resolve();
		await firstPass;
		const delivered = await reports.findOneByOrFail({ id: pending.id });
		releaseSecondResponse.resolve();
		await secondResult;
		expect(delivered).toMatchObject({ status: 'delivered', attempts: 1 });
		expect(await reports.findOneByOrFail({ id: pending.id })).toEqual(delivered);

		vi.setSystemTime(new Date('2026-03-26T08:13:00.000Z'));
		await follower.task.run();
		expect(follower.httpRequest).toHaveBeenCalledTimes(1);
		vi.setSystemTime(new Date('2026-03-27T07:43:00.000Z'));
		await follower.task.run();
		expect(follower.httpRequest).toHaveBeenCalledTimes(2);
		expect(follower.httpRequest.mock.calls[1][0].body).toMatchObject({
			dataPoints: [
				expect.objectContaining({ kind: 'cumulative' }),
				expect.objectContaining({ kind: 'daily', date: '2026-03-26' }),
			],
		});
	});

	it.each(['success', 'failure'])(
		'ignores a late %s after another main delivers the batch',
		async (outcome) => {
			vi.useFakeTimers({ toFake: ['Date'] });
			vi.setSystemTime(new Date('2026-03-26T07:43:00.000Z'));
			const pending = await reports.createPending(
				[{ kind: 'daily', name: 'billableExecutions', value: 5, date: '2026-03-25' }],
				new Date(),
			);
			if (!pending) throw new Error('Could not create the pending report');
			await reports.update({ id: pending.id }, { createdAt: new Date() });
			const leader = buildMain('main-a', true);
			const follower = buildMain('main-b', false);
			const requestStarted = createDeferredPromise();
			const releaseResponse = createDeferredPromise();
			vi.mocked(leader.httpRequest).mockImplementation(async () => {
				requestStarted.resolve();
				await releaseResponse.promise;
				if (outcome === 'failure') throw new Error('Late response failed');
				return { statusCode: 201, body: undefined, headers: {} };
			});

			const firstPass = leader.task.run();
			const firstResult =
				outcome === 'failure'
					? expect(firstPass).rejects.toThrow('Late response failed')
					: expect(firstPass).resolves.toBeUndefined();
			await requestStarted.promise;
			vi.setSystemTime(new Date('2026-03-26T07:58:00.000Z'));
			await follower.task.run();
			const delivered = await reports.findOneByOrFail({ id: pending.id });
			expect(delivered).toMatchObject({ status: 'delivered', attempts: 1 });

			releaseResponse.resolve();
			await firstResult;
			expect(await reports.findOneByOrFail({ id: pending.id })).toEqual(delivered);
			await follower.task.run();
			expect(follower.httpRequest).toHaveBeenCalledTimes(1);
		},
	);
});
