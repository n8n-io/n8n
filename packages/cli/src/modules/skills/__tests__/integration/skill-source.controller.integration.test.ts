import {
	connectPublicSkillSourceSchema,
	SKILL_SYNC_FLAG,
	type SkillSourceConnectResponse,
	type SkillSourceDiscovery,
} from '@n8n/api-types';
import { PostHogClient } from '@n8n/backend-services';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { DataSource } from '@n8n/typeorm';
import nock from 'nock';
import type { MockInstance } from 'vitest';

import { createSkill, deleteAllSkills, findLatestSkillVersion, findSkill } from '../../testing';
import { SkillSourceConnection } from '../../database/entities/skill-source-connection.entity';
import { SkillSourceNotFoundError } from '../../errors/skill-source-not-found.error';
import { SkillSourceReadError } from '../../errors/skill-source-read.error';
import { SkillSourceBackoff } from '../../services/skill-source-backoff';
import { SkillSourceService } from '../../services/skill-source.service';
import { SkillSourceToolBudget } from '../../services/skill-source-tool-budget';
import { SkillsTelemetry } from '../../services/skills-telemetry.service';
import { GitHubSkillSourceClient } from '../../sources/github/github-skill-source-client';
import { SkillSourceClientRegistry } from '../../sources/skill-source-client-registry.service';
import type { RemoteSkillRef } from '../../sources/skill-source-client';
import { FakeGitHub } from '../test-utils/fake-github';
import { InMemoryPagesStore } from '../test-utils/in-memory-pages-store';
import { InMemorySkillSourceClient } from '../test-utils/in-memory-skill-source-client';
import { linkSkill } from '../test-utils/skill-source-fixtures';

