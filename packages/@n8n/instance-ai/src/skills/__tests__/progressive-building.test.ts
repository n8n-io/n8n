import { createSkillLoadTool, filterRuntimeSkillSource } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import { getSystemPrompt } from '../../agent/system-prompt';
import type { Logger } from '../../logger';
import { buildRuntimeSkillWorkspaceBundle } from '../materialize-runtime-skills';
import {
	loadInstanceAiRuntimeSkillSource,
	loadInstanceAiRuntimeSkillSourceForBuildMode,
} from '../runtime-skills';
import { disabledInstanceAiSkillIds } from '../skill-gates';

const logger = mock<Logger>();

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

	it('serves the selected skills through both workspace files and load_skill', async () => {
		const policy = await loadInstanceAiRuntimeSkillSource().loadSkill('progressive-building');
		if (!policy) throw new Error('Expected the progressive policy');
		const excluded = disabledInstanceAiSkillIds({
			configEvalsEnabled: true,
			instanceContextEnabled: true,
		});
		const control = filterRuntimeSkillSource(
			await loadInstanceAiRuntimeSkillSourceForBuildMode('default'),
			excluded,
		);
		const progressive = filterRuntimeSkillSource(
			await loadInstanceAiRuntimeSkillSourceForBuildMode('progressive'),
			excluded,
		);
		const root = '/home/daytona/workspace';
		const [controlBundle, progressiveBundle] = await Promise.all(
			[control, progressive].map(
				async (source) => await buildRuntimeSkillWorkspaceBundle({ source, root, logger }),
			),
		);
		if (!controlBundle || !progressiveBundle) throw new Error('Expected skill bundles');

		expect(progressiveBundle.manifest.skillsHash).not.toBe(controlBundle.manifest.skillsHash);
		for (const skillId of ['workflow-builder', 'post-build-flow']) {
			const skillPath = `${root}/skills/${skillId}/SKILL.md`;
			expect(progressiveBundle.files.get(skillPath)).toContain('# Progressive building');
			expect(controlBundle.files.get(skillPath)).not.toContain('# Progressive building');
			const loadTool = createSkillLoadTool(progressiveBundle.source);
			const loaded = await loadTool.handler?.({ skillId }, {});
			expect(loaded).toHaveProperty('value.0.text', expect.stringContaining(policy.instructions));
		}

		const reference = `${root}/skills/post-build-flow/references/trigger-input-data-shapes.md`;
		expect(progressiveBundle.files.get(reference)).toBeTruthy();
		expect(progressiveBundle.files.get(reference)).toBe(controlBundle.files.get(reference));
		expect(controlBundle.files.has(`${root}/skills/planning/SKILL.md`)).toBe(true);
		expect(progressiveBundle.files.has(`${root}/skills/planning/SKILL.md`)).toBe(false);
		await expect(progressive.loadSkill('planning')).resolves.toBeNull();
		await expect(
			createSkillLoadTool(progressiveBundle.source).handler?.({ skillId: 'planning' }, {}),
		).resolves.toMatchObject({ success: false });
		await expect(progressive.loadSkill('progressive-building')).resolves.toBeNull();
		expect(progressiveBundle.files.has(`${root}/skills/progressive-building/SKILL.md`)).toBe(false);
	});

	it('keeps the progressive policy out of the general system prompt', () => {
		expect(getSystemPrompt()).not.toContain('# Progressive building');
	});
});
