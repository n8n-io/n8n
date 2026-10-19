import type { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { SkillAgentsProxy, type SkillAgentsProvider } from '../skill-agents-proxy.service';
import { SkillsHubRollout } from '../skills-hub-rollout';

describe('SkillsHubRollout', () => {
	let config: AgentsConfig;
	let skillAgents: SkillAgentsProxy;
	let rollout: SkillsHubRollout;

	beforeEach(() => {
		config = new AgentsConfig();
		skillAgents = new SkillAgentsProxy();
		skillAgents.registerProvider(mock<SkillAgentsProvider>());
		rollout = new SkillsHubRollout(config, mock<Logger>(), skillAgents);
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

	it('is off while the agents module has registered no provider', () => {
		config.skillsHubEnabled = true;
		const withoutAgents = new SkillsHubRollout(config, mock<Logger>(), new SkillAgentsProxy());

		withoutAgents.init();

		expect(withoutAgents.isEnabled).toBe(false);
	});
});
