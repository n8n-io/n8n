import {
	createRuntimeSkillSource,
	extendRuntimeSkillSource,
	renderSkillCatalogPrompt,
} from '@n8n/agents';

import { getBuilderRuntimeSkills } from '..';
import { TASK_OBJECTIVE_SECTIONS } from '../../task-objective-template';

describe('getBuilderRuntimeSkills', () => {
	const baseSource = createRuntimeSkillSource([
		{
			id: 'agent-builder',
			name: 'agent-builder',
			description: 'Build Agents.',
			instructions: 'Agent steps.',
		},
	]);

	it('lists every builder skill as a reference of agent-builder', () => {
		const builderSkills = getBuilderRuntimeSkills();
		const source = extendRuntimeSkillSource(baseSource, builderSkills);

		const references = source.registry.skills
			.filter((entry) => entry.parents?.includes('agent-builder'))
			.map((entry) => entry.id);
		expect(references).toEqual(expect.arrayContaining(builderSkills.map((skill) => skill.id)));
		expect(references).toHaveLength(builderSkills.length);
	});

	it('keeps builder skills out of the top-level catalog', () => {
		const builderSkills = getBuilderRuntimeSkills();
		const catalog = renderSkillCatalogPrompt(
			extendRuntimeSkillSource(baseSource, builderSkills).registry,
		);

		expect(catalog).toContain('id: "agent-builder"');
		for (const skill of builderSkills) {
			expect(catalog).not.toContain(`id: "${skill.id}"`);
		}
	});

	function instructionsOf(skillId: string): string {
		const skill = getBuilderRuntimeSkills().find((entry) => entry.id === skillId);
		return skill?.instructions ?? '';
	}

	it('keeps the skill template sections in the target-skills reference', () => {
		const instructions = instructionsOf('agent-builder-target-skills');

		for (const heading of ['Overview', 'Inputs', 'Steps', 'Rules', 'Example', 'Gotchas']) {
			expect(instructions).toContain(`## ${heading}\n`);
		}
	});

	it('shows every objective template section that the builder checks', () => {
		const instructions = instructionsOf('agent-builder-target-tasks');

		for (const heading of TASK_OBJECTIVE_SECTIONS) {
			expect(instructions).toContain(`## ${heading}\n`);
		}
	});
});
