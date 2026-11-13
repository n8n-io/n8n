import { countsByFile, diffSkills, SKILL_FILE } from './skillVersionDiff';

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
