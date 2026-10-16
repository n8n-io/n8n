import type { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { SkillsHubRollout } from '../skills/skills-hub-rollout';

describe('SkillsHubRollout', () => {
	let config: AgentsConfig;
	let rollout: SkillsHubRollout;

	beforeEach(() => {
		config = new AgentsConfig();
		rollout = new SkillsHubRollout(config, mock<Logger>());
	});

	it('is on by default', () => {
		rollout.init();

		expect(config.skillsHubEnabled).toBe(true);
		expect(rollout.isEnabled).toBe(true);
	});

	it('is off until the setting is read', () => {
		expect(rollout.isEnabled).toBe(false);
	});

	it('reads the setting once and keeps the value until a restart', () => {
		config.skillsHubEnabled = true;

		rollout.init();
		config.skillsHubEnabled = false;

		expect(rollout.isEnabled).toBe(true);
	});
});
