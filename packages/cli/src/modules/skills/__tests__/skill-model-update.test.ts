import { withUnsentSkillFiles } from '../utils/skill-model-update';

describe('withUnsentSkillFiles', () => {
	const logo = { path: 'assets/logo.png', content: 'AP8=', isBinary: true as const };
	const script = { path: 'scripts/run.py', content: 'print(1)' };
	const guide = { path: 'references/guide.md', content: 'Old.' };
	const notes = { path: 'references/notes.md', content: 'Notes.' };
	const stored = [logo, guide, notes, script];
	const newGuide = { ...guide, content: 'New.' };

	it('keeps the stored binary files that the update does not name in stored path order', () => {
		expect(withUnsentSkillFiles(stored, [newGuide])).toEqual([logo, newGuide]);
	});

	it('also keeps the other files that are not Markdown in stored path order for a caller that sends Markdown only', () => {
		expect(withUnsentSkillFiles(stored, [newGuide], { keepNonMarkdown: true })).toEqual([
			logo,
			newGuide,
			script,
		]);
	});

	it('keeps the stored bytes for a binary file with empty content', () => {
		const sent = [{ path: logo.path, content: '', isBinary: true as const }];

		expect(withUnsentSkillFiles(stored, sent)).toEqual([logo]);
	});

	it('replaces a stored binary file that the update names with content', () => {
		const sent = [{ path: logo.path, content: 'AAE=', isBinary: true as const }, script];

		expect(withUnsentSkillFiles(stored, sent, { keepNonMarkdown: true })).toEqual(sent);
	});

	it('keeps no file of an update with no files when the skill has only Markdown', () => {
		expect(withUnsentSkillFiles([guide, notes], [], { keepNonMarkdown: true })).toEqual([]);
	});
});
