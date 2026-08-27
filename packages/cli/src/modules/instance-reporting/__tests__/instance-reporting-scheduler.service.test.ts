import type { ModuleName, ModulesConfig } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import { Time } from '@n8n/constants';
import type { InstanceSettings } from 'n8n-core';
import { UserError } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CentralInstanceMonitoringReportRepository } from '../database/repositories/central-instance-monitoring-report.repository';
import { InstanceReportingScheduler } from '../instance-reporting-scheduler.service';
import type { InstanceReportingSettingsService } from '../instance-reporting-settings.service';
import { InstanceReportingConfig } from '../instance-reporting.config';
import type { InstanceReportingService } from '../instance-reporting.service';

const REPORT_TIME = '07:42';

/** Just before the day's slot, so nothing is due yet. */
const BEFORE_SLOT = '2026-03-26T07:41:00.000Z';

/** Just after the day's slot. */
const AFTER_SLOT = '2026-03-26T07:43:00.000Z';

interface Harness {
	scheduler: InstanceReportingScheduler;
	reportingService: Mocked<InstanceReportingService>;
	reportRepository: Mocked<CentralInstanceMonitoringReportRepository>;
	settingsService: Mocked<InstanceReportingSettingsService>;
	instanceSettings: Mocked<InstanceSettings>;
	modulesConfig: Mocked<ModulesConfig>;
}

function makeHarness({
	baseUrl = 'https://example.com',
	isLeader = true,
	disabledModules = [] as ModuleName[],
} = {}): Harness {
	const config = new InstanceReportingConfig();
	config.instanceReportingBaseUrl = baseUrl;

	const reportingService = mock<InstanceReportingService>();
	const reportRepository = mock<CentralInstanceMonitoringReportRepository>();
	reportRepository.hasDeliveredToday.mockResolvedValue(false);

	const settingsService = mock<InstanceReportingSettingsService>();
	settingsService.getReportTime.mockResolvedValue(REPORT_TIME);

	const instanceSettings = mock<InstanceSettings>({
		instanceType: 'main',
		instanceRole: isLeader ? 'leader' : 'follower',
		isLeader,
	});
	const modulesConfig = mock<ModulesConfig>({ disabledModules });

	const scheduler = new InstanceReportingScheduler(
		config,
		reportingService,
		reportRepository,
		settingsService,
		instanceSettings,
		modulesConfig,
		mockLogger(),
	);

	return {
		scheduler,
		reportingService,
		reportRepository,
		settingsService,
		instanceSettings,
		modulesConfig,
	};
}

/** Let the detached first tick settle before asserting. */
async function settle() {
	await vi.advanceTimersByTimeAsync(0);
}

