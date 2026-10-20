import { loadInstanceAiSkills, resolvePromptProfile } from '@n8n/instance-ai';

import {
	InstanceAiSkillsService,
	SKILLS,
	type InstanceAiSkillScope,
	type SkillId,
} from '../instance-ai-skills.service';

const openScope: InstanceAiSkillScope = {
	profile: resolvePromptProfile({ mode: 'default' }).profile,
	flags: { configEvalsEnabled: true, instanceContextEnabled: true },
	agentBuildingEnabled: true,
};

const gatedSkills: Array<[string, InstanceAiSkillScope, SkillId[]]> = [
	[
		'configEvalsEnabled',
		{ ...openScope, flags: { ...openScope.flags, configEvalsEnabled: false } },
		[SKILLS.configEvals, SKILLS.configEvalPlaybook],
	],
	[
		'instanceContextEnabled',
		{ ...openScope, flags: { ...openScope.flags, instanceContextEnabled: false } },
		[SKILLS.instanceAwareness],
	],
	[
		'agentBuildingEnabled',
		{ ...openScope, agentBuildingEnabled: false },
		[SKILLS.agentBuilder, SKILLS.intentRecognition],
	],
];

describe('InstanceAiSkillsService', () => {
	const service = new InstanceAiSkillsService();

	it('refers only to skills that exist', () => {
		const bundled = loadInstanceAiSkills().registry.skills.map(({ id }) => id);

		expect(bundled).toEqual(expect.arrayContaining(Object.values(SKILLS)));
	});

	describe('loadSkills', () => {
		it('returns the profile skills and disabled tools when every gate is open', async () => {
			const skills = await service.loadSkills({
				...openScope,
				profile: resolvePromptProfile({ mode: 'progressive' }).profile,
			});

			expect(skills.disabledTools).toEqual(['workflow_builder_create_tasks']);
			expect(skills.source.registry.skills.map(({ id }) => id)).not.toContain('planning');
		});

		it.each(gatedSkills)('removes the skills that %s turns off', async (_, scope, skillIds) => {
			const on = await service.loadSkills(openScope);
			const off = await service.loadSkills(scope);

			const onIds = on.source.registry.skills.map(({ id }) => id);
			const offIds = off.source.registry.skills.map(({ id }) => id);
			expect(onIds.filter((id) => !offIds.includes(id)).sort()).toEqual([...skillIds].sort());
		});
	});

	describe('retrieveSkill', () => {
		it('returns an active skill', async () => {
			const expected = await loadInstanceAiSkills().loadSkill(SKILLS.suggestAutomations);

			const skill = await service.retrieveSkill(SKILLS.suggestAutomations, openScope);

			expect(skill?.instructions).toBe(expected?.instructions);
		});

		it.each(gatedSkills)(
			'returns null for the skills that %s turns off',
			async (_, scope, skillIds) => {
				for (const skillId of skillIds) {
					await expect(service.retrieveSkill(skillId, scope)).resolves.toBeNull();
				}
			},
		);
	});

	describe('loadSkill', () => {
		it('returns an active skill', async () => {
			const expected = await loadInstanceAiSkills().loadSkill(SKILLS.suggestAutomations);

			const skill = await service.loadSkill(SKILLS.suggestAutomations, openScope);

			expect(skill.instructions).toBe(expected?.instructions);
		});

		it('throws when the skill is not active', async () => {
			const scope = { ...openScope, flags: { ...openScope.flags, configEvalsEnabled: false } };

			await expect(service.loadSkill(SKILLS.configEvals, scope)).rejects.toThrow(
				'Skill "config-evals" is not active',
			);
		});
	});
});
