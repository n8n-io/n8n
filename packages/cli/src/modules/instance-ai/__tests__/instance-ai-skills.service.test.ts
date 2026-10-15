import { loadInstanceAiSkills, resolvePromptProfile } from '@n8n/instance-ai';

import {
	InstanceAiSkillsService,
	SKILLS,
	type InstanceAiSkillFlags,
	type InstanceAiSkillScope,
} from '../instance-ai-skills.service';

const allFlagsOn: InstanceAiSkillFlags = {
	configEvalsEnabled: true,
	instanceContextEnabled: true,
	agentBuildingEnabled: true,
};

const gatedSkills = [
	['configEvalsEnabled', [SKILLS.configEvals, SKILLS.configEvalPlaybook]],
	['instanceContextEnabled', [SKILLS.instanceAwareness]],
	['agentBuildingEnabled', [SKILLS.agentBuilder, SKILLS.intentRecognition]],
] as const;

describe('InstanceAiSkillsService', () => {
	const service = new InstanceAiSkillsService();
	const defaultScope: InstanceAiSkillScope = {
		profile: resolvePromptProfile({ mode: 'default' }).profile,
		flags: allFlagsOn,
	};

	it('refers only to skills that exist', () => {
		const bundled = loadInstanceAiSkills().registry.skills.map(({ id }) => id);

		expect(bundled).toEqual(expect.arrayContaining(Object.values(SKILLS)));
	});

	describe('loadSkills', () => {
		it('returns the profile skills and disabled tools when every flag is on', async () => {
			const skills = await service.loadSkills({
				profile: resolvePromptProfile({ mode: 'progressive' }).profile,
				flags: allFlagsOn,
			});

			expect(skills.disabledTools).toEqual(['create-tasks']);
			expect(skills.source.registry.skills.map(({ id }) => id)).not.toContain('planning');
		});

		it.each(gatedSkills)('removes the skills that %s turns off', async (flag, skillIds) => {
			const on = await service.loadSkills(defaultScope);
			const off = await service.loadSkills({
				...defaultScope,
				flags: { ...allFlagsOn, [flag]: false },
			});

			const onIds = on.source.registry.skills.map(({ id }) => id);
			const offIds = off.source.registry.skills.map(({ id }) => id);
			expect(onIds.filter((id) => !offIds.includes(id)).sort()).toEqual([...skillIds].sort());
		});
	});

	describe('retrieveSkill', () => {
		it('returns an active skill', async () => {
			const expected = await loadInstanceAiSkills().loadSkill(SKILLS.suggestAutomations);

			const skill = await service.retrieveSkill(SKILLS.suggestAutomations, defaultScope);

			expect(skill?.instructions).toBe(expected?.instructions);
		});

		it.each(gatedSkills)(
			'returns null for the skills that %s turns off',
			async (flag, skillIds) => {
				const scope = { ...defaultScope, flags: { ...allFlagsOn, [flag]: false } };

				for (const skillId of skillIds) {
					await expect(service.retrieveSkill(skillId, scope)).resolves.toBeNull();
				}
			},
		);
	});

	describe('loadSkill', () => {
		it('returns an active skill', async () => {
			const expected = await loadInstanceAiSkills().loadSkill(SKILLS.suggestAutomations);

			const skill = await service.loadSkill(SKILLS.suggestAutomations, defaultScope);

			expect(skill.instructions).toBe(expected?.instructions);
		});

		it('throws when the skill is not active', async () => {
			const scope = { ...defaultScope, flags: { ...allFlagsOn, configEvalsEnabled: false } };

			await expect(service.loadSkill(SKILLS.configEvals, scope)).rejects.toThrow(
				'Skill "config-evals" is not active',
			);
		});
	});
});
