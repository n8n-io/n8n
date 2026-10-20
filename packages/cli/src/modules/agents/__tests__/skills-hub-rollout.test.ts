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

	it('is off by default', () => {
		rollout.init();

		expect(config.skillsHubEnabled).toBe(false);
		expect(rollout.isEnabled).toBe(false);
	});

	it('is off until the setting is read', () => {
		config.skillsHubEnabled = true;

		expect(rollout.isEnabled).toBe(false);
	});

	it('reads N8N_AGENTS_SKILLS_HUB_ENABLED once and keeps the value until a restart', () => {
		config.skillsHubEnabled = true;

		rollout.init();
		config.skillsHubEnabled = false;

		expect(rollout.isEnabled).toBe(true);
	});
});
