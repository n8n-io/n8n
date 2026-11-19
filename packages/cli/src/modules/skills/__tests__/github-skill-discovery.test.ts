import { SkillSourceUrlError } from '../errors/skill-source-url.error';
import { lsRefsRequestBody, parseLsRefsResponse, pktLine } from '../sources/github/git-refs';
import { parseGitHubLink, splitBranchAndPath } from '../sources/github/github-link';
import { filesOfSkill, findSkillFolders } from '../sources/github/skill-discovery';

describe('findSkillFolders', () => {
	it.each([
		{ name: 'a skill at the root', paths: ['SKILL.md'], root: '', folders: [''] },
		{
			name: 'skills at any depth, in path order',
			paths: ['skills/b/SKILL.md', 'a/SKILL.md', 'x/y/z/c/SKILL.md'],
			root: '',
			folders: ['a', 'skills/b', 'x/y/z/c'],
		},
		{
			name: 'the agent folders of Claude Code and Cursor',
			paths: [
				'.claude/skills/a/SKILL.md',
				'.cursor/skills/b/SKILL.md',
				'.agents/skills/c/SKILL.md',
			],
			root: '',
			folders: ['.agents/skills/c', '.claude/skills/a', '.cursor/skills/b'],
		},
		{
			name: 'only the skills under the root of the link',
			paths: ['one/a/SKILL.md', 'two/b/SKILL.md', 'one-more/c/SKILL.md'],
			root: 'one',
			folders: ['one/a'],
		},
		{
			name: 'no skill folder inside another skill folder',
			paths: ['a/SKILL.md', 'a/examples/inner/SKILL.md', 'b/SKILL.md'],
			root: '',
			folders: ['a', 'b'],
		},
		{
			name: 'no dependencies, git data or vendored code',
			paths: ['node_modules/x/SKILL.md', 'a/vendor/y/SKILL.md', '.git/SKILL.md', 'ok/SKILL.md'],
			root: '',
			folders: ['ok'],
		},
		{
			name: 'no file that only ends in SKILL.md',
			paths: ['a/NOT-SKILL.md', 'b/skill.md'],
			root: '',
			folders: [],
		},
	])('finds $name', ({ paths, root, folders }) => {
		expect(findSkillFolders(paths, root)).toEqual({ folders, truncated: false, tooDeep: 0 });
	});

	it('stops at the depth and the count limits', () => {
		const paths = ['1/2/3/SKILL.md', '1/2/3/4/SKILL.md', 'a/SKILL.md', 'b/SKILL.md', 'c/SKILL.md'];

		expect(findSkillFolders(paths, '', { maxDepth: 3, maxSkills: 2 })).toEqual({
			folders: ['1/2/3', 'a'],
			truncated: true,
			tooDeep: 0,
		});
	});

	it('counts the skill folders below the depth limit that it leaves out', () => {
		const paths = [
			'a/SKILL.md',
			'a/1/2/3/SKILL.md',
			'x/1/2/3/SKILL.md',
			'x/1/2/3/inner/SKILL.md',
			'y/1/2/3/SKILL.md',
			'node_modules/1/2/3/SKILL.md',
		];

		expect(findSkillFolders(paths, '', { maxDepth: 3, maxSkills: 10 })).toEqual({
			folders: ['a'],
			truncated: false,
			tooDeep: 2,
		});
	});

	it('measures the depth from the root of the link', () => {
		const paths = ['skills/1/2/SKILL.md', 'skills/1/2/3/SKILL.md'];

		expect(findSkillFolders(paths, 'skills/1', { maxDepth: 1, maxSkills: 10 })).toEqual({
			folders: ['skills/1/2'],
			truncated: false,
			tooDeep: 0,
		});
	});
});

describe('filesOfSkill', () => {
	it('lists the files of the folder without the skills nested in it', () => {
		const paths = [
			'a/SKILL.md',
			'a/references/x.md',
			'a/scripts/run.sh',
			'a/inner/SKILL.md',
			'a/inner/references/y.md',
			'a/node_modules/z.js',
			'ab/SKILL.md',
		];

		expect(filesOfSkill(paths, 'a')).toEqual(['SKILL.md', 'references/x.md', 'scripts/run.sh']);
	});

	it('lists the files of a skill at the root', () => {
		expect(filesOfSkill(['SKILL.md', 'references/x.md', 'other/SKILL.md'], '')).toEqual([
			'SKILL.md',
			'references/x.md',
		]);
	});
});

