import { sanitizeSkillsUsed } from '../tools/workflow-builder/skills-used';

describe('sanitizeSkillsUsed', () => {
	test('returns undefined for non-array input', () => {
		expect(sanitizeSkillsUsed(undefined)).toBeUndefined();
		expect(sanitizeSkillsUsed(null)).toBeUndefined();
		expect(sanitizeSkillsUsed('workflow-builder')).toBeUndefined();
		expect(sanitizeSkillsUsed(42)).toBeUndefined();
		expect(sanitizeSkillsUsed({ skill: 'workflow-builder' })).toBeUndefined();
	});

	test('returns undefined for an empty array', () => {
		expect(sanitizeSkillsUsed([])).toBeUndefined();
	});

	test('returns undefined when every entry is invalid', () => {
		expect(sanitizeSkillsUsed(['', '   ', 'UPPER CASE', 'has spaces', '!!!'])).toBeUndefined();
	});

	test('keeps valid kebab-case identifiers', () => {
		expect(sanitizeSkillsUsed(['workflow-builder', 'node-selection'])).toEqual([
			'workflow-builder',
			'node-selection',
		]);
	});

	test('keeps identifiers with underscores and dots', () => {
		expect(sanitizeSkillsUsed(['snake_case_skill', 'dotted.skill.name'])).toEqual([
			'snake_case_skill',
			'dotted.skill.name',
		]);
	});

	test('keeps identifiers starting with a digit', () => {
		expect(sanitizeSkillsUsed(['1-step-skill'])).toEqual(['1-step-skill']);
	});

	test('trims and lowercases entries', () => {
		expect(sanitizeSkillsUsed(['  Workflow-Builder  ', 'NODE-SELECTION'])).toEqual([
			'workflow-builder',
			'node-selection',
		]);
	});

	test('drops entries with disallowed characters', () => {
		expect(
			sanitizeSkillsUsed([
				'workflow-builder',
				'has spaces',
				'has/slash',
				'unicode-‑hyphen',
				'contains "quote"',
				'-starts-with-dash',
				'.starts-with-dot',
			]),
		).toEqual(['workflow-builder']);
	});

	test('keeps plugin-prefixed identifiers', () => {
		expect(
			sanitizeSkillsUsed(['n8n-skills:workflow-builder', 'community-plugin:node-selection']),
		).toEqual(['n8n-skills:workflow-builder', 'community-plugin:node-selection']);
	});

	test('trims and lowercases plugin-prefixed identifiers', () => {
		expect(sanitizeSkillsUsed(['  N8N-Skills:Workflow-Builder  '])).toEqual([
			'n8n-skills:workflow-builder',
		]);
	});

	test('keeps prefixed and unprefixed variants of the same skill as distinct entries', () => {
		expect(sanitizeSkillsUsed(['workflow-builder', 'n8n-skills:workflow-builder'])).toEqual([
			'workflow-builder',
			'n8n-skills:workflow-builder',
		]);
	});

	test('drops malformed plugin-prefixed identifiers', () => {
		expect(
			sanitizeSkillsUsed([
				'n8n-skills:workflow-builder',
				':missing-prefix',
				'missing-name:',
				'double::colon',
				'too:many:colons',
				'n8n-skills:has spaces',
				'-bad-prefix:workflow-builder',
				`${'a'.repeat(65)}:workflow-builder`,
				`n8n-skills:${'a'.repeat(65)}`,
			]),
		).toEqual(['n8n-skills:workflow-builder']);
	});

	test('drops non-string entries', () => {
		expect(sanitizeSkillsUsed(['workflow-builder', 42, null, undefined, { x: 1 }])).toEqual([
			'workflow-builder',
		]);
	});

	test('drops entries longer than 64 chars', () => {
		const tooLong = 'a'.repeat(65);
		const justRight = 'a'.repeat(64);
		expect(sanitizeSkillsUsed([tooLong, justRight, 'workflow-builder'])).toEqual([
			justRight,
			'workflow-builder',
		]);
	});

	test('deduplicates after normalization', () => {
		expect(
			sanitizeSkillsUsed([
				'workflow-builder',
				'Workflow-Builder',
				'  workflow-builder  ',
				'node-selection',
			]),
		).toEqual(['workflow-builder', 'node-selection']);
	});

	test('caps the result at 50 entries without rejecting the input', () => {
		const input = Array.from({ length: 60 }, (_, i) => `skill-${i}`);
		const result = sanitizeSkillsUsed(input);
		expect(result).toHaveLength(50);
		expect(result?.[0]).toBe('skill-0');
		expect(result?.[49]).toBe('skill-49');
	});
});