describe('InstanceReportingScheduler', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(BEFORE_SLOT));
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	describe('init', () => {
		test('fails when the insights module is disabled', async () => {
			const { scheduler } = makeHarness({ disabledModules: ['insights'] });

			await expect(scheduler.init()).rejects.toThrow(UserError);
		});

		test('warns and stays idle when no base URL is configured', async () => {
			const { scheduler, reportingService } = makeHarness({ baseUrl: '' });

			await scheduler.init();
			await vi.advanceTimersByTimeAsync(Time.days.toMilliseconds);

			expect(reportingService.sendReport).not.toHaveBeenCalled();
		});

		test('does not start a timer on a follower', async () => {
			const { scheduler, reportingService } = makeHarness({ isLeader: false });

			await scheduler.init();
			await vi.advanceTimersByTimeAsync(Time.days.toMilliseconds);

			expect(reportingService.sendReport).not.toHaveBeenCalled();
		});

		test('fires at the configured time on the leader', async () => {
			const { scheduler, reportingService } = makeHarness();

			await scheduler.init();
			await settle();
			expect(reportingService.sendReport).not.toHaveBeenCalled();

			// One minute short of the slot, then past it.
			await vi.advanceTimersByTimeAsync(Time.minutes.toMilliseconds);

			expect(reportingService.sendReport).toHaveBeenCalledTimes(1);
		});

		test('fires once a day thereafter', async () => {
			const { scheduler, reportingService } = makeHarness();

			await scheduler.init();
			await vi.advanceTimersByTimeAsync(3 * Time.days.toMilliseconds);

			expect(reportingService.sendReport).toHaveBeenCalledTimes(3);
		});
	});

	describe('catch-up', () => {
		test("reports immediately when the day's slot already passed unreported", async () => {
			vi.setSystemTime(new Date(AFTER_SLOT));
			const { scheduler, reportingService } = makeHarness();

			await scheduler.init();
			await settle();

			expect(reportingService.sendReport).toHaveBeenCalledTimes(1);
		});

		test("stays quiet when the day's report was already delivered", async () => {
			vi.setSystemTime(new Date(AFTER_SLOT));
			const { scheduler, reportingService, reportRepository } = makeHarness();
			reportRepository.hasDeliveredToday.mockResolvedValue(true);

			await scheduler.init();
			await settle();

			expect(reportingService.sendReport).not.toHaveBeenCalled();
		});

		test('a caught-up day does not fire again later the same day', async () => {
			vi.setSystemTime(new Date(AFTER_SLOT));
			const { scheduler, reportingService, reportRepository } = makeHarness();

			await scheduler.init();
			await settle();
			// The catch-up delivered it, so the rest of the day has nothing to do.
			reportRepository.hasDeliveredToday.mockResolvedValue(true);
			await vi.advanceTimersByTimeAsync(Time.hours.toMilliseconds * 12);

			expect(reportingService.sendReport).toHaveBeenCalledTimes(1);
		});
	});

	describe('leadership', () => {
		test('starts reporting when this main takes over', async () => {
			vi.setSystemTime(new Date(AFTER_SLOT));
			const { scheduler, reportingService, instanceSettings } = makeHarness({ isLeader: false });

			await scheduler.init();
			await settle();
			expect(reportingService.sendReport).not.toHaveBeenCalled();

			// Takeover: the now-leader main finds the day unreported and catches up.
			// `start` is called directly here rather than through the multi-main event
			// bus `@OnLeaderTakeover` wraps, since that plumbing is out of scope for a
			// unit test; the decorator's only job is to invoke this same method.
			Object.defineProperty(instanceSettings, 'isLeader', { get: () => true, configurable: true });
			scheduler.start();
			await settle();

			expect(reportingService.sendReport).toHaveBeenCalledTimes(1);
		});

		test('stops reporting when this main steps down', async () => {
			const { scheduler, reportingService } = makeHarness();

			await scheduler.init();
			await settle();
			scheduler.stop();
			await vi.advanceTimersByTimeAsync(2 * Time.days.toMilliseconds);

			expect(reportingService.sendReport).not.toHaveBeenCalled();
		});

		test('shutdown stops the timer and blocks a later takeover', async () => {
			const { scheduler, reportingService } = makeHarness();

			await scheduler.init();
			await settle();
			scheduler.shutdown();
			scheduler.start();
			await vi.advanceTimersByTimeAsync(2 * Time.days.toMilliseconds);

			expect(reportingService.sendReport).not.toHaveBeenCalled();
		});
	});

	describe('retry', () => {
		test('re-attempts a failed delivery a few minutes later', async () => {
			vi.setSystemTime(new Date(AFTER_SLOT));
			const { scheduler, reportingService } = makeHarness();
			reportingService.sendReport.mockRejectedValueOnce(new Error('Network error'));

			await scheduler.init();
			await settle();
			expect(reportingService.sendReport).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(5 * Time.minutes.toMilliseconds);

			expect(reportingService.sendReport).toHaveBeenCalledTimes(2);
		});

		test('gives up after a bounded number of attempts, leaving the day to the next slot', async () => {
			vi.setSystemTime(new Date(AFTER_SLOT));
			const { scheduler, reportingService } = makeHarness();
			reportingService.sendReport.mockRejectedValue(new Error('Network error'));

			await scheduler.init();
			await vi.advanceTimersByTimeAsync(Time.hours.toMilliseconds);

			expect(reportingService.sendReport).toHaveBeenCalledTimes(3);
		});

		test('retries when the report time cannot even be resolved', async () => {
			const { scheduler, settingsService } = makeHarness();
			settingsService.getReportTime.mockRejectedValueOnce(new Error('DB down'));

			await scheduler.init();
			await settle();
			expect(settingsService.getReportTime).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(5 * Time.minutes.toMilliseconds);

			expect(settingsService.getReportTime).toHaveBeenCalledTimes(2);
		});
	});

	describe('clock changes', () => {
		test('a fire before the slot reports nothing and re-arms', async () => {
			const { scheduler, reportingService } = makeHarness();

			await scheduler.init();
			await settle();
			// Clock jumps backwards an hour, well before the slot.
			vi.setSystemTime(new Date('2026-03-26T06:41:00.000Z'));
			await vi.advanceTimersByTimeAsync(Time.minutes.toMilliseconds);

			expect(reportingService.sendReport).not.toHaveBeenCalled();
		});
	});
});
