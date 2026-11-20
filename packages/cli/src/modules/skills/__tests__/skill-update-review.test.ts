import type { SkillContent } from '../utils/skill-content-hash';
import { updateFiles } from '../utils/skill-update-review';

describe('updateFiles', () => {
	it('marks changes to binary files and exposes only text in the preview', () => {
		const before: SkillContent = {
			name: 'Example',
			description: 'Example skill',
			instructions: 'Read the guide.',
			frontmatter: null,
			files: [
				{ path: 'changed.bin', content: 'AP8=', isBinary: true },
				{ path: 'unchanged.bin', content: 'AP8=', isBinary: true },
				{ path: 'guide', content: 'AP8=', isBinary: true },
			],
		};
		const after: SkillContent = {
			...before,
			files: [
				{ path: 'changed.bin', content: 'AAE=', isBinary: true },
				before.files[1],
				{ path: 'guide', content: 'AP8=' },
			],
		};

		expect(updateFiles(before, after).slice(1)).toEqual([
			{
				path: 'changed.bin',
				before: '',
				after: '',
				beforeIsBinary: true,
				afterIsBinary: true,
				status: 'modified',
			},
			{
				path: 'unchanged.bin',
				before: '',
				after: '',
				beforeIsBinary: true,
				afterIsBinary: true,
			},
			{ path: 'guide', before: '', after: 'AP8=', beforeIsBinary: true, status: 'modified' },
		]);
	});
});
