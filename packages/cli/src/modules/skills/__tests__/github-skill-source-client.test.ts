import { OutboundHttp } from '@n8n/backend-network';
import {
	AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
	AGENT_SKILL_REFERENCES_TOTAL_MAX_LENGTH,
} from '@n8n/api-types';
import { Container } from '@n8n/di';
import { sha256 } from '@n8n/utils/sha256';
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

function filesOf(skills: SkillContent[]): Record<string, string | Buffer> {
	const files: Record<string, string | Buffer> = { 'README.md': '# Skills\n' };
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

	describe('commit details', () => {
		it.each([undefined, tokenAuth])(
			'reads the stored revision with optional access %j',
			async (auth) => {
				github.push('acme/review', { 'docx/SKILL.md': skillMd('docx') });
				const locator = await client.parseLocator('https://github.com/acme/review');
				const revision = 'a'.repeat(40);
				const request = nock('https://api.github.com', {
					reqheaders: auth ? { authorization: `Bearer ${TOKEN}` } : undefined,
				})
					.get(`/repos/acme/review/git/commits/${revision}`)
					.reply(200, {
						message: 'Update document instructions',
						author: { name: 'Alex', date: '2026-11-11T10:00:00Z' },
					});

				expect(await client.describeRevision(locator, revision, auth)).toEqual({
					message: 'Update document instructions',
					author: 'Alex',
					date: '2026-11-11T10:00:00Z',
				});
				expect(client.revisionUrl(locator, revision)).toBe(
					`https://github.com/acme/review/commit/${revision}`,
				);
				expect(client.webUrl(locator, { path: 'docx' }, revision)).toBe(
					`https://github.com/acme/review/tree/${revision}/docx`,
				);
				expect(request.isDone()).toBe(true);
			},
		);

		it('keeps missing commit fields empty', async () => {
			github.push('acme/review', { 'docx/SKILL.md': skillMd('docx') });
			const locator = await client.parseLocator('https://github.com/acme/review');
			nock('https://api.github.com')
				.get('/repos/acme/review/git/commits/abc')
				.reply(200, { author: null });

			expect(await client.describeRevision(locator, 'abc')).toEqual({
				message: null,
				author: null,
				date: null,
			});
		});
	});

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

		it.each(['', '/tree/main/pdf'])(
			'keeps private content separate for each token (%s)',
			async (suffix) => {
				const locator = await client.parseLocator(
					`https://github.com/acme/private${suffix}`,
					tokenAuth,
				);
				const { items, revision } = await client.discover(locator, tokenAuth);
				const fetched = await client.fetchLatest(locator, items[0], tokenAuth, revision);
				expect(fetched.content.name).toBe('pdf');
				github.grant('ghp_other', []);
				const other = { token: 'ghp_other', credentialType: 'githubApi' };

				await expect(client.fetchLatest(locator, items[0], other, revision)).rejects.toThrow(
					SkillSourceNotFoundError,
				);
			},
		);

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
				case: 'a connected OAuth2 account',
				credential: { type: 'githubOAuth2Api', data: { oauthTokenData: { access_token: 't' } } },
				ok: true,
			},
			{
				case: 'an OAuth2 account that is not connected yet',
				credential: { type: 'githubOAuth2Api', data: {} },
				ok: false,
			},
			{
				case: 'OAuth2 for another GitHub server',
				credential: {
					type: 'githubOAuth2Api',
					data: {
						server: 'https://git.acme.dev/api/v3',
						oauthTokenData: { access_token: 't' },
					},
				},
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
				label: 'acme/skills / skills/pdf',
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

		it('gives folder and file links the same identity across branches', async () => {
			const folder = await client.parseLocator(
				'https://github.com/acme/skills/tree/main/skills/pdf',
			);
			const file = await client.parseLocator(
				'https://github.com/acme/skills/blob/main/skills/pdf/SKILL.md',
			);
			const branch = await client.parseLocator(
				'https://github.com/acme/skills/tree/feature/new-pdf/skills/pdf',
			);
			expect(client.identity(folder)).toMatchObject({ path: 'skills/pdf' });
			expect(client.identity(file)).toEqual(client.identity(folder));
			expect(client.identity(branch)).toEqual(client.identity(folder));
		});

		it('refuses a link to a tag, a commit or a missing branch', async () => {
			await expect(
				client.parseLocator('https://github.com/acme/skills/tree/v1.0.0/skills'),
			).rejects.toMatchObject({
				constructor: SkillSourceUrlError,
				message: 'n8n cannot find this branch. Use a link to a branch, not to a tag or a commit.',
			});
		});

		it.each(['nope', 'skills/pdf/SKILL.md'])(
			'fails with SkillSourceNotFoundError when %s is not a folder',
			async (path) => {
				const locator = await client.parseLocator(
					`https://github.com/acme/skills/tree/main/${path}`,
				);

				await expect(client.discover(locator)).rejects.toThrow(SkillSourceNotFoundError);
			},
		);

		it('keeps references and scripts at their original paths', async () => {
			const locator = await client.parseLocator('https://github.com/acme/skills');
			const fetched = await client.fetchLatest(locator, { path: 'skills/pdf' });

			expect(fetched.content.files).toEqual([
				{ path: 'references/pages.md', content: '# Pages\n' },
				{ path: 'scripts/split.py', content: 'print(1)\n' },
			]);
			expect(fetched.skippedFiles).toEqual([]);
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

	it.each(['', '/tree/main/pdf'])(
		'checks text and binary size separately for link suffix %j',
		async (suffix) => {
			const guide = '字'.repeat(AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH);
			github.push('acme/skills', {
				'pdf/SKILL.md': skillMd('pdf'),
				'pdf/reference/guide.md': guide,
				'pdf/reference/too-long.md': 'é'.repeat(AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH + 1),
				'pdf/assets/too-large.bin': Buffer.alloc(1024 * 1024 + 1, 255),
				'pdf/assets/example.bin': Buffer.from([0, 255]),
			});
			const locator = await client.parseLocator(`https://github.com/acme/skills${suffix}`);

			const fetched = await client.fetchLatest(locator, { path: 'pdf' });

			expect(fetched.content.files).toEqual([
				{ path: 'assets/example.bin', content: 'AP8=', isBinary: true },
				{ path: 'reference/guide.md', content: guide },
			]);
			expect(fetched.oversizedFiles?.toSorted()).toEqual([
				'assets/too-large.bin',
				'reference/too-long.md',
			]);
		},
	);

	describe('a skill over the limits of one skill', () => {
		it('keeps the files in references before the files of a dependency folder', async () => {
			const files: Record<string, string> = {
				'big/SKILL.md': skillMd('big'),
				'big/references/api.md': '# API\n',
				'big/scripts/run.py': 'print(1)\n',
			};
			for (let index = 0; index < 500; index += 1) {
				files[`big/node_modules/pkg/${String(index).padStart(3, '0')}.js`] = 'x';
			}
			github.push('acme/skills', files);
			const locator = await client.parseLocator('https://github.com/acme/skills');

			const fetched = await client.fetchLatest(locator, { path: 'big' });

			const kept = fetched.content.files.map((file) => file.path);
			expect(kept).toHaveLength(AGENT_SKILL_REFERENCE_MAX_COUNT);
			expect(kept).toEqual(expect.arrayContaining(['references/api.md', 'scripts/run.py']));
			expect(fetched.overLimitFiles).toEqual([
				'node_modules/pkg/498.js',
				'node_modules/pkg/499.js',
			]);
		});

		it('keeps the first 500 files in path order and lists the rest', async () => {
			const files: Record<string, string> = { 'big/SKILL.md': skillMd('big') };
			for (let index = 0; index < 501; index += 1) {
				files[`big/reference/${String(index).padStart(3, '0')}.md`] = 'x';
			}
			github.push('acme/skills', files);
			const locator = await client.parseLocator('https://github.com/acme/skills');

			const fetched = await client.fetchLatest(locator, { path: 'big' });

			expect(fetched.content.files).toHaveLength(AGENT_SKILL_REFERENCE_MAX_COUNT);
			expect(fetched.overLimitFiles).toEqual(['reference/500.md']);
			expect(fetched.skippedFiles).toEqual(['reference/500.md']);
		});

		it('keeps the files that fit the total size and lists the rest', async () => {
			const third = 'x'.repeat(AGENT_SKILL_REFERENCES_TOTAL_MAX_LENGTH / 2 - 10);
			github.push('acme/skills', {
				'big/SKILL.md': skillMd('big'),
				'big/assets/a.txt': third,
				'big/assets/b.txt': third,
				'big/assets/c.txt': third,
				'big/reference/small.md': 'Small.',
			});
			const locator = await client.parseLocator('https://github.com/acme/skills');

			const fetched = await client.fetchLatest(locator, { path: 'big' });

			// The third large file does not fit. A small file after it still does.
			expect(fetched.content.files.map((file) => file.path)).toEqual([
				'assets/a.txt',
				'assets/b.txt',
				'reference/small.md',
			]);
			expect(fetched.overLimitFiles).toEqual(['assets/c.txt']);
			expect(fetched.oversizedFiles).toEqual([]);
		});

		it('reads a SKILL.md at the repository root with the folders below it, nested skills included', async () => {
			github.push('acme/one-skill', {
				'SKILL.md': skillMd('root'),
				'README.md': '# Root\n',
				'examples/nested/SKILL.md': skillMd('nested'),
				'examples/nested/guide.md': 'Guide.\n',
			});
			const locator = await client.parseLocator('https://github.com/acme/one-skill');

			const { items } = await client.discover(locator);
			const fetched = await client.fetchLatest(locator, items[0]);

			expect(items).toEqual([{ path: '' }]);
			expect(fetched.content.files.map((file) => file.path)).toEqual([
				'README.md',
				'examples/nested/SKILL.md',
				'examples/nested/guide.md',
			]);
			expect(fetched.skippedFiles).toEqual([]);
		});
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

	describe('folder reads', () => {
		it('counts only files owned by discovered skills toward the download budget', async () => {
			const instructions = skillMd('pdf');
			const guide = 'A nested guide';
			const small = clientWithLimits({ maxRetainedBytes: instructions.length + guide.length });
			github.push('acme/skills', {
				'skills/pdf/SKILL.md': instructions,
				'skills/pdf/vendor/guide.txt': guide,
				'skills/vendor/pkg/SKILL.md': skillMd('pkg'),
				'skills/1/2/3/4/5/6/7/8/9/SKILL.md': skillMd('deep'),
			});
			const locator = await small.parseLocator('https://github.com/acme/skills/tree/main/skills');

			const { items, revision, tooDeep } = await small.discover(locator);
			const fetched = await small.fetchLatest(locator, items[0], undefined, revision);

			expect(items).toEqual([{ path: 'skills/pdf' }]);
			expect(tooDeep).toBe(1);
			expect(fetched.content.files).toEqual([{ path: 'vendor/guide.txt', content: guide }]);
			expect(github.requests.files).toBe(2);
		});

		it('fetches only the files that one skill can keep, and lists the others', async () => {
			const files: Record<string, string> = {
				'skills/pdf/SKILL.md': skillMd('pdf'),
				'skills/pdf/references/api.md': '# API\n',
			};
			for (let index = 0; index < 600; index += 1) {
				files[`skills/pdf/node_modules/pkg/${String(index).padStart(3, '0')}.js`] = 'x';
			}
			github.push('acme/skills', files);
			const locator = await client.parseLocator('https://github.com/acme/skills/tree/main/skills');

			const { items, revision } = await client.discover(locator);
			const fetched = await client.fetchLatest(locator, items[0], undefined, revision);

			// SKILL.md and 500 files, not the 602 files of the folder.
			expect(github.requests.files).toBe(AGENT_SKILL_REFERENCE_MAX_COUNT + 1);
			expect(fetched.content.files).toHaveLength(AGENT_SKILL_REFERENCE_MAX_COUNT);
			expect(fetched.content.files.map((file) => file.path)).toContain('references/api.md');
			expect(fetched.overLimitFiles).toHaveLength(101);
		});

		it('fetches at most the skill file limit when a folder holds too many Markdown references', async () => {
			const files: Record<string, string> = {
				'skills/pdf/SKILL.md': skillMd('pdf'),
			};
			for (let index = 0; index < 520; index += 1) {
				files[`skills/pdf/references/${String(index).padStart(3, '0')}.md`] = '# Ref\n';
			}
			github.push('acme/skills', files);
			const locator = await client.parseLocator('https://github.com/acme/skills/tree/main/skills');

			const { items, revision } = await client.discover(locator);
			const fetched = await client.fetchLatest(locator, items[0], undefined, revision);

			expect(github.requests.files).toBe(AGENT_SKILL_REFERENCE_MAX_COUNT + 1);
			expect(fetched.content.files).toHaveLength(AGENT_SKILL_REFERENCE_MAX_COUNT);
			expect(fetched.overLimitFiles).toHaveLength(20);
		});

		it('fetches a known skill path outside the discovery depth on demand', async () => {
			const path = 'skills/1/2/3/4/5/6/7/8/9';
			github.push('acme/skills', { [`${path}/SKILL.md`]: skillMd('linked') });
			const locator = await client.parseLocator('https://github.com/acme/skills/tree/main/skills');
			const { items, revision } = await client.discover(locator);
			expect(items).toEqual([]);
			expect(github.requests.files).toBe(0);

			const fetched = await client.fetchLatest(locator, { path }, undefined, revision);

			expect(fetched.content.name).toBe('linked');
		});

		it('re-reads a later skill folder alone when earlier skills exhaust the shared archive budget', async () => {
			const asset = 'x'.repeat(200);
			const small = clientWithLimits({ maxRetainedBytes: 360 });
			github.push('acme/skills', {
				'skills/a/SKILL.md': skillMd('a'),
				'skills/a/assets/a.txt': asset,
				'skills/b/SKILL.md': skillMd('b'),
				'skills/b/assets/b.txt': asset,
			});
			const locator = await small.parseLocator('https://github.com/acme/skills/tree/main/skills');

			const { items, revision } = await small.discover(locator);
			expect(items).toEqual([{ path: 'skills/a' }, { path: 'skills/b' }]);

			const fetchedA = await small.fetchLatest(locator, { path: 'skills/a' }, undefined, revision);
			const fetchedB = await small.fetchLatest(locator, { path: 'skills/b' }, undefined, revision);

			expect(fetchedA.content.files).toEqual([{ path: 'assets/a.txt', content: asset }]);
			expect(fetchedB.content.files).toEqual([{ path: 'assets/b.txt', content: asset }]);
			expect(fetchedB.overLimitFiles).toEqual([]);
		});

		it('re-reads a starved skill folder alone when a repository archive overflows the shared budget', async () => {
			const asset = 'x'.repeat(200);
			const small = clientWithLimits({ maxRetainedBytes: 360 });
			github.push('acme/skills', {
				'a/SKILL.md': skillMd('a'),
				'a/assets/a.txt': asset,
				'b/SKILL.md': skillMd('b'),
				'b/assets/b.txt': asset,
			});
			const locator = await small.parseLocator('https://github.com/acme/skills');

			const { items, revision } = await small.discover(locator);
			expect(items).toEqual([{ path: 'a' }, { path: 'b' }]);

			const fetchedA = await small.fetchLatest(locator, { path: 'a' }, undefined, revision);
			const fetchedB = await small.fetchLatest(locator, { path: 'b' }, undefined, revision);

			expect(fetchedA.content.files).toEqual([{ path: 'assets/a.txt', content: asset }]);
			expect(fetchedB.content.files).toEqual([{ path: 'assets/b.txt', content: asset }]);
			expect(fetchedB.overLimitFiles).toEqual([]);
		});

		it('reads only the linked folder at the selected commit when the repository archive is too large', async () => {
			const files = {
				'.agents/skill set/pdf/SKILL.md': skillMd('pdf'),
				'.agents/skill set/pdf/assets/form.pdf': '%PDF\0data',
				'.agents/skill set/pdf/references/page #1.md': '# Page\n',
				'.agents/skill set/pdf/references/large.md': 'x'.repeat(201),
				'.agents/skill set/pdf/scripts/split.py': 'print(1)\n',
				'.agents/skill set-other/SKILL.md': skillMd('other'),
				'src/large.txt': 'unrelated\n'.repeat(1024),
			};
			const original = github.push('acme/monorepo', files);
			const limits = {
				maxDownloadBytes: 100,
				maxUncompressedBytes: 500,
				maxFileBytes: 200,
			};
			const small = clientWithLimits(limits);
			const folder = await small.parseLocator(
				'https://github.com/acme/monorepo/tree/main/.agents/skill%20set',
			);

			const { items, revision } = await small.discover(folder);
			github.push('acme/monorepo', {
				...files,
				'.agents/skill set/pdf/SKILL.md': skillMd('pdf', 'Changed.'),
			});
			const fetched = await small.fetchLatest(folder, items[0], undefined, revision);

			expect(items).toEqual([{ path: '.agents/skill set/pdf' }]);
			expect(fetched.revision).toBe(original);
			expect(fetched.content.instructions).toBe('Follow pdf.');
			expect(fetched.content.files).toEqual([
				{
					path: 'assets/form.pdf',
					content: Buffer.from('%PDF\0data').toString('base64'),
					isBinary: true,
				},
				{ path: 'references/page #1.md', content: '# Page\n' },
				{ path: 'scripts/split.py', content: 'print(1)\n' },
			]);
			expect(fetched.skippedFiles).toEqual(['references/large.md']);
			expect(github.requests).toEqual({ refs: 2, archives: 0, trees: 3, files: 4 });

			// A cold cache must also read the selected revision, even after the branch changes.
			const fresh = clientWithLimits(limits);
			expect(await fresh.fetchLatest(folder, items[0], undefined, revision)).toEqual(fetched);
			expect(github.requests).toEqual({ refs: 2, archives: 0, trees: 6, files: 8 });
		});

		it.each([false, true])('hashes an oversized SKILL.md (private: %s)', async (privately) => {
			const content = 'é'.repeat(101);
			github.push('acme/skills', { 'pdf/SKILL.md': content }, 'main', { private: privately });
			if (privately) github.grant(TOKEN, ['acme/skills']);
			const auth = privately ? tokenAuth : undefined;
			const small = clientWithLimits({ maxFileBytes: 200, maxRetainedBytes: 200 });
			const locator = await small.parseLocator(
				'https://github.com/acme/skills/tree/main/pdf',
				auth,
			);

			await expect(small.fetchLatest(locator, { path: 'pdf' }, auth)).rejects.toMatchObject({
				constructor: SkillParseError,
				contentHash: await sha256(content),
			});
			expect(github.requests).toEqual({ refs: 2, archives: 0, trees: 2, files: 1 });
		});

		it.each([{ maxEntries: 1 }, { maxUncompressedBytes: 1 }, { maxRetainedBytes: 1 }])(
			'rejects a folder over its limit (%j) before reading files',
			async (limits) => {
				github.push('acme/skills', { 'pdf/SKILL.md': skillMd('pdf'), 'pdf/README.md': 'Read me' });
				const small = clientWithLimits(limits);
				const locator = await small.parseLocator('https://github.com/acme/skills/tree/main/pdf');

				await expect(small.discover(locator)).rejects.toMatchObject({
					reason: 'archive_too_large',
				});
				expect(github.requests.files).toBe(0);
			},
		);

		it('reports a truncated tree instead of importing an incomplete folder', async () => {
			github.push('acme/skills', { 'pdf/SKILL.md': skillMd('pdf') });
			github.truncateTree = true;
			const locator = await client.parseLocator('https://github.com/acme/skills/tree/main/pdf');

			await expect(client.discover(locator)).rejects.toMatchObject({ reason: 'archive_too_large' });
			expect(github.requests.files).toBe(0);
		});

		it('reports a rate limit from the GitHub tree API', async () => {
			const revision = github.push('acme/skills', { 'pdf/SKILL.md': skillMd('pdf') });
			const locator = await client.parseLocator('https://github.com/acme/skills/tree/main/pdf');
			github.failWith = { status: 403, headers: { 'retry-after': '120' } };

			await expect(client.discover(locator, undefined, undefined, revision)).rejects.toMatchObject({
				reason: 'rate_limited',
				retryAfterSeconds: 120,
			});
		});
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

		it('caches folder reads separately from repository archives', async () => {
			monorepo();
			const folder = await client.parseLocator(
				'https://github.com/acme/monorepo/tree/main/.agents/skills',
			);
			const repository = await client.parseLocator('https://github.com/acme/monorepo');

			const fromFolder = await client.discover(folder);
			const fromRepository = await client.discover(repository);

			expect(fromFolder.items).toEqual([{ path: '.agents/skills/pdf' }]);
			expect(fromRepository.items).toEqual([{ path: '.agents/skills/pdf' }, { path: 'docs' }]);
			expect(github.requests.archives).toBe(1);
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

		it('fails with archive_too_large when an archive keeps too many file bytes', async () => {
			github.push('acme/skills', { 'a/SKILL.md': skillMd('a'), 'b/SKILL.md': skillMd('b') });
			const small = clientWithLimits({ maxRetainedBytes: skillMd('a').length + 1 });
			const locator = await small.parseLocator('https://github.com/acme/skills');

			await expect(small.discover(locator)).rejects.toMatchObject({ reason: 'archive_too_large' });
		});

		it('imports from a repository link when the files outside the skills are over the budget', async () => {
			const reference = '# Forms\n';
			const files: Record<string, string> = {
				'.claude/skills/pdf/SKILL.md': skillMd('pdf'),
				'.claude/skills/pdf/reference/forms.md': reference,
			};
			for (let index = 0; index < 30; index += 1) files[`data/file-${index}.csv`] = 'a,b\n';
			github.push('acme/monorepo', files);
			// Room for the skill, but not for the data files of the repository.
			const small = clientWithLimits({
				maxRetainedBytes: skillMd('pdf').length + reference.length + 10,
			});
			const locator = await small.parseLocator('https://github.com/acme/monorepo');

			const { items } = await small.discover(locator);
			const fetched = await small.fetchLatest(locator, items[0]);

			expect(items).toEqual([{ path: '.claude/skills/pdf' }]);
			expect(fetched.content.files).toEqual([{ path: 'reference/forms.md', content: reference }]);
			// One read for the paths, and one that keeps the files of the skills.
			expect(github.requests.archives).toBe(2);
			expect(github.requests.trees).toBe(0);
		});

		it('imports a skill at the repository root that is over the budget, and lists the files it leaves out', async () => {
			const reference = '# API\n';
			const files: Record<string, string> = {
				'SKILL.md': skillMd('root'),
				'references/api.md': reference,
			};
			for (let index = 0; index < 30; index += 1) files[`src/file-${index}.ts`] = 'x'.repeat(10);
			github.push('acme/one-skill', files);
			// Room for SKILL.md, the reference and two source files.
			const small = clientWithLimits({
				maxRetainedBytes: skillMd('root').length + reference.length + 25,
			});
			const locator = await small.parseLocator('https://github.com/acme/one-skill');

			const { items } = await small.discover(locator);
			const fetched = await small.fetchLatest(locator, items[0]);

			expect(items).toEqual([{ path: '' }]);
			expect(fetched.content.files.map((file) => file.path)).toEqual([
				'references/api.md',
				'src/file-0.ts',
				'src/file-1.ts',
			]);
			expect(fetched.overLimitFiles).toHaveLength(28);
			expect(fetched.skippedFiles).toEqual(fetched.overLimitFiles);
			expect(github.requests.archives).toBe(2);
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
