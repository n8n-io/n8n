import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import nock from 'nock';

import { FakeGitHub } from './test-utils/fake-github';
import { describeSkillSourceClientContract } from './test-utils/skill-source-client.contract';
import { SkillSourceNotFoundError } from '../errors/skill-source-not-found.error';
import { SkillSourceReadError } from '../errors/skill-source-read.error';
import { SkillSourceUrlError } from '../errors/skill-source-url.error';
import { GitHubSkillSourceClient } from '../sources/github/github-skill-source-client';
import type { SkillContent } from '../utils/skill-content-hash';
import { writeSkillFolder } from '../utils/skill-md';

/** The folder of a skill in a fake repository: its name as a slug. */
const folderOf = (name: string) => `skills/${name.toLowerCase().replace(/\W+/g, '-')}`;

function filesOf(skills: SkillContent[]): Record<string, string> {
	const files: Record<string, string> = { 'README.md': '# Skills\n' };
	for (const skill of skills) {
		for (const file of writeSkillFolder(skill)) {
			files[`${folderOf(skill.name)}/${file.path}`] = file.content;
		}
	}
	return files;
}

const skillMd = (name: string, body = `Follow ${name}.`) =>
	`---\nname: ${name}\ndescription: ${name} description\n---\n\n${body}\n`;

