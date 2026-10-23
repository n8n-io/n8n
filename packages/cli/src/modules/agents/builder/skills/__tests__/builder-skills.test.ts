import {
	createRuntimeSkillSource,
	extendRuntimeSkillSource,
	renderSkillCatalogPrompt,
} from '@n8n/agents';

import { getBuilderRuntimeSkills } from '..';

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
});
