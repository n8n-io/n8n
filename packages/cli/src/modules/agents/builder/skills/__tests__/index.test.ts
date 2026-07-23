import { getBuilderRuntimeSkills } from '../index';

describe('getBuilderRuntimeSkills', () => {
	it('includes the integrations skill', () => {
		const skills = getBuilderRuntimeSkills();

		expect(skills.some((skill) => skill.id === 'agent-builder-integrations')).toBe(true);
	});
});
