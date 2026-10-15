import { loadInstanceAiSkills, resolvePromptProfile } from '@n8n/instance-ai';

import { InstanceAiSkillsService, type InstanceAiSkillFlags } from '../instance-ai-skills.service';

const allFlagsOn: InstanceAiSkillFlags = {
	configEvalsEnabled: true,
	instanceContextEnabled: true,
	agentBuildingEnabled: true,
};

describe('InstanceAiSkillsService', () => {
	const service = new InstanceAiSkillsService();
	const defaultProfile = resolvePromptProfile({ mode: 'default' }).profile;

	describe('resolveForRun', () => {
		it('returns the profile skills and disabled tools when every flag is on', async () => {
			const progressive = resolvePromptProfile({ mode: 'progressive' }).profile;

			const skills = await service.resolveForRun(progressive, allFlagsOn);

			expect(skills.disabledTools).toEqual(['create-tasks']);
			expect(skills.source.registry.skills.map(({ id }) => id)).not.toContain('planning');
		});

		it.each([
			['configEvalsEnabled', ['config-evals', 'config-eval-playbook']],
			['instanceContextEnabled', ['instance-awareness']],
			['agentBuildingEnabled', ['agent-builder', 'intent-recognition']],
		] as const)('removes the skills that %s turns off', async (flag, skillIds) => {
			const on = await service.resolveForRun(defaultProfile, allFlagsOn);
			const off = await service.resolveForRun(defaultProfile, { ...allFlagsOn, [flag]: false });

			const onIds = on.source.registry.skills.map(({ id }) => id);
			const offIds = off.source.registry.skills.map(({ id }) => id);
			expect(onIds).toEqual(expect.arrayContaining([...skillIds]));
			expect(onIds.filter((id) => !offIds.includes(id)).sort()).toEqual([...skillIds].sort());
			for (const skillId of skillIds) {
				await expect(off.source.loadSkill(skillId)).resolves.toBeNull();
			}
		});
	});

	describe('loadOnboardingInstructions', () => {
		it('returns the instructions of the suggest-automations skill', async () => {
			const skill = await loadInstanceAiSkills().loadSkill('suggest-automations');

			await expect(service.loadOnboardingInstructions()).resolves.toBe(skill?.instructions);
		});
	});
});
