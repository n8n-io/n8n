import { getBuilderRuntimeSkills } from '../index';

describe('getBuilderRuntimeSkills', () => {
	it('includes the external services skill', () => {
		const skills = getBuilderRuntimeSkills();

		expect(skills.some((skill) => skill.id === 'agent-builder-external-services')).toBe(true);
	});

	it('exposes every MCP tool by default', () => {
		const skill = getBuilderRuntimeSkills().find(
			(candidate) => candidate.id === 'agent-builder-external-services',
		);

		expect(skill?.instructions).toContain('omit `toolFilter`');
		expect(skill?.instructions).toContain('explicitly asks to restrict');
	});

	it('uses only exact unprefixed discovered names for MCP filters and approvals', () => {
		const skill = getBuilderRuntimeSkills().find(
			(candidate) => candidate.id === 'agent-builder-external-services',
		);

		expect(skill?.instructions).toContain('exact, unprefixed');
		expect(skill?.instructions).toContain('Never prepend the server name');
		expect(skill?.instructions).toContain('Never invent MCP tool names');
	});
});
