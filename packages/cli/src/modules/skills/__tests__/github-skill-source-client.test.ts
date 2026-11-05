import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import nock from 'nock';

import { FakeGitHub } from './test-utils/fake-github';
import { describeSkillSourceClientContract } from './test-utils/skill-source-client.contract';
import { SkillParseError } from '../errors/skill-parse.error';
import { SkillSourceNotFoundError } from '../errors/skill-source-not-found.error';
import { SkillSourceReadError } from '../errors/skill-source-read.error';
import { SkillSourceUrlError } from '../errors/skill-source-url.error';
import {
	DEFAULT_ARCHIVE_LIMITS,
	archiveSize,
	type ArchiveLimits,
	type RepositoryArchive,
} from '../sources/github/github-archive';
import {
	GitHubSkillSourceClient,
	retryAfterSeconds,
} from '../sources/github/github-skill-source-client';
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

/** A SKILL.md of exactly `bytes` bytes. */
const skillMdOfSize = (name: string, bytes: number) =>
	skillMd(name, 'x'.repeat(bytes - skillMd(name, '').length));

/** A client with small archive limits, so a test needs no large repository. */
function clientWithLimits(limits: Partial<ArchiveLimits>): GitHubSkillSourceClient {
	class SmallClient extends GitHubSkillSourceClient {
		protected override readonly archiveLimits = { ...DEFAULT_ARCHIVE_LIMITS, ...limits };
	}
	return new SmallClient(Container.get(OutboundHttp));
}

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

	const TOKEN = 'ghp_reader';
	const tokenAuth = { token: TOKEN, credentialType: 'githubApi' };

	/** The contract subject on public repositories, or on private ones that a token reads. */
	const contractSubject = (privately: boolean) => ({
		client,
		...(privately ? { auth: tokenAuth } : {}),
		publish: async (skills: SkillContent[]) => {
			published += 1;
			const fullName = `acme/skills-${published}`;
			github.push(fullName, filesOf(skills), 'main', { private: privately });
			if (privately) github.grant(TOKEN, [fullName]);
			return `https://github.com/${fullName}`;
		},
		edit: async (link: string, name: string, content: SkillContent) => {
			const fullName = new URL(link).pathname.slice(1);
			const files = github.files(fullName);
			for (const path of Object.keys(files)) {
				if (path.startsWith(`${folderOf(name)}/`)) delete files[path];
			}
			for (const file of writeSkillFolder(content))
				files[`${folderOf(name)}/${file.path}`] = file.content;
			github.push(fullName, files);
		},
		remove: async (link: string, name: string) => {
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
	});

	describeSkillSourceClientContract(() => contractSubject(false));

	describe('on private repositories with a token', () => {
		beforeEach(() => github.grant(TOKEN, []));

		describeSkillSourceClientContract(() => contractSubject(true));
	});

	describe('credentials', () => {
		beforeEach(() => {
			github.push('acme/private', { 'pdf/SKILL.md': skillMd('pdf') }, 'main', { private: true });
			github.push('acme/public', { 'docx/SKILL.md': skillMd('docx') });
			github.grant(TOKEN, ['acme/private', 'acme/public']);
		});

		it('reads a private repository only with a token that GitHub grants it', async () => {
			const link = 'https://github.com/acme/private';
			const locator = await client.parseLocator(link, tokenAuth);
			const { items, revision } = await client.discover(locator, tokenAuth);
			const fetched = await client.fetchLatest(locator, items[0], tokenAuth, revision);

			expect(fetched.content.name).toBe('pdf');
			await expect(client.parseLocator(link)).rejects.toThrow(SkillSourceNotFoundError);
			github.grant('ghp_other', []);
			await expect(
				client.parseLocator(link, { token: 'ghp_other', credentialType: 'githubApi' }),
			).rejects.toThrow('The credential cannot read this repository');
		});

		it('never serves an archive that one token read to another token', async () => {
			const locator = await client.parseLocator('https://github.com/acme/private', tokenAuth);
			const { items, revision } = await client.discover(locator, tokenAuth);
			github.grant('ghp_other', []);
			const other = { token: 'ghp_other', credentialType: 'githubApi' };

			await expect(client.fetchLatest(locator, items[0], other, revision)).rejects.toThrow(
				SkillSourceNotFoundError,
			);
		});

		it('reports a token that GitHub refuses as credential_invalid', async () => {
			const bad = { token: 'ghp_unknown', credentialType: 'githubApi' };

			await expect(
				client.parseLocator('https://github.com/acme/public', bad),
			).rejects.toMatchObject({ reason: 'credential_invalid' });
		});

		it('lists the repositories of a token, and of a GitHub App installation', async () => {
			const expected = {
				repositories: [
					{ owner: 'acme', name: 'private', private: true, url: 'https://github.com/acme/private' },
					{ owner: 'acme', name: 'public', private: false, url: 'https://github.com/acme/public' },
				],
				truncated: false,
			};

			expect(await client.listRepositories(tokenAuth)).toEqual(expected);
			expect(
				await client.listRepositories({ token: TOKEN, credentialType: 'githubAppApi' }),
			).toEqual(expected);
		});

		it.each([
			{ case: 'a token', credential: { type: 'githubApi', data: { accessToken: 't' } }, ok: true },
			{
				case: 'a GitHub App token',
				credential: {
					type: 'githubAppApi',
					data: { accessToken: 't', server: 'https://api.github.com/' },
				},
				ok: true,
			},
			{
				case: 'OAuth2',
				credential: { type: 'githubOAuth2Api', data: { accessToken: 't' } },
				ok: false,
			},
			{ case: 'no token', credential: { type: 'githubApi', data: {} }, ok: false },
			{
				case: 'GitHub Enterprise',
				credential: {
					type: 'githubApi',
					data: { accessToken: 't', server: 'https://git.acme.dev/api/v3' },
				},
				ok: false,
			},
		])('takes $case: $ok', ({ credential, ok }) => {
			const read = () => client.authFrom(credential);

			if (ok) expect(read()).toEqual({ token: 't', credentialType: credential.type });
			else expect(read).toThrow(SkillSourceReadError);
		});

		it('refuses a credential for another GitHub server as host_blocked', () => {
			expect(() =>
				client.authFrom({
					type: 'githubApi',
					data: { accessToken: 't', server: 'https://git.acme.dev/api/v3' },
				}),
			).toThrow(expect.objectContaining({ reason: 'host_blocked' }));
		});

		it.each([
			{ count: 999, truncated: false },
			{ count: 1000, truncated: false },
			{ count: 1001, truncated: true },
		])('lists $count repositories with truncated $truncated', async ({ count, truncated }) => {
			const names = Array.from(
				{ length: count },
				(_, i) => `acme/repo-${String(i).padStart(4, '0')}`,
			);
			for (const name of names) github.push(name, { 'README.md': '#\n' });
			github.grant('ghp_many', names);

			const list = await client.listRepositories({
				token: 'ghp_many',
				credentialType: 'githubApi',
			});

			expect(list.repositories).toHaveLength(Math.min(count, 1000));
			expect(list.truncated).toBe(truncated);
		});

		it('shares one archive across the fresh tokens of one credential', async () => {
			github.grant('ghp_second', ['acme/private']);
			const first = { token: TOKEN, credentialType: 'githubAppApi', credentialId: 'app-1' };
			const second = { token: 'ghp_second', credentialType: 'githubAppApi', credentialId: 'app-1' };
			const locator = await client.parseLocator('https://github.com/acme/private', first);
			const { items, revision } = await client.discover(locator, first);

			await client.fetchLatest(locator, items[0], second, revision);

			expect(github.requests.archives).toBe(1);
		});

		it('checks a GitHub App before it has a token, and refuses one for another server', () => {
			const app = { appId: '1', installationId: '42', privateKey: 'key' };

			expect(() =>
				client.checkCredential({ type: 'githubAppApi', data: { ...app, accessToken: '' } }),
			).not.toThrow();
			expect(() =>
				client.checkCredential({
					type: 'githubAppApi',
					data: { ...app, server: 'https://git.acme.dev/api/v3' },
				}),
			).toThrow(SkillSourceReadError);
		});
	});

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

		it('refuses a link to a tag, a commit or a missing branch', async () => {
			await expect(
				client.parseLocator('https://github.com/acme/skills/tree/v1.0.0/skills'),
			).rejects.toMatchObject({
				constructor: SkillSourceUrlError,
				message: 'n8n cannot find this branch. Use a link to a branch, not to a tag or a commit.',
			});
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

	it('reads a SKILL.md of exactly 1 MB and refuses a larger one', async () => {
		github.push('acme/skills', {
			'fits/SKILL.md': skillMdOfSize('fits', 1024 * 1024),
			'huge/SKILL.md': skillMdOfSize('huge', 1024 * 1024 + 1),
		});
		const locator = await client.parseLocator('https://github.com/acme/skills');

		const fetched = await client.fetchLatest(locator, { path: 'fits' });

		expect(fetched.content.name).toBe('fits');
		await expect(client.fetchLatest(locator, { path: 'huge' })).rejects.toThrow(SkillParseError);
	});

	it('reports skills deeper than it reads', async () => {
		github.push('acme/skills', {
			'a/SKILL.md': skillMd('a'),
			'1/2/3/4/5/6/7/8/9/deep/SKILL.md': skillMd('deep'),
		});
		const locator = await client.parseLocator('https://github.com/acme/skills');

		const { items, tooDeep } = await client.discover(locator);

		expect(items).toEqual([{ path: 'a' }]);
		expect(tooDeep).toBe(1);
	});

	it('imports lossy, as it leaves out files a skill cannot hold', () => {
		expect(client.capabilities.importFidelity).toBe('lossy');
	});

	describe('archives', () => {
		const monorepo = () => {
			const files: Record<string, string> = {
				'.agents/skills/pdf/SKILL.md': skillMd('pdf'),
				'docs/SKILL.md': skillMd('docs'),
			};
			for (let index = 0; index < 30; index += 1) files[`src/file-${index}.ts`] = 'code\n';
			github.push('acme/monorepo', files);
		};

		it('reads a folder link in a repository larger than the limits of one folder', async () => {
			monorepo();
			const small = clientWithLimits({ maxEntries: 10 });
			const folder = await small.parseLocator(
				'https://github.com/acme/monorepo/tree/main/.agents/skills',
			);
			const repository = await small.parseLocator('https://github.com/acme/monorepo');

			const { items } = await small.discover(folder);

			expect(items).toEqual([{ path: '.agents/skills/pdf' }]);
			await expect(small.discover(repository)).rejects.toMatchObject({
				constructor: SkillSourceReadError,
				reason: 'archive_too_large',
				message: 'The repository is too large for n8n to read. Link to the folder of the skills.',
			});
		});

		it('keeps only the files under the folder, and caches each folder apart', async () => {
			monorepo();
			const folder = await client.parseLocator(
				'https://github.com/acme/monorepo/tree/main/.agents/skills',
			);
			const repository = await client.parseLocator('https://github.com/acme/monorepo');

			const fromFolder = await client.discover(folder);
			const fromRepository = await client.discover(repository);

			expect(fromFolder.items).toEqual([{ path: '.agents/skills/pdf' }]);
			expect(fromRepository.items).toEqual([{ path: '.agents/skills/pdf' }, { path: 'docs' }]);
			expect(github.requests.archives).toBe(2);
		});

		it('fails with archive_too_large when the download is over the size limit', async () => {
			monorepo();
			const small = clientWithLimits({ maxDownloadBytes: 100 });
			const locator = await small.parseLocator('https://github.com/acme/monorepo');

			await expect(small.discover(locator)).rejects.toMatchObject({
				reason: 'archive_too_large',
				message: 'The repository is too large for n8n to download.',
			});
		});

		it('fails with archive_too_large when an archive keeps too much text', async () => {
			github.push('acme/skills', { 'a/SKILL.md': skillMd('a'), 'b/SKILL.md': skillMd('b') });
			const small = clientWithLimits({ maxTextBytes: skillMd('a').length + 1 });
			const locator = await small.parseLocator('https://github.com/acme/skills');

			await expect(small.discover(locator)).rejects.toMatchObject({ reason: 'archive_too_large' });
		});

		it('counts the paths and text of a cached archive in the cache size', async () => {
			github.push('acme/skills', {
				'a/SKILL.md': skillMd('a'),
				'a/references/x.md': '# X\n',
				'a/scripts/run.sh': 'run\n',
			});
			const locator = await client.parseLocator('https://github.com/acme/skills');
			await client.discover(locator);

			const cache = client['archives'];
			const [archive] = await Promise.all([...cache.values()] as Array<Promise<RepositoryArchive>>);

			expect(cache.calculatedSize).toBe(archiveSize(archive));
			expect(cache.calculatedSize).toBeGreaterThan(skillMd('a').length);
		});
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

		it('reports a 403 with a spent rate limit as rate_limited', async () => {
			github.push('acme/skills', { 'a/SKILL.md': skillMd('a') });
			github.failWith = { status: 403, headers: { 'x-ratelimit-remaining': '0' } };

			await expect(client.parseLocator('https://github.com/acme/skills')).rejects.toMatchObject({
				constructor: SkillSourceReadError,
				reason: 'rate_limited',
			});
		});

		it.each([403, 451])('reports a %i as a repository n8n cannot read', async (status) => {
			github.push('acme/skills', { 'a/SKILL.md': skillMd('a') });
			github.failWith = status;

			await expect(client.parseLocator('https://github.com/acme/skills')).rejects.toThrow(
				SkillSourceNotFoundError,
			);
		});

		it('reports a failed archive download by its status', async () => {
			github.push('acme/skills', { 'a/SKILL.md': skillMd('a') });
			const locator = await client.parseLocator('https://github.com/acme/skills');
			github.failWith = { status: 403, headers: { 'x-ratelimit-remaining': '0' } };

			await expect(
				client.fetchLatest(locator, { path: 'a' }, undefined, 'f'.repeat(40)),
			).rejects.toMatchObject({
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

describe('retryAfterSeconds', () => {
	const now = 1_000_000_000_000;

	it.each([
		{ headers: { 'retry-after': '120' }, seconds: 120 },
		{ headers: { 'retry-after': '0' }, seconds: 0 },
		// The reset time of the spent limit, in epoch seconds.
		{ headers: { 'x-ratelimit-reset': String(now / 1000 + 300) }, seconds: 300 },
		{ headers: { 'x-ratelimit-reset': String(now / 1000 - 10) }, seconds: 0 },
		{
			headers: { 'retry-after': '60', 'x-ratelimit-reset': String(now / 1000 + 300) },
			seconds: 60,
		},
		{ headers: {}, seconds: undefined },
		{ headers: { 'retry-after': 'soon' }, seconds: undefined },
	])('reads $headers as $seconds', ({ headers, seconds }) => {
		expect(retryAfterSeconds(headers, now)).toBe(seconds);
	});
});