describe('parseGitHubLink', () => {
	it.each([
		['https://github.com/acme/skills', { kind: 'repository', rest: [] }],
		['https://github.com/acme/skills.git', { kind: 'repository', rest: [] }],
		['https://www.github.com/acme/skills/', { kind: 'repository', rest: [] }],
		['https://github.com/acme/skills/tree/main/a/b', { kind: 'tree', rest: ['main', 'a', 'b'] }],
		[
			'https://github.com/acme/skills/blob/main/a/SKILL.md',
			{ kind: 'blob', rest: ['main', 'a', 'SKILL.md'] },
		],
		['  https://github.com/acme/skills?tab=readme  ', { kind: 'repository', rest: [] }],
	])('reads %s', (link, expected) => {
		expect(parseGitHubLink(link)).toEqual({ owner: 'acme', repository: 'skills', ...expected });
	});

	it.each([
		'github.com/acme/skills',
		'https://github.com/acme',
		'https://github.com/acme/skills/pulls',
		'https://github.com/acme/skills/tree',
		'https://github.com/acme/skills/tree/main/a%2F..%2F..%2Fx',
		'https://github.com/acme/skills/blob/main/README.md',
		'https://raw.githubusercontent.com/acme/skills/main/SKILL.md',
	])('refuses %s', (link) => {
		expect(() => parseGitHubLink(link)).toThrow(SkillSourceUrlError);
	});
});

describe('splitBranchAndPath', () => {
	const tree = (rest: string[]) => ({ owner: 'o', repository: 'r', kind: 'tree' as const, rest });

	it('takes the longest branch that the link starts with', () => {
		expect(
			splitBranchAndPath(tree(['feature', 'x', 'skills', 'a']), ['feature', 'feature/x']),
		).toEqual({
			branch: 'feature/x',
			path: 'skills/a',
		});
	});

	it('answers undefined for a tag or a commit', () => {
		expect(splitBranchAndPath(tree(['v1.0.0', 'skills']), ['main'])).toBeUndefined();
	});

	it('takes the folder of a SKILL.md link', () => {
		const blob = {
			owner: 'o',
			repository: 'r',
			kind: 'blob' as const,
			rest: ['main', 'a', 'SKILL.md'],
		};

		expect(splitBranchAndPath(blob, ['main'])).toEqual({ branch: 'main', path: 'a' });
	});
});

describe('ls-refs', () => {
	const sha = (char: string) => char.repeat(40);

	it('reads the default branch and every branch', () => {
		const body = Buffer.from(
			[
				`${sha('a')} HEAD symref-target:refs/heads/main\n`,
				`${sha('a')} refs/heads/main\n`,
				`${sha('b')} refs/heads/feature/x\n`,
			]
				.map(pktLine)
				.join('') + '0000',
		);

		expect(parseLsRefsResponse(body)).toEqual({
			defaultBranch: 'main',
			branches: new Map([
				['main', sha('a')],
				['feature/x', sha('b')],
			]),
		});
	});

	it('reads an empty repository', () => {
		expect(parseLsRefsResponse(Buffer.from('0000'))).toEqual({
			defaultBranch: undefined,
			branches: new Map(),
		});
	});

	it.each([
		{ name: 'a header that is not hex', body: 'zzzz' },
		{ name: 'a reserved length', body: '0003' },
		{ name: 'a line longer than the body', body: `0040${sha('a')} refs/heads/main` },
		{ name: 'trailing bytes', body: '000' },
	])('refuses $name', ({ body }) => {
		expect(() => parseLsRefsResponse(Buffer.from(body))).toThrow('Not a git pkt-line answer');
	});

	it('asks for HEAD and the branches with protocol v2', () => {
		expect(lsRefsRequestBody().toString()).toBe(
			'0014command=ls-refs\n0001000csymrefs\n001bref-prefix refs/heads/\n0014ref-prefix HEAD\n0000',
		);
	});
});
