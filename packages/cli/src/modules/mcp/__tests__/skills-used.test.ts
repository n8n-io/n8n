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

	test('keeps namespaced identifiers', () => {
		expect(sanitizeSkillsUsed(['n8n:plan', 'frontend-design:frontend-design'])).toEqual([
			'n8n:plan',
			'frontend-design:frontend-design',
		]);
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
				'has.dot',
				'has_underscore',
				'unicode-‑hyphen',
				'contains "quote"',
				'1starts-with-digit',
				'-starts-with-dash',
			]),
		).toEqual(['workflow-builder']);
	});

	test('drops non-string entries', () => {
		expect(sanitizeSkillsUsed(['workflow-builder', 42, null, undefined, { x: 1 }])).toEqual([
			'workflow-builder',
		]);
	});

	test('drops entries longer than 128 chars', () => {
		const tooLong = 'a'.repeat(129);
		const justRight = 'a'.repeat(128);
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
