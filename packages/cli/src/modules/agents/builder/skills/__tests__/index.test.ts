import { CONFIGURE_CHANNEL_TOOL_NAME } from '@n8n/api-types';

import { getBuilderRuntimeSkills } from '../index';

describe('getBuilderRuntimeSkills', () => {
	it('includes the integrations skill by default', () => {
		const skills = getBuilderRuntimeSkills();

		expect(skills.some((skill) => skill.id === 'agent-builder-integrations')).toBe(true);
	});

	it('omits the integrations skill when configure_channel is excluded (e.g. instance-AI sub-agent sessions)', () => {
		const skills = getBuilderRuntimeSkills([CONFIGURE_CHANNEL_TOOL_NAME]);

		expect(skills.some((skill) => skill.id === 'agent-builder-integrations')).toBe(false);
	});

	it('keeps the integrations skill when other tools are excluded', () => {
		const skills = getBuilderRuntimeSkills(['ask_questions']);

		expect(skills.some((skill) => skill.id === 'agent-builder-integrations')).toBe(true);
	});
});
