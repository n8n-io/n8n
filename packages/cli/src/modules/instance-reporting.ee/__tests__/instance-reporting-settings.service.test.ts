import { mockLogger } from '@n8n/backend-test-utils';
import type { Settings, SettingsRepository } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { InsightsConfig } from '@/modules/insights/insights.config';
import { InstanceReportingSettingsService } from '../instance-reporting-settings.service';
import { CENTRAL_INSTANCE_MONITORING_SETTINGS_KEY } from '../instance-reporting.constants';

/** `HH:mm` at or after the 03:00 floor. */
const AFTER_FLOOR = /^(0[3-9]|1\d|2[0-3]):[0-5]\d$/;

function setting(value: string): Settings {
	return mock<Settings>({ key: CENTRAL_INSTANCE_MONITORING_SETTINGS_KEY, value });
}

function makeService(compactionIntervalMinutes = 60): {
	service: InstanceReportingSettingsService;
	settingsRepository: Mocked<SettingsRepository>;
} {
	const settingsRepository = mock<SettingsRepository>();
	const insightsConfig = new InsightsConfig();
	insightsConfig.compactionIntervalMinutes = compactionIntervalMinutes;

	const service = new InstanceReportingSettingsService(
		settingsRepository,
		insightsConfig,
		mockLogger(),
	);

	return { service, settingsRepository };
}

describe('InstanceReportingSettingsService', () => {
	describe('getReportTime', () => {
		test('returns the persisted time without rewriting it', async () => {
			const { service, settingsRepository } = makeService();
			settingsRepository.findByKey.mockResolvedValue(setting('{"reportTime":"13:37"}'));

			await expect(service.getReportTime()).resolves.toBe('13:37');

			expect(settingsRepository.claimKey).not.toHaveBeenCalled();
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});

		test('claims a random time on first boot and returns it', async () => {
			const { service, settingsRepository } = makeService();
			settingsRepository.findByKey.mockResolvedValueOnce(null);
			settingsRepository.claimKey.mockImplementation(async (_key, value) => {
				settingsRepository.findByKey.mockResolvedValue(setting(value));
				return true;
			});

			const reportTime = await service.getReportTime();

			expect(reportTime).toMatch(AFTER_FLOOR);
			expect(settingsRepository.claimKey).toHaveBeenCalledWith(
				CENTRAL_INSTANCE_MONITORING_SETTINGS_KEY,
				JSON.stringify({ reportTime }),
			);
		});

		test("adopts the winner's time when the claim is lost", async () => {
			const { service, settingsRepository } = makeService();
			settingsRepository.findByKey.mockResolvedValueOnce(null);
			settingsRepository.claimKey.mockImplementation(async () => {
				settingsRepository.findByKey.mockResolvedValue(setting('{"reportTime":"04:20"}'));
				return false;
			});

			await expect(service.getReportTime()).resolves.toBe('04:20');
		});

		test('overwrites a malformed value with a fresh time', async () => {
			const { service, settingsRepository } = makeService();
			settingsRepository.findByKey.mockResolvedValue(setting('not json'));

			const reportTime = await service.getReportTime();

			expect(reportTime).toMatch(AFTER_FLOOR);
			expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
				CENTRAL_INSTANCE_MONITORING_SETTINGS_KEY,
				JSON.stringify({ reportTime }),
				false,
				{},
			);
		});

		test('overwrites an out-of-range time', async () => {
			const { service, settingsRepository } = makeService();
			settingsRepository.findByKey.mockResolvedValue(setting('{"reportTime":"25:99"}'));

			await expect(service.getReportTime()).resolves.not.toBe('25:99');

			expect(settingsRepository.upsertByKey).toHaveBeenCalled();
		});
	});

	describe('getReportTime - insights compaction window', () => {
		test('never generates a time before 03:00, even on a short compaction interval', async () => {
			const { service, settingsRepository } = makeService(5);
			settingsRepository.findByKey.mockResolvedValueOnce(null);
			settingsRepository.claimKey.mockImplementation(async (_key, value) => {
				settingsRepository.findByKey.mockResolvedValue(setting(value));
				return true;
			});

			// Sampled: the floor is a range bound, so one draw can pass by luck.
			for (let i = 0; i < 50; i++) {
				settingsRepository.findByKey.mockResolvedValueOnce(null);
				expect(await service.getReportTime()).toMatch(AFTER_FLOOR);
			}
		});

		test('generates past twice the compaction interval when that is later than 03:00', async () => {
			// 150 min interval => the day's tail may be uncompacted until 05:00.
			const { service, settingsRepository } = makeService(150);
			settingsRepository.claimKey.mockImplementation(async (_key, value) => {
				settingsRepository.findByKey.mockResolvedValue(setting(value));
				return true;
			});

			for (let i = 0; i < 50; i++) {
				settingsRepository.findByKey.mockResolvedValueOnce(null);
				const [hour] = (await service.getReportTime()).split(':');
				expect(Number(hour)).toBeGreaterThanOrEqual(5);
			}
		});

		test('leaves a stored time alone on the default compaction interval', async () => {
			const { service, settingsRepository } = makeService(60);
			settingsRepository.findByKey.mockResolvedValue(setting('{"reportTime":"03:10"}'));

			await expect(service.getReportTime()).resolves.toBe('03:10');

			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});

		test('shifts a stored time the compaction interval has made too early, and persists it', async () => {
			// 150 min interval => floor 05:00; 03:30 no longer clears it.
			const { service, settingsRepository } = makeService(150);
			settingsRepository.findByKey.mockResolvedValue(setting('{"reportTime":"03:30"}'));

			// Offset above the 03:00 floor is preserved: 05:00 + 30min.
			await expect(service.getReportTime()).resolves.toBe('05:30');

			expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
				CENTRAL_INSTANCE_MONITORING_SETTINGS_KEY,
				JSON.stringify({ reportTime: '05:30' }),
				false,
				{},
			);
		});

		test('keeps instances spread out rather than piling them on the new floor', async () => {
			const shift = async (stored: string) => {
				const { service, settingsRepository } = makeService(150);
				settingsRepository.findByKey.mockResolvedValue(setting(`{"reportTime":"${stored}"}`));
				return await service.getReportTime();
			};

			expect(await shift('03:05')).toBe('05:05');
			expect(await shift('04:45')).toBe('06:45');
		});

		test('is idempotent: a shifted time is not shifted again on the next boot', async () => {
			const { service, settingsRepository } = makeService(150);
			settingsRepository.findByKey.mockResolvedValue(setting('{"reportTime":"05:30"}'));

			await expect(service.getReportTime()).resolves.toBe('05:30');

			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});

		test('still yields a valid time when the compaction interval covers the whole day', async () => {
			const { service, settingsRepository } = makeService(24 * 60);
			settingsRepository.findByKey.mockResolvedValue(setting('{"reportTime":"03:30"}'));

			await expect(service.getReportTime()).resolves.toBe('23:59');
		});
	});
});
