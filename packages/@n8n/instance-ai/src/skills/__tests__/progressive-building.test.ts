import { filterRuntimeSkillSource } from '@n8n/agents';

import { getSystemPrompt } from '../../agent/system-prompt';
import {
	loadInstanceAiRuntimeSkillSource,
	loadInstanceAiRuntimeSkillSourceForBuildMode,
} from '../runtime-skills';

describe('progressive workflow skill variants', () => {
	it('excludes planning and changes only the workflow-building and post-build instructions', async () => {
		const source = loadInstanceAiRuntimeSkillSource();
		const originalRegistry = structuredClone(source.registry);
		const progressive = await loadInstanceAiRuntimeSkillSourceForBuildMode('progressive');
		const policy = await source.loadSkill('progressive-building');
		if (!policy) throw new Error('Expected the progressive policy');

		for (const entry of source.registry.skills) {
			const original = await source.loadSkill(entry.id);
			const selected = await progressive.loadSkill(entry.id);
			const selectedEntry = progressive.registry.skills.find(({ id }) => id === entry.id);
			if (entry.id === 'planning' || entry.id === 'progressive-building') {
				expect(original).not.toBeNull();
				expect(selected).toBeNull();
				expect(selectedEntry).toBeUndefined();
			} else if (entry.id === 'workflow-builder' || entry.id === 'post-build-flow') {
				expect(selected?.instructions).toContain(original?.instructions);
				expect(selected?.instructions).toContain(policy.instructions);
				expect(selectedEntry?.hash).not.toBe(entry.hash);
			} else if (entry.id === 'planned-task-runtime') {
				expect(selected?.instructions).toBe(original?.instructions);
				expect(selected?.recommendedTools).not.toContain('create-tasks');
			} else {
				expect(selected).toEqual(original);
				expect(selectedEntry).toEqual(entry);
			}
		}

		expect(progressive.registry.skillsHash).not.toBe(source.registry.skillsHash);
		expect(source.registry).toEqual(originalRegistry);
		const control = await loadInstanceAiRuntimeSkillSourceForBuildMode('default');
		expect(control.registry).toEqual(
			filterRuntimeSkillSource(source, ['progressive-building']).registry,
		);
		await expect(loadInstanceAiRuntimeSkillSourceForBuildMode(undefined)).resolves.toBe(control);
	});

	it('keeps the progressive policy out of the general system prompt', () => {
		expect(getSystemPrompt()).not.toContain('# Progressive building');
	});
});
