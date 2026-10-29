import { toAgentSkill, toSkillContent } from '../utils/skill-content';

import { skillRow, versionRow } from './test-utils/skill-services';

describe('skill content', () => {
	it('ignores allowed tools on write', () => {
		expect(
			toSkillContent({
				name: 'n',
				description: 'd',
				instructions: 'i',
				allowedTools: ['Read', 'Grep'],
				references: [{ path: 'references/a.md', content: 'a' }],
			}),
		).toEqual({
			name: 'n',
			description: 'd',
			instructions: 'i',
			frontmatter: null,
			files: [{ path: 'references/a.md', content: 'a' }],
		});
	});

	it('keeps the frontmatter as given and reads no allowed tools from it', () => {
		const row = versionRow(skillRow('skill_a'), 1, {
			frontmatter: { 'allowed-tools': 'Read Grep', license: 'MIT' },
		});

		expect(toSkillContent(toAgentSkill(row), row.version.frontmatter).frontmatter).toEqual({
			'allowed-tools': 'Read Grep',
			license: 'MIT',
		});
		expect(toAgentSkill(row)).toEqual({
			name: 'Brand voice',
			description: 'Write in our voice',
			instructions: 'Use short sentences.',
		});
	});
});