describe('GitHubSkillSourceClient', () => {
	const github = new FakeGitHub();
	let client: GitHubSkillSourceClient;
	let published = 0;

	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.enableNetConnect();
	});

	beforeEach(() => {
		client = new GitHubSkillSourceClient(Container.get(OutboundHttp));
		github.start();
	});

	afterEach(() => {
		github.stop();
	});

	describeSkillSourceClientContract(() => ({
		client,
		publish: async (skills) => {
			published += 1;
			const fullName = `acme/skills-${published}`;
			github.push(fullName, filesOf(skills));
			return `https://github.com/${fullName}`;
		},
		edit: async (link, name, content) => {
			const fullName = new URL(link).pathname.slice(1);
			const files = github.files(fullName);
			for (const path of Object.keys(files)) {
				if (path.startsWith(`${folderOf(name)}/`)) delete files[path];
			}
			for (const file of writeSkillFolder(content))
				files[`${folderOf(name)}/${file.path}`] = file.content;
			github.push(fullName, files);
		},
		remove: async (link, name) => {
			const fullName = new URL(link).pathname.slice(1);
			const files = github.files(fullName);
			for (const path of Object.keys(files)) {
				if (path.startsWith(`${folderOf(name)}/`)) delete files[path];
			}
			github.push(fullName, files);
		},
		invalidLinks: [
			'http://github.com/acme/skills',
			'https://gitlab.com/acme/skills',
			'https://github.com/acme',
			'https://github.com/acme/skills/issues',
			'https://github.com/acme/skills/blob/main/README.md',
		],
		missingLink: 'https://github.com/acme/no-such-repository',
	}));

	describe('links', () => {
		beforeEach(() => {
			github.push('acme/skills', {
				'skills/pdf/SKILL.md': skillMd('pdf'),
				'skills/pdf/references/pages.md': '# Pages\n',
				'skills/pdf/scripts/split.py': 'print(1)\n',
			});
			github.push(
				'acme/skills',
				{ 'skills/pdf/SKILL.md': skillMd('pdf', 'On a branch.') },
				'feature/new-pdf',
			);
		});

		it('reads a link to the repository on its default branch', async () => {
			const locator = await client.parseLocator('https://github.com/acme/skills');

			expect(client.describe(locator)).toEqual({ label: 'acme/skills', ref: 'main', path: '' });
		});

		it('reads a link to a folder on a branch with a slash in its name', async () => {
			const locator = await client.parseLocator(
				'https://github.com/acme/skills/tree/feature/new-pdf/skills/pdf',
			);
			const { items } = await client.discover(locator);
			const fetched = await client.fetchLatest(locator, items[0]);

			expect(client.describe(locator)).toEqual({
				label: 'acme/skills',
				ref: 'feature/new-pdf',
				path: 'skills/pdf',
			});
			expect(fetched.content.instructions).toBe('On a branch.');
		});

		it('reads a link to one SKILL.md as its folder', async () => {
			const locator = await client.parseLocator(
				'https://github.com/acme/skills/blob/main/skills/pdf/SKILL.md',
			);

			expect(client.describe(locator).path).toBe('skills/pdf');
			expect((await client.discover(locator)).items).toEqual([{ path: 'skills/pdf' }]);
		});

		it('refuses a link to a tag or a commit', async () => {
			await expect(
				client.parseLocator('https://github.com/acme/skills/tree/v1.0.0/skills'),
			).rejects.toThrow(SkillSourceUrlError);
		});

		it('fails with SkillSourceNotFoundError for a folder that is not on the branch', async () => {
			const locator = await client.parseLocator('https://github.com/acme/skills/tree/main/nope');

			await expect(client.discover(locator)).rejects.toThrow(SkillSourceNotFoundError);
		});

		it('keeps references and lists the files that a skill cannot hold', async () => {
			const locator = await client.parseLocator('https://github.com/acme/skills');
			const fetched = await client.fetchLatest(locator, { path: 'skills/pdf' });

			expect(fetched.content.files).toEqual([
				{ path: 'references/pages.md', content: '# Pages\n' },
			]);
			expect(fetched.skippedFiles).toEqual(['scripts/split.py']);
			expect(client.webUrl(locator, { path: 'skills/pdf' })).toBe(
				'https://github.com/acme/skills/tree/main/skills/pdf',
			);
		});
	});

	it('skips a reference over the size limit instead of importing it empty', async () => {
		github.push('acme/skills', {
			'pdf/SKILL.md': skillMd('pdf'),
			'pdf/references/small.md': '# Small\n',
			'pdf/references/huge.md': 'x'.repeat(1024 * 1024 + 1),
		});
		const locator = await client.parseLocator('https://github.com/acme/skills');

		const fetched = await client.fetchLatest(locator, { path: 'pdf' });

		expect(fetched.content.files).toEqual([{ path: 'references/small.md', content: '# Small\n' }]);
		expect(fetched.skippedFiles).toEqual(['references/huge.md']);
	});

	it('reads branches whose names differ only in case as two branches', async () => {
		github.push('acme/skills', { 'a/SKILL.md': skillMd('a') }, 'main');
		github.push('acme/skills', { 'a/SKILL.md': skillMd('a', 'Upper.') }, 'Main');
		const [lower, upper] = await Promise.all(
			['main', 'Main'].map(async (branch) => {
				const locator = { owner: 'acme', repository: 'skills', branch, path: '' };
				return await client.fetchLatest(locator, { path: 'a' });
			}),
		);

		expect(lower.content.instructions).toBe('Follow a.');
		expect(upper.content.instructions).toBe('Upper.');
	});

	describe('requests', () => {
		it('reads one archive and asks for the branch twice for a discover and its fetches', async () => {
			github.push('acme/skills', {
				'a/SKILL.md': skillMd('a'),
				'b/SKILL.md': skillMd('b'),
				'c/SKILL.md': skillMd('c'),
			});
			const locator = await client.parseLocator('https://github.com/acme/skills');

			const { items, revision } = await client.discover(locator);
			await Promise.all(
				items.map(async (ref) => await client.fetchLatest(locator, ref, undefined, revision)),
			);

			expect(github.requests.archives).toBe(1);
			// One branch lookup for the link and one for discover. The fetches reuse its commit.
			expect(github.requests.refs).toBe(2);
		});

		it('reports a rate limit as rate_limited', async () => {
			github.push('acme/skills', { 'a/SKILL.md': skillMd('a') });
			github.failWith = 429;

			await expect(client.parseLocator('https://github.com/acme/skills')).rejects.toMatchObject({
				constructor: SkillSourceReadError,
				reason: 'rate_limited',
			});
		});

		it('reports a server failure as unreachable', async () => {
			github.push('acme/skills', { 'a/SKILL.md': skillMd('a') });
			github.failWith = 502;

			await expect(client.parseLocator('https://github.com/acme/skills')).rejects.toMatchObject({
				reason: 'unreachable',
			});
		});
	});
});
