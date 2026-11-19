import { mock } from 'vitest-mock-extended';

import { SkillSourceCheckTask } from '../services/skill-source-check.task';
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
		const task = new SkillSourceCheckTask(config, mock<SkillSyncService>());

		expect(task.initialDelaySeconds).toBe(offset);
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: interval });
	});
});
