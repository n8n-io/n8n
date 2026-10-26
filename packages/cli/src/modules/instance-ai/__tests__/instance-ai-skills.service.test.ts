import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import { AssistantSkillProviderProxy, type AssistantSkillProvider } from '@n8n/backend-services';
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
	const service = new InstanceAiSkillsService(new AssistantSkillProviderProxy());

	it('refers only to skills that exist', () => {
		const bundled = loadInstanceAiSkills().registry.skills.map(({ id }) => id);

		expect(bundled).toEqual(expect.arrayContaining(Object.values(SKILLS)));
	});

	describe('loadSkills', () => {
		it('returns no disabled tools for the progressive profile', async () => {
			const skills = await service.loadSkills({
				...openScope,
				profile: resolvePromptProfile({ mode: 'progressive' }).profile,
			});

			expect(skills.disabledTools).toEqual([]);
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

describe('Assistant Hub provider boundary', () => {
	const context = { user: mock<User>(), projectId: 'project-1' };

	it('combines the enabled Hub provider with the active built-ins', async () => {
		const proxy = new AssistantSkillProviderProxy();
		const provider = mock<AssistantSkillProvider>();
		provider.isEnabled.mockResolvedValue(true);
		const summary = {
			id: 'skill-1',
			projectId: null,
			name: 'Review workflows',
			description: 'Review error handling.',
			versionId: 'v1',
			version: 1,
		};
		provider.listSkills.mockResolvedValue([summary]);
		proxy.registerProvider(provider);
		const service = new InstanceAiSkillsService(proxy);
		const result = await service.loadSkills(openScope, context);
		expect(
			result.source.registry.skills.some(({ metadata }) => metadata?.hubSkillId === 'skill-1'),
		).toBe(true);
		expect(provider.listSkills).toHaveBeenCalledWith(context);
		expect(provider.readSkill).not.toHaveBeenCalled();
	});

	it('supplies no Hub skills without a registered provider', async () => {
		const service = new InstanceAiSkillsService(new AssistantSkillProviderProxy());
		expect(await service.listHubSkills(context)).toEqual([]);
		expect(await service.readHubSkill(context, 'unknown')).toBeNull();
		const run = await service.loadSkills(openScope, context);
		expect(run.source.registry.skills.length).toBeGreaterThan(0);
		expect(run.availabilityNotice).toBeUndefined();
	});
});
