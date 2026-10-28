import { countsByFile, diffLines, diffSkills, diffWords, SKILL_FILE } from './skillVersionDiff';

describe('diffLines', () => {
	it('keeps equal lines and marks removed and added ones', () => {
		expect(diffLines('a\nb\nc', 'a\nB\nc')).toEqual([
			{ type: 'equal', text: 'a' },
			{ type: 'removed', text: 'b', segments: [{ text: 'b', changed: true }] },
			{ type: 'added', text: 'B', segments: [{ text: 'B', changed: true }] },
			{ type: 'equal', text: 'c' },
		]);
	});

	it('counts every line of a new text as added', () => {
		const lines = diffLines('', 'one\ntwo');

		expect(lines.map((line) => line.type)).toEqual(['added', 'added']);
	});

	it('finds the common lines between edits', () => {
		const lines = diffLines('keep\ndrop\nkeep too', 'new\nkeep\nkeep too\nend');

		expect(lines.map((line) => `${line.type}:${line.text}`)).toEqual([
			'added:new',
			'equal:keep',
			'removed:drop',
			'equal:keep too',
			'added:end',
		]);
	});
});

describe('diffWords', () => {
	it('marks only the words that changed', () => {
		const { from, to } = diffWords(
			'Find research and cite the source.',
			'Find research and cite the evidence.',
		);

		expect(from.filter((segment) => segment.changed).map((segment) => segment.text)).toEqual([
			'source.',
		]);
		expect(to.filter((segment) => segment.changed).map((segment) => segment.text)).toEqual([
			'evidence.',
		]);
		expect(to.map((segment) => segment.text).join('')).toBe('Find research and cite the evidence.');
	});
});

describe('diffSkills', () => {
	const base = { name: 'Tone', description: 'Writing style', instructions: 'Be brief.' };

	it('has a section for each field and each reference file of either version', () => {
		const sections = diffSkills(
			{ ...base, references: [{ path: 'references/old.md', content: 'Old' }] },
			{
				...base,
				name: 'Voice',
				references: [{ path: 'references/new.md', content: 'One\nTwo' }],
			},
		);

		expect(sections.map(({ key, added, removed }) => ({ key, added, removed }))).toEqual([
			{ key: 'name', added: 1, removed: 1 },
			{ key: 'description', added: 0, removed: 0 },
			{ key: 'instructions', added: 0, removed: 0 },
			{ key: 'references/new.md', added: 2, removed: 0 },
			{ key: 'references/old.md', added: 0, removed: 1 },
		]);
	});

	it('marks a reference file that only one version has as added or removed', () => {
		const sections = diffSkills(
			{ ...base, references: [{ path: 'references/old.md', content: 'Old' }] },
			{ ...base, references: [{ path: 'references/new.md', content: 'One\nTwo' }] },
		);
		const counts = countsByFile(sections);

		expect(counts['references/new.md']).toEqual({ added: 2, removed: 0, status: 'added' });
		expect(counts['references/old.md']).toEqual({ added: 0, removed: 1, status: 'removed' });
		expect(counts[SKILL_FILE].status).toBeUndefined();
	});

	it('counts the fields of SKILL.md together in the file list', () => {
		const counts = countsByFile(
			diffSkills(base, { ...base, description: 'New style', instructions: 'Be brief.\nBe kind.' }),
		);

		expect(counts[SKILL_FILE]).toEqual({ added: 2, removed: 1 });
	});
});

describe('large texts', () => {
	it('shows two long texts with nothing in common as removed and then added', () => {
		const from = Array.from({ length: 3000 }, (_, index) => `old line ${index}`).join('\n');
		const to = Array.from({ length: 3000 }, (_, index) => `new line ${index}`).join('\n');

		const lines = diffLines(from, to);

		expect(lines).toHaveLength(6000);
		expect(lines[0].type).toBe('removed');
		expect(lines[5999].type).toBe('added');
	});
});
