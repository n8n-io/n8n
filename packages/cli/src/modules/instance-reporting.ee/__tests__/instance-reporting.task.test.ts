import type { EventService } from '@n8n/backend-services';
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { ScheduledJobRepository } from '@n8n/db';
import { resolveSystemTaskRunOptions, SystemTaskMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Tracing, type ErrorReporter, type InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { DurableScheduler } from '@/scheduling/durable-scheduler';
import type { SystemTaskJobRegistrar } from '@/scheduling/system-tasks/system-task-job-registrar';
import { SystemTaskRunner } from '@/scheduling/system-tasks/system-task-runner';
import { SystemTaskScheduledJobOwner } from '@/scheduling/system-tasks/system-task-scheduled-job-owner';

import type { InstanceMonitoringReport } from '../database/entities/instance-monitoring-report';
import {
	InstanceReportAlreadyCreatedError,
	type InstanceReportingService,
} from '../instance-reporting.service';
import { InstanceReportingTask } from '../instance-reporting.task';

function setup() {
	const service = mock<InstanceReportingService>();
	service.findDueWork.mockResolvedValue({ expiredReport: null, reportDue: true });
	const task = new InstanceReportingTask(service);
	return { service, task };
}

describe('InstanceReportingTask', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-26T07:43:00.000Z'));
	});

	afterEach(() => vi.useRealTimers());

	it('leaves delivery retries to the report row', () => {
		const { task } = setup();
		expect(resolveSystemTaskRunOptions(task)).toMatchObject({ maxAttempts: 1 });
		expect(task.schedule).toEqual({
			kind: 'interval',
			intervalSeconds: 15 * Time.minutes.toSeconds,
		});
	});

	it('sends the report when one is due', async () => {
		const { task, service } = setup();
		await task.run();
		expect(service.findDueWork).toHaveBeenCalledWith(new Date());
		expect(service.sendReport).toHaveBeenCalledTimes(1);
	});

	it('sends nothing when no report is due', async () => {
		const { task, service } = setup();
		service.findDueWork.mockResolvedValue({ expiredReport: null, reportDue: false });
		await task.run();
		expect(service.skip).not.toHaveBeenCalled();
		expect(service.sendReport).not.toHaveBeenCalled();
	});

	it('skips an expired report before it sends', async () => {
		const { task, service } = setup();
		const expiredReport = mock<InstanceMonitoringReport>({
			id: 'pending-report',
			attempts: 1,
			lastError: 'Network error',
		});
		service.findDueWork.mockResolvedValue({ expiredReport, reportDue: true });
		await task.run();
		expect(service.skip).toHaveBeenCalledWith('pending-report', 1, 'slot-passed', 'Network error');
		expect(service.skip.mock.invocationCallOrder[0]).toBeLessThan(
			service.sendReport.mock.invocationCallOrder[0],
		);
	});

	it('leaves a concurrent creator to deliver the stored report', async () => {
		const { task, service } = setup();
		service.sendReport.mockRejectedValue(new InstanceReportAlreadyCreatedError());
		await expect(task.run()).resolves.toBeUndefined();
	});

	it('exposes a delivery failure to the runner', async () => {
		const { task, service } = setup();
		service.sendReport.mockRejectedValue(new Error('Network error'));
		await expect(task.run()).rejects.toThrow('Network error');
	});

	it('recovers from a failed read of the due work on the next pass', async () => {
		const { task, service } = setup();
		service.findDueWork.mockRejectedValueOnce(new Error('DB unavailable'));
		await expect(task.run()).rejects.toThrow('DB unavailable');
		await task.run();
		expect(service.sendReport).toHaveBeenCalledTimes(1);
	});

	describe('runner placement', () => {
		function setupRunner(
			isLeader: boolean,
			schedulerActive: boolean,
			enabledForSystemTasks: boolean,
		) {
			const harness = setup();
			Container.set(InstanceReportingTask, harness.task);
			const metadata = new SystemTaskMetadata();
			metadata.register(InstanceReportingTask);
			const scheduler = mock<DurableScheduler>();
			scheduler.isActive.mockReturnValue(schedulerActive);
			const registrar = mock<SystemTaskJobRegistrar>();
			const runner = new SystemTaskRunner(
				mockLogger(),
				metadata,
				scheduler,
				registrar,
				new SystemTaskScheduledJobOwner(mock<ScheduledJobRepository>()),
				mock<GlobalConfig>({ generic: { timezone: 'UTC' }, scheduler: { enabledForSystemTasks } }),
				mock<InstanceSettings>({
					instanceType: 'main',
					instanceRole: isLeader ? 'leader' : 'follower',
					isLeader,
				}),
				mock<ErrorReporter>(),
				mock<EventService>(),
				new Tracing(),
			);
			onTestFinished(async () => await runner.shutdown());
			return { ...harness, runner, scheduler, registrar };
		}

		it.each([
			[false, false],
			[true, false],
			[false, true],
		])(
			'catches up on the leader timer with scheduler=%s and systemTasks=%s',
			async (schedulerActive, enabledForSystemTasks) => {
				const { runner, service, scheduler } = setupRunner(
					true,
					schedulerActive,
					enabledForSystemTasks,
				);
				await runner.init();
				await vi.advanceTimersByTimeAsync(0);
				expect(service.sendReport).toHaveBeenCalledTimes(1);
				service.findDueWork.mockResolvedValue({ expiredReport: null, reportDue: false });
				await vi.advanceTimersByTimeAsync(15 * Time.minutes.toMilliseconds);
				expect(service.sendReport).toHaveBeenCalledTimes(1);
				expect(service.findDueWork).toHaveBeenCalledTimes(2);
				expect(scheduler.registerTaskHandler).not.toHaveBeenCalled();
			},
		);

		it('keeps a follower idle in timer mode and catches up on takeover', async () => {
			const { runner, service } = setupRunner(false, false, false);
			await runner.init();
			await vi.advanceTimersByTimeAsync(15 * Time.minutes.toMilliseconds);
			expect(service.sendReport).not.toHaveBeenCalled();
			runner.startLeaderTimers();
			await vi.advanceTimersByTimeAsync(0);
			expect(service.sendReport).toHaveBeenCalledTimes(1);
			await runner.stopLeaderTimers();
			await vi.advanceTimersByTimeAsync(15 * Time.minutes.toMilliseconds);
			expect(service.sendReport).toHaveBeenCalledTimes(1);
		});

		it.each([true, false])(
			'provisions a durable task without starting a timer when isLeader=%s',
			async (isLeader) => {
				const { runner, service, task, scheduler, registrar } = setupRunner(isLeader, true, true);
				await runner.init();
				await vi.advanceTimersByTimeAsync(15 * Time.minutes.toMilliseconds);
				expect(service.sendReport).not.toHaveBeenCalled();
				expect(registrar.provision).toHaveBeenCalledWith(task);
				expect(scheduler.registerTaskHandler).toHaveBeenCalledWith(
					'system:instance-reporting',
					expect.anything(),
				);
			},
		);
	});
});