import { createAdmin, createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import { setupTestServer } from '@test-integration/utils';

const REPO = 'https://github.com/acme/skills';

const skillMd = (name: string, description = `${name} description`, body = `Follow ${name}.`) =>
	`---\nname: ${name}\ndescription: ${description}\nlicense: MIT\n---\n\n${body}\n`;

const FILES = {
	'README.md': '# Skills\n',
	'skills/pdf/SKILL.md': skillMd('pdf'),
	'skills/pdf/references/pages.md': '# Pages\n',
	'skills/pdf/assets/form.pdf': '%PDF-1.4\n',
	'skills/docx/SKILL.md': skillMd('docx'),
	'skills/broken/SKILL.md': 'no frontmatter here\n',
};

beforeAll(async () => {
	await testModules.loadModules(['skills', 'agents']);
	nock.disableNetConnect();
	nock.enableNetConnect(/127\.0\.0\.1|localhost/);
});

afterAll(() => {
	nock.enableNetConnect();
});

describe('SkillSourceController', () => {
	const server = setupTestServer({ endpointGroups: ['ai'] });
	const postHog = mockInstance(PostHogClient);
	const github = new FakeGitHub();
	let ownerUser: User;
	let memberUser: User;
	let owner: SuperAgentTest;
	let admin: SuperAgentTest;
	let member: SuperAgentTest;
	let editor: SuperAgentTest;
	let viewer: SuperAgentTest;
	let team: Project;
	let otherTeam: Project;
	let personal: Project;
	let toolBudget: MockInstance<SkillSourceToolBudget['take']>;

	beforeAll(async () => {
		ownerUser = await createOwner();
		memberUser = await createMember();
		const editorUser = await createMember();
		const viewerUser = await createMember();
		owner = server.authAgentFor(ownerUser);
		admin = server.authAgentFor(await createAdmin());
		member = server.authAgentFor(memberUser);
		editor = server.authAgentFor(editorUser);
		viewer = server.authAgentFor(viewerUser);
		team = await createTeamProject('Marketing');
		otherTeam = await createTeamProject('Sales');
		personal = await getPersonalProject(memberUser);
		await linkUserToProject(editorUser, team, 'project:editor');
		await linkUserToProject(editorUser, otherTeam, 'project:editor');
		await linkUserToProject(viewerUser, team, 'project:viewer');
	});

	beforeEach(async () => {
		await deleteAllSkills();
		// Deleting a skill deletes its link. A source stays until it is deleted.
		await Container.get(DataSource).manager.delete(SkillSourceConnection, {});
		postHog.getFeatureFlags.mockResolvedValue({ [SKILL_SYNC_FLAG]: true });
		// The budget counts in memory for the whole file, so only its own tests let it count.
		toolBudget = vi.spyOn(Container.get(SkillSourceToolBudget), 'take').mockReturnValue();
		github.start();
		github.push('acme/skills', FILES);
	});

	afterEach(() => {
		toolBudget.mockRestore();
		github.stop();
	});

	/** The response body: `data` on success, `meta` with the reason code on a failure. */
	type Body<T> = { data: T; message?: string; meta?: { reason: string } };

	const discover = async (agent: SuperAgentTest, body: Record<string, unknown>, status = 200) =>
		(await agent.post('/skill-sources/discover').send(body).expect(status))
			.body as Body<SkillSourceDiscovery>;

	const connect = async (agent: SuperAgentTest, body: Record<string, unknown>, status = 200) =>
		(await agent.post('/skill-sources').send(body).expect(status))
			.body as Body<SkillSourceConnectResponse>;

	const keysOf = (discovery: SkillSourceDiscovery, names: string[]) =>
		discovery.skills.filter((skill) => names.includes(skill.name ?? '')).map((skill) => skill.key);

	const countSources = async () =>
		await Container.get(DataSource).manager.count(SkillSourceConnection);

	it('answers 404 when the Skill Sync flag is off for the user', async () => {
		postHog.getFeatureFlags.mockResolvedValue({});

		await discover(owner, { url: REPO, scope: 'instance' }, 404);
		await connect(owner, { url: REPO, scope: 'instance', skillKeys: ['x'] }, 404);
		// The flag is checked before the body, so an invalid body does not reveal the route.
		await discover(owner, {}, 404);
		await connect(owner, {}, 404);
	});

	describe('discover', () => {
		it('lists every skill with what the import keeps and leaves out', async () => {
			const { data } = await discover(owner, { url: REPO, scope: 'instance' });

			expect(data.source).toEqual({
				type: 'github',
				label: 'acme/skills',
				ref: 'main',
				path: '',
				webUrl: 'https://github.com/acme/skills/tree/main',
			});
			expect(data.duplicate).toEqual({ kind: 'none' });
			expect(data.truncated).toBe(false);
			expect(data.skills).toEqual([
				expect.objectContaining({
					location: 'skills/broken',
					name: null,
					error: { reason: 'parse_error', message: expect.any(String) },
				}),
				expect.objectContaining({ location: 'skills/docx', name: 'docx', error: null }),
				expect.objectContaining({
					location: 'skills/pdf',
					name: 'pdf',
					description: 'pdf description',
					skippedFiles: [],
					nameTaken: false,
					error: null,
					webUrl: 'https://github.com/acme/skills/tree/main/skills/pdf',
				}),
			]);
		});

		it('gives each skill the verdict and the findings of the security check', async () => {
			github.push('acme/checked', {
				'clean/SKILL.md': skillMd('clean'),
				'hidden/SKILL.md': skillMd('hidden', 'Hidden text', 'Follow\u200b this.'),
				'huge/SKILL.md': skillMd('huge', 'x'.repeat(2000)),
				'broken/SKILL.md': 'no frontmatter here\n',
			});

			const { data } = await discover(owner, {
				url: 'https://github.com/acme/checked',
				scope: 'instance',
			});

			const checkOf = (location: string) =>
				data.skills.find((skill) => skill.location === location)?.check;
			expect(checkOf('clean')).toEqual({ verdict: 'pass', findings: [] });
			expect(checkOf('hidden')).toEqual({
				verdict: 'needs_review',
				findings: [
					{
						rule: 'hidden_unicode',
						severity: 'needs_review',
						file: 'SKILL.md',
						detail: expect.any(String),
						// "Follow⟦U+200B⟧ this." is the first line of the instructions, after the
						// license line.
						location: { line: 7, start: 6, end: 14 },
					},
				],
			});
			const hidden = data.skills.find((skill) => skill.location === 'hidden');
			expect(hidden?.previewFiles).toEqual([
				{
					path: 'SKILL.md',
					text: '---\nname: hidden\ndescription: Hidden text\nlicense: "MIT"\n---\n\nFollow⟦U+200B⟧ this.',
				},
			]);
			expect(hidden?.previewTruncated).toBe(false);
			expect(checkOf('huge')).toEqual({
				verdict: 'blocked',
				findings: [
					{
						rule: 'over_limit',
						severity: 'blocked',
						file: 'SKILL.md',
						detail: expect.any(String),
						limit: { field: 'description', max: 1024, current: 2000 },
					},
				],
			});
			expect(checkOf('broken')).toEqual({
				verdict: 'blocked',
				findings: [
					{
						rule: 'invalid_skill',
						severity: 'blocked',
						file: 'SKILL.md',
						detail: expect.any(String),
					},
				],
			});
		});

		it('marks a skill whose name the scope already has', async () => {
			await createSkill({ projectId: team.id, content: { name: 'PDF' } });

			const { data } = await discover(editor, { url: REPO, scope: 'project', projectId: team.id });

			const pdf = data.skills.find((skill) => skill.name === 'pdf');
			expect(pdf?.nameTaken).toBe(true);
		});

		it.each([
			['not a link', 400, 'invalid_url'],
			['https://gitlab.com/acme/skills', 400, 'unsupported_provider'],
			['https://github.com/acme', 400, 'invalid_url'],
			['https://github.com/acme/private', 404, 'not_found'],
		])('refuses %s with %s %s', async (url, status, reason) => {
			const body = await discover(owner, { url, scope: 'instance' }, status);

			expect(body.meta).toEqual({ reason });
		});

		it('says so when the repository has no skills', async () => {
			github.push('acme/empty', { 'README.md': '# Nothing\n' });

			const body = await discover(
				owner,
				{ url: 'https://github.com/acme/empty', scope: 'instance' },
				422,
			);

			expect(body.meta).toEqual({ reason: 'no_skills_found' });
		});

		it('reports a GitHub rate limit', async () => {
			github.failWith = 429;

			const body = await discover(owner, { url: REPO, scope: 'instance' }, 429);

			expect(body.meta).toEqual({ reason: 'rate_limited' });
		});
	});

	describe('connect', () => {
		it('imports a skill from a folder link without downloading the repository archive', async () => {
			const url = `${REPO}/tree/main/skills/pdf`;
			const { data: discovery } = await discover(owner, { url, scope: 'instance' });
			expect(discovery.skills).toEqual([
				expect.objectContaining({ name: 'pdf', location: 'skills/pdf', error: null }),
			]);

			const { data } = await connect(owner, {
				url,
				scope: 'instance',
				skillKeys: keysOf(discovery, ['pdf']),
			});

			expect(data.failed).toEqual([]);
			expect(data.imported).toEqual([expect.objectContaining({ name: 'pdf' })]);
			expect(github.requests.archives).toBe(0);
		});

		it('refuses a skill whose name is only spaces as blocked by the security check', async () => {
			github.push('acme/blank', { '  /SKILL.md': '---\ndescription: Blank\n---\n\nBody.\n' });
			const url = 'https://github.com/acme/blank';
			const { data: discovery } = await discover(owner, { url, scope: 'instance' });

			const body = await connect(
				owner,
				{ url, scope: 'instance', skillKeys: discovery.skills.map((skill) => skill.key) },
				422,
			);

			expect(discovery.skills).toEqual([
				expect.objectContaining({
					error: null,
					check: expect.objectContaining({ verdict: 'blocked' }),
				}),
			]);
			expect(body.meta).toEqual({ reason: 'blocked_by_check' });
		});

		it('imports the picked skills as read-only synced skills of a new source', async () => {
			const { data: discovery } = await discover(owner, { url: REPO, scope: 'instance' });

			const { data } = await connect(owner, {
				url: REPO,
				scope: 'instance',
				skillKeys: keysOf(discovery, ['pdf']),
			});

			expect(data.failed).toEqual([]);
			expect(data.imported).toEqual([
				{ key: expect.any(String), skillId: expect.any(String), name: 'pdf' },
			]);
			const { skillId } = data.imported[0];
			expect(await findSkill(skillId)).toMatchObject({ source: 'github', projectId: null });
			expect(await findLatestSkillVersion(skillId)).toMatchObject({
				version: 1,
				frontmatter: { license: 'MIT' },
				sourceRevision: expect.stringMatching(/^[0-9a-f]{40}$/),
			});

			const { body: detail } = await owner.get(`/skills/${skillId}`).expect(200);
			expect(detail.data.canEdit).toBe(false);
			expect(detail.data.syncedFrom).toEqual({
				sourceId: data.sourceId,
				type: 'github',
				label: 'acme/skills',
				ref: 'main',
				webUrl: 'https://github.com/acme/skills/tree/main/skills/pdf',
				canStopSyncing: true,
			});
			expect(detail.data.skill.references).toEqual([
				{ path: 'assets/form.pdf', content: '%PDF-1.4\n' },
				{ path: 'references/pages.md', content: '# Pages\n' },
			]);

			// Only the source changes the content of a synced skill.
			await owner
				.patch(`/skills/${skillId}`)
				.send({ baseSkillHash: detail.data.skillHash, instructions: 'Changed in n8n.' })
				.expect(400);
		});

		it('imports the other skills when one name is taken, and reports it', async () => {
			await createSkill({ projectId: personal.id, content: { name: 'docx' } });
			const { data: discovery } = await discover(member, {
				url: REPO,
				scope: 'project',
				projectId: personal.id,
			});

			const { data } = await connect(member, {
				url: REPO,
				scope: 'project',
				projectId: personal.id,
				skillKeys: keysOf(discovery, ['pdf', 'docx']),
			});

			expect(data.imported.map((skill) => skill.name)).toEqual(['pdf']);
			expect(data.failed).toEqual([
				{ key: expect.any(String), name: 'docx', reason: 'name_taken' },
			]);
		});

		it('imports a large skill with its supporting files at their original paths', async () => {
			const importedFromSource = vi.spyOn(Container.get(SkillsTelemetry), 'importedFromSource');
			const documents = Array.from({ length: 45 }, (_, index) => ({
				path: `reference/degraded/note-${index}.md`,
				content: `# Note ${index}\n${'Guidance.\n'.repeat(1100)}`,
			}));
			github.push('acme/files', {
				'tools/SKILL.md': skillMd('tools', 'Tools', 'Read [Note 0](reference/degraded/note-0.md).'),
				...Object.fromEntries(documents.map(({ path, content }) => [`tools/${path}`, content])),
				'tools/scripts/run.py': 'print(1)\n',
				'tools/assets/logo.png': 'PNG\0data',
				'tools/assets/large.bin': 'x'.repeat(1024 * 1024 + 1),
				'tools/LICENSE': 'MIT\n',
			});
			const url = 'https://github.com/acme/files';
			const { data: discovery } = await discover(owner, { url, scope: 'instance' });
			expect(discovery.skills[0].skippedFiles).toEqual(['assets/large.bin']);
			expect(discovery.skills[0].check?.findings).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ rule: 'file_too_large', file: 'assets/large.bin' }),
					expect.objectContaining({ rule: 'script_file', file: 'scripts/run.py' }),
				]),
			);

			const { data } = await connect(owner, {
				url,
				scope: 'instance',
				skillKeys: keysOf(discovery, ['tools']),
				reviewedSkillKeys: keysOf(discovery, ['tools']),
			});
			const {
				body: { data: detail },
			} = await owner.get(`/skills/${data.imported[0].skillId}`).expect(200);
			expect(detail.skill.instructions).toBe('Read [Note 0](reference/degraded/note-0.md).');
			expect(detail.skill.references).toHaveLength(48);
			expect(detail.skill.references).toEqual(
				expect.arrayContaining([
					...documents,
					{ path: 'scripts/run.py', content: 'print(1)\n' },
					{
						path: 'assets/logo.png',
						content: Buffer.from('PNG\0data').toString('base64'),
						isBinary: true,
					},
					{ path: 'LICENSE', content: 'MIT\n' },
				]),
			);

			expect(importedFromSource).toHaveBeenCalledWith(
				expect.objectContaining({
					imported: 1,
					skipped_files: 1,
					skipped_script_files: 0,
					status: 'success',
				}),
				ownerUser.id,
			);
			importedFromSource.mockRestore();
		});

		it('leaves out a skill that the security check blocks, and imports the others', async () => {
			const importedFromSource = vi.spyOn(Container.get(SkillsTelemetry), 'importedFromSource');
			const bigFrontmatter = `metadata: ${'x'.repeat(17_000)}\n`;
			github.push('acme/checked', {
				'clean/SKILL.md': skillMd('clean'),
				'hidden/SKILL.md': skillMd('hidden', 'Hidden text', 'Follow\u200b this.'),
				'big/SKILL.md': `---\nname: big\ndescription: Big\n${bigFrontmatter}---\n\nBody.\n`,
			});
			const url = 'https://github.com/acme/checked';
			const { data: discovery } = await discover(owner, { url, scope: 'instance' });

			const { data } = await connect(owner, {
				url,
				scope: 'instance',
				skillKeys: keysOf(discovery, ['clean', 'hidden', 'big']),
				reviewedSkillKeys: keysOf(discovery, ['hidden']),
			});

			expect(importedFromSource).toHaveBeenCalledWith(
				expect.objectContaining({
					access: 'public',
					selected: 3,
					imported: 2,
					blocked: 1,
					needs_review: 1,
					status: 'success',
				}),
				ownerUser.id,
			);
			importedFromSource.mockRestore();
			expect(discovery.skills.find((skill) => skill.name === 'big')?.check?.verdict).toBe(
				'blocked',
			);
			expect(data.imported.map((skill) => skill.name).sort()).toEqual(['clean', 'hidden']);
			expect(data.failed).toEqual([
				{ key: expect.any(String), name: 'big', reason: 'blocked_by_check' },
			]);
		});

		it('reports a skill that n8n cannot read as blocked by the security check', async () => {
			const importedFromSource = vi.spyOn(Container.get(SkillsTelemetry), 'importedFromSource');
			github.push('acme/checked', {
				'clean/SKILL.md': skillMd('clean'),
				'broken/SKILL.md': 'no frontmatter here\n',
			});
			const url = 'https://github.com/acme/checked';
			const { data: discovery } = await discover(owner, { url, scope: 'instance' });

			const { data } = await connect(owner, {
				url,
				scope: 'instance',
				skillKeys: discovery.skills.map((skill) => skill.key),
			});

			expect(importedFromSource).toHaveBeenCalledWith(
				expect.objectContaining({ selected: 2, imported: 1, blocked: 1, status: 'success' }),
				ownerUser.id,
			);
			importedFromSource.mockRestore();
			expect(data.imported.map((skill) => skill.name)).toEqual(['clean']);
			expect(data.failed).toEqual([
				{ key: expect.any(String), name: null, reason: 'blocked_by_check' },
			]);
		});

		it('leaves out a skill that needs review when the user did not review the warnings', async () => {
			github.push('acme/checked', {
				'clean/SKILL.md': skillMd('clean'),
				'hidden/SKILL.md': skillMd('hidden', 'Hidden text', 'Follow\u200b this.'),
			});
			const url = 'https://github.com/acme/checked';
			const { data: discovery } = await discover(owner, { url, scope: 'instance' });

			const { data } = await connect(owner, {
				url,
				scope: 'instance',
				skillKeys: keysOf(discovery, ['clean', 'hidden']),
			});

			expect(data.imported.map((skill) => skill.name)).toEqual(['clean']);
			expect(data.failed).toEqual([
				{ key: expect.any(String), name: 'hidden', reason: 'review_required' },
			]);
		});

		it.each([false, true])(
			'imports a skill with a link warning only when reviewed (reviewed: %s)',
			async (reviewed) => {
				github.push('acme/checked', {
					'docs/SKILL.md': skillMd('docs', 'Documentation', 'Read https://docs.example.com.'),
					'collect/SKILL.md': skillMd(
						'collect',
						'Data collection',
						'See https://webhook.site/test.',
					),
				});
				const url = 'https://github.com/acme/checked';
				const { data: discovery } = await discover(owner, { url, scope: 'instance' });
				const [collectKey] = keysOf(discovery, ['collect']);
				expect(discovery.skills.find(({ key }) => key === collectKey)?.check).toMatchObject({
					verdict: 'needs_review',
					findings: [
						{
							rule: 'risky_url',
							severity: 'needs_review',
							domain: 'webhook.site',
							linkReason: 'webhook_catcher',
						},
					],
				});
				expect(discovery.skills.find(({ name }) => name === 'docs')?.check).toMatchObject({
					verdict: 'pass',
					findings: [{ rule: 'new_url', severity: 'info', domain: 'docs.example.com' }],
				});

				const { data } = await connect(owner, {
					url,
					scope: 'instance',
					skillKeys: keysOf(discovery, ['collect', 'docs']),
					reviewedSkillKeys: reviewed ? [collectKey] : [],
				});

				expect(data.imported.map(({ name }) => name).sort()).toEqual(
					reviewed ? ['collect', 'docs'] : ['docs'],
				);
				expect(data.failed).toEqual(
					reviewed ? [] : [{ key: collectKey, name: 'collect', reason: 'review_required' }],
				);
			},
		);

		it('checks each skill again at connect, after a new commit changed it', async () => {
			github.push('acme/checked', {
				'clean/SKILL.md': skillMd('clean'),
				'hidden/SKILL.md': skillMd('hidden'),
				'long/SKILL.md': skillMd('long'),
			});
			const url = 'https://github.com/acme/checked';
			const { data: discovery } = await discover(owner, { url, scope: 'instance' });
			expect(discovery.skills.map((skill) => skill.check?.verdict)).toEqual([
				'pass',
				'pass',
				'pass',
			]);
			github.push('acme/checked', {
				'clean/SKILL.md': skillMd('clean'),
				'hidden/SKILL.md': skillMd('hidden', 'Hidden text', 'Follow​ this.'),
				'long/SKILL.md': skillMd('long', 'x'.repeat(2000)),
			});

			const { data } = await connect(owner, {
				url,
				scope: 'instance',
				skillKeys: keysOf(discovery, ['clean', 'hidden', 'long']),
			});

			expect(data.imported.map((skill) => skill.name)).toEqual(['clean']);
			expect(data.failed).toEqual(
				expect.arrayContaining([
					{ key: keysOf(discovery, ['hidden'])[0], name: 'hidden', reason: 'review_required' },
					{ key: keysOf(discovery, ['long'])[0], name: 'long', reason: 'blocked_by_check' },
				]),
			);
			expect(data.failed).toHaveLength(2);
		});

		it('imports a skill that needs review only when the user reviewed the warnings of that skill', async () => {
			github.push('acme/checked', {
				'flagged/SKILL.md': skillMd('flagged', 'Hidden text', 'Follow​ this.'),
				'changed/SKILL.md': skillMd('changed'),
			});
			const url = 'https://github.com/acme/checked';
			const { data: discovery } = await discover(owner, { url, scope: 'instance' });
			github.push('acme/checked', {
				'flagged/SKILL.md': skillMd('flagged', 'Hidden text', 'Follow​ this.'),
				'changed/SKILL.md': skillMd('changed', 'Hidden text', 'Follow​ this.'),
			});

			const { data } = await connect(owner, {
				url,
				scope: 'instance',
				skillKeys: keysOf(discovery, ['flagged', 'changed']),
				reviewedSkillKeys: keysOf(discovery, ['flagged']),
			});

			expect(data.imported.map((skill) => skill.name)).toEqual(['flagged']);
			expect(data.failed).toEqual([
				{ key: keysOf(discovery, ['changed'])[0], name: 'changed', reason: 'review_required' },
			]);
		});

		it('stores nothing when every picked skill is blocked by the security check', async () => {
			github.push('acme/checked', {
				'big/SKILL.md': `---\nname: big\ndescription: Big\nmetadata: ${'x'.repeat(17_000)}\n---\n\nBody.\n`,
			});
			const url = 'https://github.com/acme/checked';
			const { data: discovery } = await discover(owner, { url, scope: 'instance' });

			const body = await connect(
				owner,
				{ url, scope: 'instance', skillKeys: discovery.skills.map((skill) => skill.key) },
				422,
			);

			expect(body.meta).toEqual({ reason: 'blocked_by_check' });
			expect(body.message).toBe('The security check blocked every picked skill.');
			expect(await countSources()).toBe(0);
		});

		it('names no single cause when the picked skills fail for different reasons', async () => {
			github.push('acme/checked', {
				'hidden/SKILL.md': skillMd('hidden', 'Hidden text', 'Follow\u200b this.'),
				'big/SKILL.md': `---\nname: big\ndescription: Big\nmetadata: ${'x'.repeat(17_000)}\n---\n\nBody.\n`,
			});
			const url = 'https://github.com/acme/checked';
			const { data: discovery } = await discover(owner, { url, scope: 'instance' });

			const body = await connect(
				owner,
				{ url, scope: 'instance', skillKeys: discovery.skills.map((skill) => skill.key) },
				422,
			);

			expect(body.message).toBe('n8n could not import any of the picked skills.');
			expect(await countSources()).toBe(0);
		});

		it('stores nothing when no picked skill can come in, and reports the failed import', async () => {
			const importedFromSource = vi.spyOn(Container.get(SkillsTelemetry), 'importedFromSource');
			await createSkill({ projectId: team.id, content: { name: 'pdf' } });
			const { data: discovery } = await discover(editor, {
				url: REPO,
				scope: 'project',
				projectId: team.id,
			});

			const body = await connect(
				editor,
				{ url: REPO, scope: 'project', projectId: team.id, skillKeys: keysOf(discovery, ['pdf']) },
				409,
			);

			expect(body.meta).toEqual({ reason: 'name_taken' });
			expect(importedFromSource).toHaveBeenCalledWith(
				expect.objectContaining({
					selected: 1,
					imported: 0,
					name_taken: 1,
					skipped_files: 0,
					skipped_file_extensions: {},
					skipped_script_files: 0,
					status: 'failure',
					reason: 'name_taken',
				}),
				expect.any(String),
			);
			importedFromSource.mockRestore();
			const { data: again } = await discover(editor, {
				url: REPO,
				scope: 'project',
				projectId: team.id,
			});
			expect(again.duplicate).toEqual({ kind: 'none' });
		});
	});

	describe('public source tools', () => {
		const target = { url: REPO, scope: 'instance' } as const;

		it('lists the verdicts without file contents and imports only selected passing skills', async () => {
			github.push('acme/skills', {
				...FILES,
				'skills/warning/SKILL.md': skillMd('warning', 'Warning', 'Follow\u200b this.'),
			});
			const service = Container.get(SkillSourceService);
			const telemetry = vi.spyOn(Container.get(SkillsTelemetry), 'importedFromSource');
			try {
				const preview = await service.discoverPublic(ownerUser, target, 'mcp');
				expect(preview.skills).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							name: 'docx',
							verdict: 'pass',
							webUrl: `${REPO}/tree/${preview.revision}/skills/docx`,
						}),
						expect.objectContaining({ name: 'warning', verdict: 'needs_review' }),
						expect.objectContaining({ name: null, verdict: 'blocked' }),
					]),
				);
				expect(preview.skills.every((skill) => !('previewFiles' in skill))).toBe(true);
				expect(await countSources()).toBe(0);

				const picked = preview.skills.filter(({ name }) => name !== 'pdf');
				const result = await service.connectPublic(
					ownerUser,
					connectPublicSkillSourceSchema.parse({
						...target,
						revision: preview.revision,
						skillKeys: picked.map(({ key }) => key),
					}),
					'mcp',
				);

				expect(result.imported.map(({ name }) => name)).toEqual(['docx']);
				expect(result.failed.map(({ reason }) => reason).sort()).toEqual([
					'blocked_by_check',
					'review_required',
				]);
				const { body } = await owner.get(`/skills/${result.imported[0].skillId}`).expect(200);
				expect(body.data).toMatchObject({ canEdit: false, sourceId: result.sourceId });
				expect(await service.list(ownerUser)).toMatchObject([
					{ id: result.sourceId, skillCount: 1 },
				]);
				expect(telemetry).toHaveBeenCalledWith(
					expect.objectContaining({ surface: 'mcp', imported: 1 }),
					ownerUser.id,
				);
			} finally {
				telemetry.mockRestore();
			}
		});

		it('leaves the source disconnected if its revision changed since discovery', async () => {
			const service = Container.get(SkillSourceService);
			const preview = await service.discoverPublic(ownerUser, target, 'assistant');
			github.push('acme/skills', { ...FILES, 'skills/docx/SKILL.md': skillMd('docx', 'New') });

			await expect(
				service.connectPublic(
					ownerUser,
					connectPublicSkillSourceSchema.parse({
						...target,
						revision: preview.revision,
						skillKeys: preview.skills.filter(({ name }) => name === 'docx').map(({ key }) => key),
					}),
					'assistant',
				),
			).rejects.toMatchObject({ reason: 'stale' });
			expect(await countSources()).toBe(0);
		});
	});

	// MCP and n8n Assistant have no route, so the service call is their only access check.
	describe('access of the public source tools', () => {
		const service = () => Container.get(SkillSourceService);
		const calls = (user: User, scope: { scope: 'instance' | 'project'; projectId?: string }) => {
			const selection = connectPublicSkillSourceSchema.parse({
				url: REPO,
				...scope,
				skillKeys: ['x'],
				revision: 'commit',
			});
			return [
				async () => await service().discoverPublic(user, { url: REPO, ...scope }, 'mcp'),
				async () => await service().checkPublicImport(user, selection, 'assistant'),
				async () => await service().connectPublic(user, selection, 'mcp'),
			];
		};
		let viewerUser: User;

		beforeAll(async () => {
			viewerUser = await createMember();
			await linkUserToProject(viewerUser, team, 'project:viewer');
		});

		it.each([
			['a member in Global', () => memberUser, () => ({ scope: 'instance' as const })],
			[
				'a viewer in the project',
				() => viewerUser,
				() => ({ scope: 'project' as const, projectId: team.id }),
			],
			[
				'a member in a project that is not theirs',
				() => memberUser,
				() => ({ scope: 'project' as const, projectId: team.id }),
			],
		])('refuses %s', async (_name, user, scope) => {
			for (const call of calls(user(), scope())) {
				await expect(call()).rejects.toBeInstanceOf(ForbiddenError);
			}
			expect(await countSources()).toBe(0);
		});

		it('answers not found for a project that does not exist', async () => {
			for (const call of calls(ownerUser, { scope: 'project', projectId: 'no-such-project' })) {
				await expect(call()).rejects.toBeInstanceOf(NotFoundError);
			}
			expect(await countSources()).toBe(0);
		});

		it('answers not found when the Skill Sync flag is off for the user', async () => {
			postHog.getFeatureFlags.mockResolvedValue({});

			for (const call of calls(ownerUser, { scope: 'instance' })) {
				await expect(call()).rejects.toBeInstanceOf(NotFoundError);
			}
			await expect(service().list(ownerUser)).rejects.toBeInstanceOf(NotFoundError);
			expect(await countSources()).toBe(0);
		});

		it('lets a project editor preview and import into the project', async () => {
			const editorUser = await createMember();
			await linkUserToProject(editorUser, team, 'project:editor');
			const scope = { scope: 'project' as const, projectId: team.id };

			const preview = await service().discoverPublic(editorUser, { url: REPO, ...scope }, 'mcp');
			const result = await service().connectPublic(
				editorUser,
				connectPublicSkillSourceSchema.parse({
					url: REPO,
					...scope,
					revision: preview.revision,
					skillKeys: preview.skills.filter(({ name }) => name === 'docx').map(({ key }) => key),
				}),
				'mcp',
			);

			expect(result.imported.map(({ name }) => name)).toEqual(['docx']);
			expect(await findSkill(result.imported[0].skillId)).toMatchObject({ projectId: team.id });
		});
	});

	describe('a source type without revisions in the public source tools', () => {
		const pages = new InMemoryPagesStore();

		beforeAll(() => {
			Container.get(SkillSourceClientRegistry).register(new InMemorySkillSourceClient(pages));
		});

		it('checks an import with the null revision of the preview, and does not call it stale', async () => {
			const url = pages.publishDatabase([
				{
					name: 'brand-voice',
					description: 'Write in our voice',
					instructions: 'Use short sentences.',
					frontmatter: null,
					files: [],
				},
			]);
			const service = Container.get(SkillSourceService);
			const target = { url, scope: 'instance' } as const;

			const preview = await service.discoverPublic(ownerUser, target, 'mcp');
			expect(preview.revision).toBeNull();
			const selection = connectPublicSkillSourceSchema.parse({
				...target,
				revision: preview.revision,
				skillKeys: preview.skills.map(({ key }) => key),
			});

			await expect(
				service.checkPublicImport(ownerUser, selection, 'assistant'),
			).resolves.toMatchObject({ importable: [{ name: 'brand-voice' }], failed: [] });
			await expect(
				service.checkPublicImport(ownerUser, { ...selection, revision: 'commit' }, 'assistant'),
			).rejects.toMatchObject({ reason: 'stale' });
		});
	});

	describe('the request budget of the public source tools', () => {
		const target = { url: REPO, scope: 'instance' } as const;

		it('refuses the requests of a user over the budget, and reports each as a failed connect', async () => {
			toolBudget.mockRestore();
			const service = Container.get(SkillSourceService);
			const adminUser = await createAdmin();
			const connectedSource = vi.spyOn(Container.get(SkillsTelemetry), 'connectedSource');
			let preview = await service.discoverPublic(adminUser, target, 'mcp');
			for (let request = 1; request < 15; request++) {
				preview = await service.discoverPublic(adminUser, target, 'mcp');
			}
			const selection = connectPublicSkillSourceSchema.parse({
				...target,
				revision: preview.revision,
				skillKeys: preview.skills.filter(({ name }) => name === 'docx').map(({ key }) => key),
			});

			await expect(service.discoverPublic(adminUser, target, 'mcp')).rejects.toMatchObject({
				reason: 'rate_limited',
			});
			await expect(
				service.checkPublicImport(adminUser, selection, 'assistant'),
			).rejects.toMatchObject({ reason: 'rate_limited' });
			await expect(service.connectPublic(adminUser, selection, 'mcp')).rejects.toMatchObject({
				reason: 'rate_limited',
			});

			expect(await countSources()).toBe(0);
			expect(connectedSource).toHaveBeenCalledTimes(3);
			expect(connectedSource).toHaveBeenCalledWith(
				expect.objectContaining({ surface: 'mcp', status: 'failure', reason: 'rate_limited' }),
				adminUser.id,
			);
			connectedSource.mockRestore();
			// The connect dialog has a person behind each request, so the budget leaves it alone.
			await discover(server.authAgentFor(adminUser), target);
			// Another user has a budget of their own.
			await expect(service.discoverPublic(ownerUser, target, 'mcp')).resolves.toBeDefined();
		});
	});

	describe('a rate limit wait of the public access', () => {
		const target = { url: REPO, scope: 'instance' } as const;
		const waits = () =>
			Reflect.get(Container.get(SkillSourceBackoff), 'waits') as Map<
				string,
				{ until: number; attempts: number }
			>;

		afterEach(() => waits().clear());

		it('refuses the public source tools with no read of the source, and leaves the connect dialog alone', async () => {
			const service = Container.get(SkillSourceService);
			const preview = await service.discoverPublic(ownerUser, target, 'mcp');
			const selection = connectPublicSkillSourceSchema.parse({
				...target,
				revision: preview.revision,
				skillKeys: preview.skills.filter(({ name }) => name === 'docx').map(({ key }) => key),
			});
			const connectedSource = vi.spyOn(Container.get(SkillsTelemetry), 'connectedSource');
			const parseLocator = vi.spyOn(Container.get(GitHubSkillSourceClient), 'parseLocator');
			waits().set('public:github', { until: Date.now() + 3_600_000, attempts: 1 });

			await expect(service.discoverPublic(ownerUser, target, 'mcp')).rejects.toMatchObject({
				reason: 'rate_limited',
			});
			await expect(
				service.checkPublicImport(ownerUser, selection, 'assistant'),
			).rejects.toMatchObject({ reason: 'rate_limited' });
			await expect(service.connectPublic(ownerUser, selection, 'mcp')).rejects.toMatchObject({
				reason: 'rate_limited',
			});

			expect(parseLocator).not.toHaveBeenCalled();
			expect(await countSources()).toBe(0);
			expect(connectedSource).toHaveBeenCalledTimes(3);
			expect(connectedSource).toHaveBeenCalledWith(
				expect.objectContaining({ surface: 'mcp', status: 'failure', reason: 'rate_limited' }),
				ownerUser.id,
			);
			connectedSource.mockRestore();
			// A person in the connect dialog still reads the source.
			await discover(owner, target);
			expect(parseLocator).toHaveBeenCalledTimes(1);
			parseLocator.mockRestore();

			// The wait is over: the tools read the source again.
			waits().set('public:github', { until: Date.now() - 1, attempts: 1 });
			await expect(service.discoverPublic(ownerUser, target, 'mcp')).resolves.toBeDefined();
		});
	});

	describe('the import check of the public source tools', () => {
		const target = { url: REPO, scope: 'instance' } as const;
		const service = () => Container.get(SkillSourceService);
		let connectedSource: MockInstance<SkillsTelemetry['connectedSource']>;
		let flaggedSkill: MockInstance<SkillsTelemetry['flaggedSkill']>;

		beforeEach(() => {
			github.push('acme/skills', {
				...FILES,
				'skills/warning/SKILL.md': skillMd('warning', 'Warning', 'Follow\u200b this.'),
			});
			connectedSource = vi.spyOn(Container.get(SkillsTelemetry), 'connectedSource');
			flaggedSkill = vi.spyOn(Container.get(SkillsTelemetry), 'flaggedSkill');
		});

		afterEach(() => {
			connectedSource.mockRestore();
			flaggedSkill.mockRestore();
		});

		const previewed = async () => {
			const preview = await service().discoverPublic(ownerUser, target, 'assistant');
			connectedSource.mockClear();
			flaggedSkill.mockClear();
			const keyOf = (location: string) =>
				preview.skills.find((skill) => skill.location.endsWith(location))?.key ?? '';
			const check = async (skillKeys: string[], revision = preview.revision) =>
				await service().checkPublicImport(
					ownerUser,
					connectPublicSkillSourceSchema.parse({ ...target, revision, skillKeys }),
					'assistant',
				);
			return { keyOf, check };
		};

		it('splits a mixed selection as the import does, and stores and reports nothing', async () => {
			await createSkill({ projectId: null, content: { name: 'pdf' } });
			const { keyOf, check } = await previewed();

			const result = await check([
				keyOf('docx'),
				keyOf('pdf'),
				keyOf('warning'),
				keyOf('broken'),
				'no-such-key',
			]);

			expect(result.source).toMatchObject({ type: 'github', label: 'acme/skills' });
			expect(result.importable).toEqual([{ key: keyOf('docx'), name: 'docx' }]);
			expect(result.failed.map(({ reason }) => reason).sort()).toEqual([
				'blocked_by_check',
				'name_taken',
				'not_found',
				'review_required',
			]);
			expect(await countSources()).toBe(0);
			expect(connectedSource).not.toHaveBeenCalled();
			// The preview reported the flagged skills. The check must not count them again.
			expect(flaggedSkill).not.toHaveBeenCalled();
		});

		it('names two selected skills with the same name as the import names them', async () => {
			github.push('acme/twins', {
				'one/SKILL.md': skillMd('twin', 'The first'),
				'two/SKILL.md': skillMd('twin', 'The second'),
			});
			const twins = { url: 'https://github.com/acme/twins', scope: 'instance' } as const;
			const preview = await service().discoverPublic(ownerUser, twins, 'assistant');
			const selection = connectPublicSkillSourceSchema.parse({
				...twins,
				revision: preview.revision,
				skillKeys: preview.skills.map(({ key }) => key),
			});

			const checked = await service().checkPublicImport(ownerUser, selection, 'assistant');
			const imported = await service().connectPublic(ownerUser, selection, 'assistant');

			expect(checked.importable.map(({ name }) => name)).toEqual(['twin', 'twin 2']);
			expect(imported.imported.map(({ key, name }) => ({ key, name }))).toEqual(checked.importable);
		});

		it('gives the same split as the import of the same selection', async () => {
			const { keyOf, check } = await previewed();
			const skillKeys = [keyOf('docx'), keyOf('warning'), keyOf('broken')];

			const checked = await check(skillKeys);
			const imported = await service().connectPublic(
				ownerUser,
				connectPublicSkillSourceSchema.parse({
					...target,
					revision: (await service().discoverPublic(ownerUser, target, 'assistant')).revision,
					skillKeys,
				}),
				'assistant',
			);

			expect(imported.imported.map(({ key }) => key)).toEqual(
				checked.importable.map(({ key }) => key),
			);
			expect(imported.failed).toEqual(checked.failed);
		});

		it.each([
			['a skill that needs review', 'warning', 'review_required'],
			['a skill that the security check blocks', 'broken', 'blocked_by_check'],
			['a key that the source does not hold', 'no-such-skill', 'not_found'],
		])('refuses a selection of only %s', async (_name, location, reason) => {
			const { keyOf, check } = await previewed();

			await expect(check([keyOf(location) || location])).rejects.toMatchObject({ reason });

			expect(connectedSource).toHaveBeenCalledWith(
				expect.objectContaining({ surface: 'assistant', status: 'failure', reason }),
				ownerUser.id,
			);
		});

		it('refuses a selection of only a skill whose name is taken', async () => {
			await createSkill({ projectId: null, content: { name: 'docx' } });
			const { keyOf, check } = await previewed();

			await expect(check([keyOf('docx')])).rejects.toMatchObject({ reason: 'name_taken' });
		});

		it('refuses another revision than the previewed one', async () => {
			const { keyOf, check } = await previewed();
			github.push('acme/skills', { ...FILES, 'skills/docx/SKILL.md': skillMd('docx', 'New') });

			await expect(check([keyOf('docx')])).rejects.toMatchObject({ reason: 'stale' });

			expect(connectedSource).toHaveBeenCalledWith(
				expect.objectContaining({ surface: 'assistant', status: 'failure', reason: 'stale' }),
				ownerUser.id,
			);
		});

		it('refuses a source that the scope already has', async () => {
			const { keyOf, check } = await previewed();
			await service().connectPublic(
				ownerUser,
				connectPublicSkillSourceSchema.parse({
					...target,
					revision: (await service().discoverPublic(ownerUser, target, 'assistant')).revision,
					skillKeys: [keyOf('pdf')],
				}),
				'assistant',
			);
			connectedSource.mockClear();

			await expect(check([keyOf('docx')])).rejects.toMatchObject({
				reason: 'duplicate_source',
			});

			expect(connectedSource).toHaveBeenCalledWith(
				expect.objectContaining({
					surface: 'assistant',
					status: 'failure',
					reason: 'duplicate_source',
					duplicate_result: 'blocked',
				}),
				ownerUser.id,
			);
		});
	});

	describe('limits of the listing', () => {
		const client = () => Container.get(GitHubSkillSourceClient);

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('fails as too deep when the source has skills only below the depth limit', async () => {
			vi.spyOn(client(), 'discover').mockResolvedValue({
				items: [],
				truncated: false,
				tooDeep: 2,
				revision: 'a'.repeat(40),
			});

			const body = await discover(owner, { url: REPO, scope: 'instance' }, 422);

			expect(body.meta).toEqual({ reason: 'too_deep' });
		});

		it('lists the skills it can reach and says how many were too deep', async () => {
			const original = client().discover.bind(client());
			vi.spyOn(client(), 'discover').mockImplementation(async (locator) => ({
				...(await original(locator)),
				tooDeep: 1,
			}));

			const { data } = await discover(owner, { url: REPO, scope: 'instance' });

			expect(data.tooDeep).toBe(1);
			expect(data.skills).toHaveLength(3);
		});
	});

	describe('partial imports', () => {
		it('flags a picked skill that the source removed after discover, and imports the rest', async () => {
			const { data: discovery } = await discover(owner, { url: REPO, scope: 'instance' });
			const { 'skills/docx/SKILL.md': _removed, ...rest } = FILES;
			github.push('acme/skills', rest);

			const { data } = await connect(owner, {
				url: REPO,
				scope: 'instance',
				skillKeys: keysOf(discovery, ['pdf', 'docx']),
			});

			expect(data.imported.map((skill) => skill.name)).toEqual(['pdf']);
			expect(data.failed).toEqual([
				{ key: keysOf(discovery, ['docx'])[0], name: null, reason: 'not_found' },
			]);
		});

		it('answers 404 and stores nothing when every picked skill is gone', async () => {
			const { data: discovery } = await discover(owner, { url: REPO, scope: 'instance' });
			github.push('acme/skills', { 'skills/xlsx/SKILL.md': skillMd('xlsx') });

			const body = await connect(
				owner,
				{ url: REPO, scope: 'instance', skillKeys: keysOf(discovery, ['pdf', 'docx']) },
				404,
			);

			expect(body.meta).toEqual({ reason: 'not_found' });
			expect(await countSources()).toBe(0);
		});

		it('preserves binary file bytes but requires SKILL.md to be text', async () => {
			github.push('acme/binary', {
				'binary/SKILL.md': skillMd('binary'),
				'binary/references/data.md': 'PNG\0data',
				'binary/references/notes.md': '# Notes\n',
				'broken/SKILL.md': skillMd('broken', 'Broken', 'Use\0 this.'),
			});
			const url = 'https://github.com/acme/binary';
			const { data: discovery } = await discover(owner, { url, scope: 'instance' });

			const binary = discovery.skills.find((skill) => skill.location === 'binary');
			expect(binary?.skippedFiles).toEqual([]);
			expect(binary?.previewFiles).toContainEqual({
				path: 'references/data.md',
				text: '',
				isBinary: true,
			});
			// The check cannot read a binary file, and this one has a Markdown name.
			expect(binary?.check).toEqual({
				verdict: 'needs_review',
				findings: [
					expect.objectContaining({
						rule: 'binary_file',
						severity: 'needs_review',
						file: 'references/data.md',
					}),
				],
			});
			const broken = discovery.skills.find((skill) => skill.location === 'broken');
			expect(broken?.check).toEqual({
				verdict: 'blocked',
				findings: [
					expect.objectContaining({
						rule: 'invalid_skill',
						detail: 'SKILL.md has a NUL character, which n8n cannot store.',
					}),
				],
			});

			const { data } = await connect(owner, {
				url,
				scope: 'instance',
				skillKeys: discovery.skills.map((skill) => skill.key),
				reviewedSkillKeys: binary ? [binary.key] : [],
			});

			expect(data.imported).toEqual([expect.objectContaining({ name: 'binary' })]);
			expect(data.failed).toEqual([{ key: broken?.key, name: null, reason: 'blocked_by_check' }]);
			const { body: detail } = await owner.get(`/skills/${data.imported[0].skillId}`).expect(200);
			expect(detail.data.skill.references).toEqual([
				{
					path: 'references/data.md',
					content: Buffer.from('PNG\0data').toString('base64'),
					isBinary: true,
				},
				{ path: 'references/notes.md', content: '# Notes\n' },
			]);
		});

		it('imports two picked skills with the same name, and numbers the second', async () => {
			github.push('acme/twins', {
				'one/SKILL.md': skillMd('twin', 'The first'),
				'two/SKILL.md': skillMd('twin', 'The second'),
			});
			const url = 'https://github.com/acme/twins';
			const { data: discovery } = await discover(owner, { url, scope: 'instance' });

			const { data } = await connect(owner, {
				url,
				scope: 'instance',
				skillKeys: discovery.skills.map((skill) => skill.key),
			});

			expect(data.imported.map((skill) => skill.name)).toEqual(['twin', 'twin 2']);
			expect(data.failed).toEqual([]);
			const { body: detail } = await owner.get(`/skills/${data.imported[1].skillId}`).expect(200);
			expect(detail.data.skill.name).toBe('twin 2');
		});
	});

	describe('a fetch that fails during connect', () => {
		const client = () => Container.get(GitHubSkillSourceClient);

		/** Makes the fetch of the `docx` skill throw, and lets the other fetches through. */
		const failDocxWith = (error: Error) => {
			const original = client().fetchLatest.bind(client());
			vi.spyOn(client(), 'fetchLatest').mockImplementation(
				async (locator, ref: RemoteSkillRef, auth, revision) => {
					if (ref.path === 'skills/docx') throw error;
					return await original(locator, ref, auth, revision);
				},
			);
		};

		const connectPdfAndDocx = async (status: number) => {
			const { data: discovery } = await discover(owner, { url: REPO, scope: 'instance' });
			failDocxWith(errorToThrow);
			return await connect(
				owner,
				{ url: REPO, scope: 'instance', skillKeys: keysOf(discovery, ['pdf', 'docx']) },
				status,
			);
		};

		let errorToThrow: Error;

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('fails the whole request on a rate limit, and stores nothing', async () => {
			errorToThrow = new SkillSourceReadError('rate_limited', 'GitHub rate limit.');

			const body = await connectPdfAndDocx(429);

			expect(body.meta).toEqual({ reason: 'rate_limited' });
			expect(await countSources()).toBe(0);
		});

		it('flags only the skill that is gone', async () => {
			errorToThrow = new SkillSourceNotFoundError('The skill is gone.');

			const { data } = await connectPdfAndDocx(200);

			expect(data.imported.map((skill) => skill.name)).toEqual(['pdf']);
			expect(data.failed).toEqual([{ key: expect.any(String), name: null, reason: 'not_found' }]);
		});

		it('answers 500 for an error with no reason, and stores nothing', async () => {
			errorToThrow = new Error('A bug.');

			await connectPdfAndDocx(500);

			expect(await countSources()).toBe(0);
		});
	});

	describe('telemetry', () => {
		let connectedSource: MockInstance<SkillsTelemetry['connectedSource']>;
		let created: MockInstance<SkillsTelemetry['created']>;

		beforeEach(() => {
			connectedSource = vi.spyOn(Container.get(SkillsTelemetry), 'connectedSource');
			created = vi.spyOn(Container.get(SkillsTelemetry), 'created');
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		const connectPdf = async (
			agent: SuperAgentTest,
			scope: Record<string, unknown>,
			status = 200,
		) => {
			const { data: discovery } = await discover(agent, { url: REPO, ...scope });
			return await connect(
				agent,
				{ url: REPO, ...scope, skillKeys: keysOf(discovery, ['pdf']) },
				status,
			);
		};

		it('reports a successful connect in Global and the skills it created', async () => {
			const { data } = await connectPdf(owner, { scope: 'instance' });

			expect(connectedSource.mock.calls).toEqual([
				[
					{
						provider: 'github',
						access: 'public',
						scope_type: 'global',
						duplicate_result: 'none',
						status: 'success',
					},
					ownerUser.id,
				],
			]);
			expect(created).toHaveBeenCalledWith(
				ownerUser.id,
				[{ id: data.imported[0].skillId, projectId: null }],
				'github',
				'sync',
				{ source_provider: 'github', source_access: 'public' },
			);
		});

		it('reports a connect in a personal project', async () => {
			await connectPdf(member, { scope: 'project', projectId: personal.id });

			expect(connectedSource).toHaveBeenCalledWith(
				expect.objectContaining({ scope_type: 'personal', status: 'success' }),
				memberUser.id,
			);
			expect(created).toHaveBeenCalledWith(
				memberUser.id,
				[expect.objectContaining({ projectId: personal.id })],
				'github',
				'sync',
				{ source_provider: 'github', source_access: 'public' },
			);
		});

		it('reports a project source that Global blocks, at discover and at connect', async () => {
			await connectPdf(owner, { scope: 'instance' });
			connectedSource.mockClear();
			created.mockClear();

			await discover(editor, { url: REPO, scope: 'project', projectId: team.id });
			await connect(
				editor,
				{ url: REPO, scope: 'project', projectId: team.id, skillKeys: ['x'] },
				409,
			);

			const blocked = {
				provider: 'github',
				access: 'public',
				scope_type: 'team',
				duplicate_result: 'blocked',
				status: 'failure',
				reason: 'duplicate_source',
			};
			expect(connectedSource.mock.calls).toEqual([
				[blocked, expect.any(String)],
				[blocked, expect.any(String)],
			]);
			expect(created).not.toHaveBeenCalled();
		});

		it.each([
			['https://gitlab.com/acme/skills', 400, 'unsupported_provider'],
			['not a link', 400, 'invalid_url'],
			['https://github.com/acme/private', 404, 'not_found'],
		])('reports a discover of %s as a failed connect', async (url, status, reason) => {
			await discover(owner, { url, scope: 'instance' }, status);

			expect(connectedSource.mock.calls).toEqual([
				[
					{
						provider: 'github',
						access: 'public',
						scope_type: 'global',
						duplicate_result: 'none',
						status: 'failure',
						reason,
					},
					ownerUser.id,
				],
			]);
		});

		it.each([
			[
				'no skills',
				() => {
					github.push('acme/skills', { 'README.md': '# Nothing\n' });
				},
				422,
				'no_skills_found',
			],
			[
				'a rate limit',
				() => {
					github.failWith = 429;
				},
				429,
				'rate_limited',
			],
			[
				'a failure of GitHub',
				() => {
					github.failWith = 502;
				},
				503,
				'unreachable',
			],
		])(
			'reports a discover that finds %s as a failed connect',
			async (_name, setUp, status, reason) => {
				setUp();

				await discover(owner, { url: REPO, scope: 'instance' }, status);

				expect(connectedSource).toHaveBeenCalledTimes(1);
				expect(connectedSource).toHaveBeenCalledWith(
					expect.objectContaining({ status: 'failure', reason }),
					ownerUser.id,
				);
			},
		);

		it('reports an error with no reason as unexpected', async () => {
			vi.spyOn(Container.get(GitHubSkillSourceClient), 'discover').mockRejectedValue(
				new Error('A bug.'),
			);

			await discover(owner, { url: REPO, scope: 'instance' }, 500);

			expect(connectedSource).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'failure', reason: 'unexpected' }),
				ownerUser.id,
			);
		});

		it('reports nothing for a discover that succeeds', async () => {
			await discover(owner, { url: REPO, scope: 'instance' });

			expect(connectedSource).not.toHaveBeenCalled();
		});

		it('reports each skill that the security check flags at discover, with its rule codes', async () => {
			const flaggedSkill = vi.spyOn(Container.get(SkillsTelemetry), 'flaggedSkill');
			github.push('acme/checked', {
				'clean/SKILL.md': skillMd('clean'),
				'hidden/SKILL.md': skillMd('hidden', 'Hidden text', 'Follow\u200b this.\u202e'),
				'broken/SKILL.md': 'no frontmatter here\n',
			});

			await discover(owner, { url: 'https://github.com/acme/checked', scope: 'instance' });

			expect(flaggedSkill.mock.calls).toEqual(
				expect.arrayContaining([
					[
						{
							provider: 'github',
							stage: 'import',
							verdict: 'blocked',
							rule_codes: ['invalid_skill'],
						},
						ownerUser.id,
					],
					[
						{
							provider: 'github',
							stage: 'import',
							verdict: 'needs_review',
							rule_codes: ['hidden_unicode'],
						},
						ownerUser.id,
					],
				]),
			);
			expect(flaggedSkill).toHaveBeenCalledTimes(2);
		});

		it('reports no flagged skill for a picker that does not show its verdict', async () => {
			const flaggedSkill = vi.spyOn(Container.get(SkillsTelemetry), 'flaggedSkill');
			github.push('acme/checked', {
				'pdf/SKILL.md': skillMd('pdf', 'Hidden text', 'Follow\u200b this.'),
			});
			const url = 'https://github.com/acme/checked';
			await connectPdf(owner, { scope: 'instance' });
			flaggedSkill.mockClear();

			// The name of the flagged skill is taken, so its row shows "Name taken".
			await discover(owner, { url, scope: 'instance' });
			// Global has the source, so the picker does not open.
			github.push('acme/skills', {
				...FILES,
				'skills/hidden/SKILL.md': skillMd('hidden', 'Hidden text', 'Follow\u200b this.'),
			});
			await discover(editor, { url: REPO, scope: 'project', projectId: team.id });

			expect(flaggedSkill).not.toHaveBeenCalled();
			flaggedSkill.mockRestore();
		});

		it.each([
			[{ truncated: true }, 'too_many_skills'],
			[{ tooDeep: 3 }, 'too_deep'],
		])(
			'reports a connect from a source that listed only part of its skills (%o)',
			async (extra, reason) => {
				const client = Container.get(GitHubSkillSourceClient);
				const original = client.discover.bind(client);
				vi.spyOn(client, 'discover').mockImplementation(async (locator) => ({
					...(await original(locator)),
					...extra,
				}));

				await connectPdf(owner, { scope: 'instance' });

				expect(connectedSource).toHaveBeenCalledWith(
					expect.objectContaining({ status: 'success', reason }),
					ownerUser.id,
				);
			},
		);
	});

	describe('duplicate rules', () => {
		const connectPdf = async (agent: SuperAgentTest, scope: Record<string, unknown>) => {
			const { data: discovery } = await discover(agent, { url: REPO, ...scope });
			return await connect(agent, { url: REPO, ...scope, skillKeys: keysOf(discovery, ['pdf']) });
		};

		it('blocks a second source in Global, and gives an admin the ID of the first', async () => {
			const { data: first } = await connectPdf(owner, { scope: 'instance' });

			const { data } = await discover(admin, { url: `${REPO}.git`, scope: 'instance' });
			const body = await connect(admin, { url: REPO, scope: 'instance', skillKeys: ['x'] }, 409);

			expect(data.duplicate).toEqual({
				kind: 'blocked',
				where: 'global',
				sourceId: first.sourceId,
			});
			expect(body.meta).toEqual({ reason: 'duplicate_source' });
		});

		it('blocks a project source when Global has the repository, without the source for a member', async () => {
			await connectPdf(owner, { scope: 'instance' });

			const { data } = await discover(editor, { url: REPO, scope: 'project', projectId: team.id });

			expect(data.duplicate).toEqual({ kind: 'blocked', where: 'global', sourceId: null });
		});

		it('blocks a second source in the same project', async () => {
			const { data: first } = await connectPdf(editor, { scope: 'project', projectId: team.id });

			const { data } = await discover(editor, { url: REPO, scope: 'project', projectId: team.id });

			expect(data.duplicate).toEqual({ kind: 'blocked', where: 'scope', sourceId: first.sourceId });
		});

		it('warns about a source in another project that the user can see', async () => {
			await connectPdf(editor, { scope: 'project', projectId: otherTeam.id });

			const { data } = await discover(editor, { url: REPO, scope: 'project', projectId: team.id });
			await connectPdf(editor, { scope: 'project', projectId: team.id });

			expect(data.duplicate).toEqual({
				kind: 'warning',
				projects: [{ id: otherTeam.id, name: 'Sales' }],
			});
		});

		it('says nothing about a source in a project that the user cannot see', async () => {
			await connectPdf(editor, { scope: 'project', projectId: otherTeam.id });

			const { data } = await discover(member, {
				url: REPO,
				scope: 'project',
				projectId: personal.id,
			});

			expect(data.duplicate).toEqual({ kind: 'none' });
		});
	});

	describe('stop syncing', () => {
		const importPdf = async (agent: SuperAgentTest, scope: Record<string, unknown>) => {
			const { data: discovery } = await discover(agent, { url: REPO, ...scope });
			const { data } = await connect(agent, {
				url: REPO,
				...scope,
				skillKeys: keysOf(discovery, ['pdf']),
			});
			return data.imported[0].skillId;
		};

		const stop = async (agent: SuperAgentTest, skillId: string, status = 200) =>
			await agent.post(`/skill-sources/skills/${skillId}/stop-syncing`).send().expect(status);

		it('turns a synced skill into a normal skill that keeps its versions', async () => {
			const skillId = await importPdf(editor, { scope: 'project', projectId: team.id });
			const { body: before } = await editor.get(`/skills/${skillId}`).expect(200);
			expect(before.data).toMatchObject({ canEdit: false, canStopSyncing: true });
			expect(before.data.syncedFrom).toMatchObject({ canStopSyncing: true });

			await stop(editor, skillId);

			const { body: after } = await editor.get(`/skills/${skillId}`).expect(200);
			expect(after.data).toMatchObject({ source: 'github', canEdit: true, syncedFrom: null });
			expect(after.data.latestVersion).toBe(before.data.latestVersion);
			const { body: saved } = await editor
				.patch(`/skills/${skillId}`)
				.send({ baseSkillHash: after.data.skillHash, instructions: 'Changed in n8n.' })
				.expect(200);
			expect(saved.data).toMatchObject({ created: true, version: 2 });
			const { body: list } = await editor.get('/skills').expect(200);
			expect(list.data.data.find((skill: { id: string }) => skill.id === skillId)).toMatchObject({
				canEdit: true,
				canStopSyncing: false,
			});
		});

		it('lets the skill move on its own once it stopped syncing', async () => {
			const skillId = await importPdf(owner, { scope: 'project', projectId: team.id });
			const { body } = await owner.get(`/skills/${skillId}`).expect(200);
			const move = { scope: 'instance', baseSkillHash: body.data.skillHash };

			await owner.patch(`/skills/${skillId}`).send(move).expect(400);
			await stop(owner, skillId);
			await owner.patch(`/skills/${skillId}`).send(move).expect(200);

			const { body: moved } = await owner.get(`/skills/${skillId}`).expect(200);
			expect(moved.data).toMatchObject({ scope: 'instance', projectId: null });
		});

		it('tracks one event for each stop, with whether an update waited', async () => {
			const stoppedSync = vi.spyOn(Container.get(SkillsTelemetry), 'stoppedSync');
			const skillId = await importPdf(editor, { scope: 'project', projectId: team.id });
			const { id: pending } = await createSkill({
				projectId: team.id,
				content: { name: 'pending' },
			});
			await linkSkill(
				pending,
				{ projectId: team.id, createdById: ownerUser.id },
				{ pendingContentHash: 'hash-of-update' },
			);

			await stop(editor, skillId);
			await stop(editor, skillId, 404);
			await stop(viewer, pending, 403);
			await stop(editor, pending);

			expect(stoppedSync.mock.calls).toEqual([
				[{ provider: 'github', had_pending_update: false }, expect.any(String)],
				[{ provider: 'github', had_pending_update: true }, expect.any(String)],
			]);
			stoppedSync.mockRestore();
		});

		it('needs the global update permission for a Global synced skill', async () => {
			const skillId = await importPdf(owner, { scope: 'instance' });

			const { body: list } = await member.get('/skills').expect(200);
			expect(list.data.data.find((skill: { id: string }) => skill.id === skillId)).toMatchObject({
				canStopSyncing: false,
			});
			await stop(member, skillId, 403);
			await stop(owner, skillId);

			const { body } = await owner.get(`/skills/${skillId}`).expect(200);
			expect(body.data).toMatchObject({ scope: 'instance', canEdit: true, syncedFrom: null });
		});

		it('answers 404 for a skill that is not synced, also after a stop', async () => {
			const skillId = await importPdf(editor, { scope: 'project', projectId: team.id });
			const { id: plain } = await createSkill({ projectId: team.id, content: { name: 'plain' } });

			await stop(editor, skillId);
			await stop(editor, skillId, 404);
			await stop(editor, plain, 404);
		});

		it('refuses a viewer, hides the skill from an outsider, and answers 404 with the flag off', async () => {
			const skillId = await importPdf(editor, { scope: 'project', projectId: team.id });

			const { body } = await viewer.get(`/skills/${skillId}`).expect(200);
			expect(body.data.syncedFrom).toMatchObject({ canStopSyncing: false });
			await stop(viewer, skillId, 403);
			await stop(member, skillId, 404);
			postHog.getFeatureFlags.mockResolvedValue({});
			await stop(editor, skillId, 404);
			// With the flag off, no surface offers an action that the route refuses.
			const { body: detail } = await editor.get(`/skills/${skillId}`).expect(200);
			const { body: list } = await editor.get('/skills').expect(200);
			expect(detail.data.syncedFrom).toMatchObject({ canStopSyncing: false });
			expect(list.data.data.find((skill: { id: string }) => skill.id === skillId)).toMatchObject({
				canStopSyncing: false,
			});
		});
	});

	describe('permissions', () => {
		it.each([
			['a member in Global', () => member, () => ({ scope: 'instance' })],
			['a viewer in the project', () => viewer, () => ({ scope: 'project', projectId: team.id })],
			[
				'a member in a project that is not theirs',
				() => member,
				() => ({ scope: 'project', projectId: team.id }),
			],
		])('refuses %s', async (_name, agent, scope) => {
			await discover(agent(), { url: REPO, ...scope() }, 403);
			await connect(agent(), { url: REPO, ...scope(), skillKeys: ['x'] }, 403);
		});

		it('answers 404 for a project that does not exist', async () => {
			await discover(owner, { url: REPO, scope: 'project', projectId: 'no-such-project' }, 404);
		});
	});
});
