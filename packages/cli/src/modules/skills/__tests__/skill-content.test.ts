import {
	syncedSourceLabel,
	toAgentSkill,
	toSkillContent,
	toSkillUpdate,
} from '../utils/skill-content';

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

describe('toSkillUpdate', () => {
	it.each([
		{ case: 'no changes', changes: {}, expected: { baseSkillHash: 'h' } },
		{
			case: 'new instructions',
			changes: { instructions: 'new' },
			expected: { baseSkillHash: 'h', instructions: 'new' },
		},
		{
			case: 'references, as files',
			changes: { references: [{ path: 'references/a.md', content: 'a' }] },
			expected: { baseSkillHash: 'h', files: [{ path: 'references/a.md', content: 'a' }] },
		},
		{
			case: 'no references, which removes the files',
			changes: { references: [] },
			expected: { baseSkillHash: 'h', files: [] },
		},
		{
			case: 'allowed tools, which skills ignore',
			changes: { instructions: 'new', allowedTools: ['Bash'] },
			expected: { baseSkillHash: 'h', instructions: 'new' },
		},
	])('$case', ({ changes, expected }) => {
		expect(toSkillUpdate(changes, 'h')).toEqual(expected);
	});
});

describe('syncedSourceLabel', () => {
	it.each([
		{ source: 'ui', expected: undefined },
		{ source: 'agent', expected: undefined },
		{ source: 'mcp', expected: undefined },
		{ source: 'assistant', expected: undefined },
		{ source: 'github', expected: 'GitHub' },
	] as const)('$source → $expected', ({ source, expected }) => {
		expect(syncedSourceLabel(source)).toBe(expected);
	});
});
