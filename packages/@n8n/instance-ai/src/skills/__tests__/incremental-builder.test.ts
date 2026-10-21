import { createSkillLoadTool, filterRuntimeSkillSource } from '@n8n/agents';
import type { InstanceAiBuildMode } from '@n8n/api-types';

import { getSystemPrompt } from '../../agent/system-prompt';
import { resolvePromptProfile } from '../../prompts/prompt-profiles';
import { loadInstanceAiPromptSkills, loadInstanceAiSkills } from '../skills';

async function loadModeSkills(mode: InstanceAiBuildMode | undefined) {
	return (await loadInstanceAiPromptSkills(resolvePromptProfile({ mode }).profile)).source;
}

describe('progressive workflow skill variants', () => {
	it('excludes planning and changes only the workflow-building and post-build instructions', async () => {
		const source = loadInstanceAiSkills();
		const originalRegistry = structuredClone(source.registry);
		const progressive = await loadModeSkills('progressive');
		const policy = await source.loadSkill('incremental-builder');
		if (!policy) throw new Error('Expected the progressive policy');

		for (const entry of source.registry.skills) {
			const original = await source.loadSkill(entry.id);
			const selected = await progressive.loadSkill(entry.id);
			const selectedEntry = progressive.registry.skills.find(({ id }) => id === entry.id);
			if (entry.id === 'task-planner' || entry.id === 'incremental-builder') {
				expect(original).not.toBeNull();
				expect(selected).toBeNull();
				expect(selectedEntry).toBeUndefined();
			} else if (entry.id === 'workflow-builder' || entry.id === 'post-build-flow') {
				expect(selected?.instructions).toContain(original?.instructions);
				expect(selected?.instructions).toContain(policy.instructions);
				expect(selectedEntry?.hash).not.toBe(entry.hash);
			} else if (entry.id === 'planned-task-runner') {
				expect(selected?.instructions).toBe(original?.instructions);
				expect(selected?.recommendedTools).toBeUndefined();
			} else {
				expect(selected).toEqual(original);
				expect(selectedEntry).toEqual(entry);
			}
		}

		expect(progressive.registry.skillsHash).not.toBe(source.registry.skillsHash);
		expect(source.registry).toEqual(originalRegistry);
		const control = await loadModeSkills('default');
		expect(control.registry).toEqual(
			filterRuntimeSkillSource(source, ['incremental-builder']).registry,
		);
		await expect(loadModeSkills(undefined)).resolves.toBe(control);
	});

	it('serves the selected skills through load_skill', async () => {
		const policy = await loadInstanceAiSkills().loadSkill('incremental-builder');
		if (!policy) throw new Error('Expected the progressive policy');
		const progressive = await loadModeSkills('progressive');
		const loadProgressive = createSkillLoadTool(progressive);
		const loadControl = createSkillLoadTool(await loadModeSkills('default'));

		for (const skillId of ['workflow-builder', 'post-build-flow']) {
			await expect(loadProgressive.handler?.({ skillId }, {})).resolves.toHaveProperty(
				'value.0.text',
				expect.stringContaining(policy.instructions),
			);
			await expect(loadControl.handler?.({ skillId }, {})).resolves.toHaveProperty(
				'value.0.text',
				expect.not.stringContaining('# Progressive building'),
			);
		}

		await expect(loadProgressive.handler?.({ skillId: 'task-planner' }, {})).resolves.toMatchObject(
			{
				success: false,
			},
		);
		await expect(progressive.loadSkill('incremental-builder')).resolves.toBeNull();
	});

	it('keeps the progressive policy out of the general system prompt', () => {
		expect(getSystemPrompt()).not.toContain('# Progressive building');
	});
});
