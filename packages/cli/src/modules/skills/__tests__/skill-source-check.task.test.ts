import { mock } from 'vitest-mock-extended';

import { SkillSourceCheckTask } from '../services/skill-source-check.task';
import type { SkillSyncSettingsService } from '../services/skill-sync-settings.service';
import type { SkillSyncService } from '../services/skill-sync.service';
import { SkillSyncConfig } from '../skill-sync.config';

describe('SkillSourceCheckTask', () => {
	afterEach(() => vi.restoreAllMocks());

	it.each([
		[3600, 0, 0],
		[3600, 0.5, 1800],
		[3600, 0.9999, 3599],
		[900, 0.5, 450],
	])('spreads the first check over the %s-second interval (%s)', (interval, random, offset) => {
		vi.spyOn(Math, 'random').mockReturnValue(random);
		const config = new SkillSyncConfig();
		config.checkIntervalSeconds = interval;
		const task = new SkillSourceCheckTask(
			config,
			mock<SkillSyncService>(),
			mock<SkillSyncSettingsService>(),
		);

		expect(task.initialDelaySeconds).toBe(offset);
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: interval });
	});

	it.each([
		{ switchOn: true, checks: 1 },
		{ switchOn: false, checks: 0 },
	])(
		'checks the sources only while the switch is on (switch: $switchOn)',
		async ({ switchOn, checks }) => {
			const skillSync = mock<SkillSyncService>();
			const skillSyncSettings = mock<SkillSyncSettingsService>();
			skillSyncSettings.isEnabled.mockReturnValue(switchOn);
			const task = new SkillSourceCheckTask(new SkillSyncConfig(), skillSync, skillSyncSettings);

			await task.run(new AbortController().signal);

			expect(skillSync.checkAll).toHaveBeenCalledTimes(checks);
		},
	);
});
