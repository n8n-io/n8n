import { Agent } from '@n8n/agents';
import type { User } from '@n8n/db';
import { MockLanguageModelV3 } from 'ai/test';
import { mock } from 'vitest-mock-extended';
import { loadInstanceAiSkills, resolvePromptProfile } from '@n8n/instance-ai';

import type { AssistantSkillsFlagGate, SkillRuntimeService } from '@/modules/skills';

import {
	InstanceAiSkillsService,
	SKILLS,
	type InstanceAiSkillScope,
	type SkillId,
} from '../instance-ai-skills.service';

const openScope: InstanceAiSkillScope = {
	profile: resolvePromptProfile({}).profile,
	flags: { configEvalsEnabled: true, instanceContextEnabled: true },
	agentBuildingEnabled: true,
	appBuildingEnabled: true,
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
	['appBuildingEnabled', { ...openScope, appBuildingEnabled: false }, [SKILLS.appBuilder]],
];

describe('InstanceAiSkillsService', () => {
	const service = new InstanceAiSkillsService(mock(), mock());

	it('refers only to skills that exist', () => {
		const bundled = loadInstanceAiSkills().registry.skills.map(({ id }) => id);

		expect(bundled).toEqual(expect.arrayContaining(Object.values(SKILLS)));
	});

	describe('loadSkills', () => {
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

describe('Assistant reads of user skills', () => {
	const context = { user: mock<User>(), projectId: 'project-1' };
	const summary = {
		id: 'skill-1',
		projectId: null,
		name: 'Tone',
		description: 'Writing style',
		versionId: 'version-1',
		version: 1,
	};
	const content = { ...summary, instructions: 'Be brief.', frontmatter: null, files: [] };
	const gate = mock<AssistantSkillsFlagGate>();
	const skillRuntime = mock<SkillRuntimeService>();
	const service = new InstanceAiSkillsService(gate, skillRuntime);

	beforeEach(() => {
		vi.resetAllMocks();
		skillRuntime.listForAssistant.mockResolvedValue([summary]);
		skillRuntime.readForAssistant.mockResolvedValue(content);
	});

	it('reads nothing while Assistant skills are off', async () => {
		gate.isEnabled.mockResolvedValue(false);

		expect(await service.isEnabled()).toBe(false);
		expect(await service.listSkills(context)).toEqual([]);
		expect(await service.readSkill(context, summary.id)).toBeNull();
		expect(
			await service.readFile(context, summary.id, summary.versionId, 'references/a.md'),
		).toBeNull();
		expect(skillRuntime.listForAssistant).not.toHaveBeenCalled();
		expect(skillRuntime.readForAssistant).not.toHaveBeenCalled();
		expect(skillRuntime.readFileForAssistant).not.toHaveBeenCalled();
		const run = await service.loadSkills(openScope, context);
		expect(run.source.registry.skills.length).toBeGreaterThan(0);
		expect(run.source.dynamicCatalog?.notice).toBeUndefined();
	});

	it('reads the skills of the user while Assistant skills are on', async () => {
		gate.isEnabled.mockResolvedValue(true);
		const file = {
			skillId: summary.id,
			versionId: summary.versionId,
			path: 'references/a.md',
			content: 'A.',
		};
		skillRuntime.readFileForAssistant.mockResolvedValue(file);

		expect(await service.listSkills(context)).toEqual([summary]);
		expect(await service.readSkill(context, summary.id, summary.versionId)).toEqual(content);
		expect(await service.readFile(context, summary.id, summary.versionId, file.path)).toEqual(file);
		expect(skillRuntime.listForAssistant).toHaveBeenCalledWith(context);
		expect(skillRuntime.readForAssistant).toHaveBeenCalledWith(
			context,
			summary.id,
			summary.versionId,
		);
		expect(skillRuntime.readFileForAssistant).toHaveBeenCalledWith(
			context,
			summary.id,
			summary.versionId,
			file.path,
		);
	});

	it.each([false, true])(
		'preserves the built-in model request with no applicable skills when the flag is %s',
		async (enabled) => {
			gate.isEnabled.mockResolvedValue(enabled);
			skillRuntime.listForAssistant.mockResolvedValue([]);
			const builtIns = await service.loadSkills(openScope);
			const current = await service.loadSkills(openScope, context);
			const model = new MockLanguageModelV3({
				provider: 'openai',
				modelId: 'gpt-4.1',
				doGenerate: {
					content: [{ type: 'text', text: 'Done.' }],
					finishReason: { unified: 'stop', raw: 'stop' },
					usage: {
						inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
						outputTokens: { total: 5, text: 5, reasoning: 0 },
					},
					warnings: [],
				},
			});
			for (const { source } of [builtIns, current]) {
				await new Agent('empty-catalog-test')
					.model(model)
					.instructions('Complete the task.')
					.skills(source)
					.promptCaching()
					.generate('Summarize these notes.');
			}
			const [before, after] = model.doGenerateCalls;
			expect(after.prompt).toEqual(before.prompt);
			expect(after.tools).toEqual(before.tools);
			expect(after.providerOptions).toEqual(before.providerOptions);
			expect(after.providerOptions?.openai).toMatchObject({
				promptCacheKey: expect.stringMatching(/^agent:/),
			});
			expect(JSON.stringify(after.prompt)).not.toContain('current dynamic skill catalogue');
			expect(skillRuntime.listForAssistant).toHaveBeenCalledTimes(enabled ? 1 : 0);
			expect(skillRuntime.readForAssistant).not.toHaveBeenCalled();
		},
	);

	it('combines the user skills with the active built-ins', async () => {
		gate.isEnabled.mockResolvedValue(true);

		const result = await service.loadSkills(openScope, context);

		expect(
			result.source.registry.skills.some(({ metadata }) => metadata?.hubSkillId === summary.id),
		).toBe(true);
		expect(skillRuntime.listForAssistant).toHaveBeenCalledWith(context);
		expect(skillRuntime.readForAssistant).not.toHaveBeenCalled();
	});
});
