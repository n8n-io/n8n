import { mock } from 'vitest-mock-extended';

import type { GitHubClient, GitHubTreeEntry } from '../github-client';
import { findSkillFolders, folderTreeSha, parseSkillFile, readSkillFolder } from '../skill-folder';

const blob = (path: string, size = 10): GitHubTreeEntry => ({
	path,
	type: 'blob',
	sha: `b-${path}`,
	size,
});
const tree = (path: string): GitHubTreeEntry => ({ path, type: 'tree', sha: `t-${path}` });

describe('parseSkillFile', () => {
	it('reads name, description, instructions and the other frontmatter keys', () => {
		expect(
			parseSkillFile(
				'---\nname: pdf\ndescription: Reads PDFs.\nlicense: MIT\n---\n\n# PDF\nRead it.\n',
			),
		).toEqual({
			ok: true,
			name: 'pdf',
			description: 'Reads PDFs.',
			instructions: '# PDF\nRead it.',
			frontmatter: { license: 'MIT' },
		});
	});

	it.each([
		['# No frontmatter', 'must start with YAML frontmatter'],
		['---\nname: x\n', 'no closing'],
		['---\ndescription: d\n---\nx', 'no name'],
		['---\nname: x\n---\nx', 'no description'],
		['---\n- a\n---\nx', 'not a YAML map'],
	])('refuses %j', (text, message) => {
		const parsed = parseSkillFile(text);
		expect(parsed.ok).toBe(false);
		expect(parsed.ok ? '' : parsed.message).toContain(message);
	});
});

describe('findSkillFolders and folderTreeSha', () => {
	const entries = [
		blob('README.md'),
		tree('skills'),
		tree('skills/pdf'),
		blob('skills/pdf/SKILL.md'),
		tree('skills/notes'),
		blob('skills/notes/SKILL.md'),
	];

	it('finds every folder with a SKILL.md under a path', () => {
		expect(findSkillFolders(entries, '')).toEqual(['skills/notes', 'skills/pdf']);
		expect(findSkillFolders(entries, 'skills/pdf')).toEqual(['skills/pdf']);
		expect(findSkillFolders(entries, 'docs')).toEqual([]);
	});

	it('returns the tree SHA of a folder, or the root tree for the root', () => {
		expect(folderTreeSha(entries, 'root', 'skills/pdf')).toBe('t-skills/pdf');
		expect(folderTreeSha(entries, 'root', '')).toBe('root');
	});
});

describe('readSkillFolder', () => {
	const client = mock<GitHubClient>();
	const source = { owner: 'acme', repo: 'skills', commitSha: 'c'.repeat(40) };
	const files: Record<string, string> = {
		'skills/pdf/SKILL.md': '---\nname: pdf\ndescription: Reads PDFs.\n---\nRead it.',
		'skills/pdf/references/b.md': 'B',
		'skills/pdf/references/a.md': 'A',
	};

	beforeEach(() => {
		client.file.mockImplementation(async (_o, _r, _c, path) => files[path] ?? '');
	});

	it('reads SKILL.md and the Markdown references, sorted, and lists the other files', async () => {
		const entries = [
			blob('skills/pdf/SKILL.md'),
			blob('skills/pdf/references/b.md'),
			blob('skills/pdf/references/a.md'),
			blob('skills/pdf/references/data.csv'),
			blob('skills/pdf/scripts/run.py'),
		];
		const read = await readSkillFolder(client, source, entries, 'skills/pdf', ['skills/pdf']);
		expect(read.content).toEqual({
			name: 'pdf',
			description: 'Reads PDFs.',
			instructions: 'Read it.',
			frontmatter: null,
			files: [
				{ path: 'references/a.md', content: 'A' },
				{ path: 'references/b.md', content: 'B' },
			],
		});
		expect(read.skippedFiles.map((skipped) => skipped.path)).toEqual([
			'references/data.csv',
			'scripts/run.py',
		]);
		expect(read.check.result).toBe('review');
	});

	it('leaves the files of a nested skill to that skill', async () => {
		const entries = [blob('SKILL.md'), blob('skills/pdf/SKILL.md')];
		files['SKILL.md'] = '---\nname: root\ndescription: Root.\n---\nRoot.';
		const read = await readSkillFolder(client, source, entries, '', ['', 'skills/pdf']);
		expect(read.skippedFiles).toEqual([]);
		expect(read.check.result).toBe('passed');
	});

	it('blocks a folder with too many references without reading them', async () => {
		client.file.mockClear();
		const entries = [
			blob('x/SKILL.md'),
			...Array.from({ length: 21 }, (_, index) => blob(`x/references/${index}.md`)),
		];
		const read = await readSkillFolder(client, source, entries, 'x', ['x']);
		expect(read.check.result).toBe('blocked');
		expect(read.check.findings[0]?.code).toBe('too_large');
		expect(client.file).not.toHaveBeenCalled();
	});

	it('blocks a SKILL.md without a description', async () => {
		files['y/SKILL.md'] = '---\nname: y\n---\nBody';
		const read = await readSkillFolder(client, source, [blob('y/SKILL.md')], 'y', ['y']);
		expect(read).toMatchObject({ name: 'y', check: { result: 'blocked' } });
		expect(read.content).toBeUndefined();
	});
});
