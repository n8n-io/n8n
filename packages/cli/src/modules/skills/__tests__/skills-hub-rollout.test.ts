import { mock } from 'vitest-mock-extended';

import { SkillAgentsProxy, type SkillAgentsProvider } from '../skill-agents-proxy.service';
import { SkillsHubRollout } from '../skills-hub-rollout';

describe('SkillsHubRollout', () => {
	let skillAgents: SkillAgentsProxy;
	let rollout: SkillsHubRollout;

	beforeEach(() => {
		skillAgents = new SkillAgentsProxy();
		rollout = new SkillsHubRollout(skillAgents);
	});

	it('is on once the skills module started and the agents module registered a provider', () => {
		rollout.init();
		skillAgents.registerProvider(mock<SkillAgentsProvider>());

		expect(rollout.isEnabled).toBe(true);
	});

	it('is off until the skills module starts', () => {
		skillAgents.registerProvider(mock<SkillAgentsProvider>());

		expect(rollout.isEnabled).toBe(false);
	});

	it('is off while the agents module has registered no provider', () => {
		rollout.init();

		expect(rollout.isEnabled).toBe(false);
	});
});
