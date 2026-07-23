import { getBuilderRuntimeSkills } from '../index';

describe('getBuilderRuntimeSkills', () => {
	it('includes the external services skill', () => {
		const skills = getBuilderRuntimeSkills();

		expect(skills.some((skill) => skill.id === 'agent-builder-external-services')).toBe(true);
	});
});
