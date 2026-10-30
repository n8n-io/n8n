import {
	SKILL_SYNC_FLAG,
	type SkillSourceConnectResponse,
	type SkillSourceDiscovery,
	type SkillSourceMoreDiscovery,
	type SkillSourceListItem,
} from '@n8n/api-types';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import nock from 'nock';
import type { MockInstance } from 'vitest';

import { createSkill, deleteAllSkills, findLatestSkillVersion, findSkill } from '../../testing';
import { SkillSourceConnection } from '../../database/entities/skill-source-connection.entity';
import { SkillSourceNotFoundError } from '../../errors/skill-source-not-found.error';
import { SkillSourceReadError } from '../../errors/skill-source-read.error';
import { SkillsTelemetry } from '../../services/skills-telemetry.service';
import { GitHubSkillSourceClient } from '../../sources/github/github-skill-source-client';
import type { RemoteSkillRef } from '../../sources/skill-source-client';
import { FakeGitHub } from '../test-utils/fake-github';
import { linkSkill } from '../test-utils/skill-source-fixtures';
import { PostHogClient } from '@/posthog';

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
	'skills/pdf/scripts/split.py': 'print(1)\n',
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
		github.start();
		github.push('acme/skills', FILES);
	});

	afterEach(() => {
		github.stop();
	});

	/** The response body: `data` on success, `meta` with the reason code on a failure. */
	type Body<T> = { data: T; meta?: { reason: string } };

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
					error: expect.objectContaining({ reason: 'parse_error' }),
				}),
				expect.objectContaining({ location: 'skills/docx', name: 'docx', error: null }),
				expect.objectContaining({
					location: 'skills/pdf',
					name: 'pdf',
					description: 'pdf description',
					skippedFiles: ['scripts/split.py'],
					nameTaken: false,
					error: null,
					webUrl: 'https://github.com/acme/skills/tree/main/skills/pdf',
				}),
			]);
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
		it('refuses a skill whose name is only spaces as a parse error', async () => {
			github.push('acme/blank', { '  /SKILL.md': '---\ndescription: Blank\n---\n\nBody.\n' });
			const url = 'https://github.com/acme/blank';
			const { data: discovery } = await discover(owner, { url, scope: 'instance' });

			const body = await connect(
				owner,
				{ url, scope: 'instance', skillKeys: discovery.skills.map((skill) => skill.key) },
				400,
			);

			expect(discovery.skills).toEqual([
				expect.objectContaining({ error: expect.objectContaining({ reason: 'parse_error' }) }),
			]);
			expect(body.meta).toEqual({ reason: 'parse_error' });
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
				webUrl: 'https://github.com/acme/skills/tree/main/skills/pdf',
				canStopSyncing: true,
			});
			expect(detail.data.skill.references).toEqual([
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

	describe('add more skills', () => {
		const more = async (agent: SuperAgentTest, id: string, status = 200) =>
			(await agent.post(`/skill-sources/${id}/discover`).send().expect(status))
				.body as Body<SkillSourceMoreDiscovery>;
		const add = async (agent: SuperAgentTest, id: string, skillKeys: string[], status = 200) =>
			(await agent.post(`/skill-sources/${id}/skills`).send({ skillKeys }).expect(status))
				.body as Body<SkillSourceConnectResponse>;
		async function connectOne(agent: SuperAgentTest, scope: Record<string, unknown>, url = REPO) {
			const { data } = await discover(agent, { url, ...scope });
			return (await connect(agent, { url, ...scope, skillKeys: keysOf(data, ['pdf']) })).data;
		}

		it.each(['global', 'team', 'personal'])('keeps the %s source and its scope', async (kind) => {
			const agent = kind === 'global' ? owner : kind === 'team' ? editor : member;
			const projectId = kind === 'global' ? null : kind === 'team' ? team.id : personal.id;
			const scope = projectId ? { scope: 'project', projectId } : { scope: 'instance' };
			const initial = await connectOne(agent, scope);
			const { data: remaining } = await more(agent, initial.sourceId);
			expect(remaining.source).toMatchObject({
				id: initial.sourceId,
				projectId,
				skillCount: 1,
				canAddSkills: true,
			});
			expect(remaining.skills.map((skill) => skill.name)).not.toContain('pdf');
			const { data: added } = await add(
				agent,
				initial.sourceId,
				keysOf({ ...remaining, duplicate: { kind: 'none' } }, ['docx']),
			);
			expect(added.sourceId).toBe(initial.sourceId);
			expect(added.imported).toHaveLength(1);
			expect(await findSkill(added.imported[0].skillId)).toMatchObject({
				projectId,
				agentId: null,
			});
			expect(await countSources()).toBe(1);
		});

		it('expands a folder link on the saved branch and keeps linked skills fetchable', async () => {
			github.push(
				'acme/skills',
				{ ...FILES, 'skills/docx/SKILL.md': skillMd('branch-docx') },
				'release',
			);
			const initial = await connectOne(
				owner,
				{ scope: 'instance' },
				`${REPO}/tree/release/skills/pdf`,
			);
			const { data } = await more(owner, initial.sourceId);
			expect(data.source).toMatchObject({ ref: 'release', path: '' });
			const docx = data.skills.find((skill) => skill.name === 'branch-docx')!;
			const { data: added } = await add(owner, initial.sourceId, [docx.key]);
			expect((await findLatestSkillVersion(added.imported[0].skillId))?.name).toBe('branch-docx');
			const stored = await Container.get(DataSource).manager.findOneByOrFail(
				SkillSourceConnection,
				{ id: initial.sourceId },
			);
			const fetched = await Container.get(GitHubSkillSourceClient).fetchLatest(
				stored.locator,
				JSON.parse(docx.key),
			);
			expect(fetched.content.name).toBe('branch-docx');
		});

		it('excludes linked paths after a remote rename and refuses stale selections', async () => {
			const initial = await connectOne(owner, { scope: 'instance' });
			github.push('acme/skills', { ...FILES, 'skills/pdf/SKILL.md': skillMd('renamed-pdf') });
			const { data } = await more(owner, initial.sourceId);
			expect(data.skills.some((skill) => skill.location === 'skills/pdf')).toBe(false);
			const body = await add(owner, initial.sourceId, [initial.imported[0].key], 409);
			expect(body.meta?.reason).toBe('duplicate_source');
			expect((await findLatestSkillVersion(initial.imported[0].skillId))?.name).toBe('pdf');
		});

		it('imports each remote skill once when requests overlap', async () => {
			const initial = await connectOne(owner, { scope: 'instance' });
			const { data } = await more(owner, initial.sourceId);
			const skillKeys = [data.skills.find((skill) => skill.name === 'docx')!.key];
			const responses = await Promise.all([
				owner.post(`/skill-sources/${initial.sourceId}/skills`).send({ skillKeys }),
				owner.post(`/skill-sources/${initial.sourceId}/skills`).send({ skillKeys }),
			]);
			expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
			expect((await more(owner, initial.sourceId)).data.source.skillCount).toBe(2);
		});

		it('lists a deleted skill again and keeps a stopped skill as a name conflict', async () => {
			const initial = await connectOne(owner, { scope: 'instance' });
			await owner
				.post(`/skill-sources/skills/${initial.imported[0].skillId}/stop-syncing`)
				.send()
				.expect(200);
			const { data: stopped } = await more(owner, initial.sourceId);
			expect(stopped.skills.find((skill) => skill.name === 'pdf')?.nameTaken).toBe(true);
			await owner.delete(`/skills/${initial.imported[0].skillId}`).expect(200);
			const { data: deleted } = await more(owner, initial.sourceId);
			const pdf = deleted.skills.find((skill) => skill.name === 'pdf')!;
			expect(pdf.nameTaken).toBe(false);
			expect((await add(owner, initial.sourceId, [pdf.key])).data.imported).toHaveLength(1);
		});

		it('can reimport a deleted synced skill into the existing source', async () => {
			const initial = await connectOne(owner, { scope: 'instance' });
			await owner.delete(`/skills/${initial.imported[0].skillId}`).expect(200);
			const { data } = await more(owner, initial.sourceId);
			expect(data.source.skillCount).toBe(0);
			expect(data.skills.find((skill) => skill.name === 'pdf')?.nameTaken).toBe(false);
			expect(
				(await add(owner, initial.sourceId, [initial.imported[0].key])).data.imported,
			).toHaveLength(1);
			expect(await countSources()).toBe(1);
		});

		it('reports partial imports as more without reporting a new connection', async () => {
			const initial = await connectOne(owner, { scope: 'instance' });
			const { data } = await more(owner, initial.sourceId);
			const imported = vi.spyOn(Container.get(SkillsTelemetry), 'importedFromSource');
			const connected = vi.spyOn(Container.get(SkillsTelemetry), 'connectedSource');
			const { data: added } = await add(owner, initial.sourceId, [
				data.skills.find((skill) => skill.name === 'docx')!.key,
				'missing',
			]);
			expect(added.imported).toHaveLength(1);
			expect(added.failed).toEqual([{ key: 'missing', name: null, reason: 'not_found' }]);
			expect(imported).toHaveBeenCalledWith(
				expect.objectContaining({
					first_or_more: 'more',
					selected: 2,
					imported: 1,
					status: 'success',
				}),
				ownerUser.id,
			);
			expect(connected).not.toHaveBeenCalled();
			imported.mockRestore();
			connected.mockRestore();
		});

		it('checks access before reading the remote source', async () => {
			const global = await connectOne(owner, { scope: 'instance' });
			const requests = github.requests.refs;
			await more(member, global.sourceId, 403);
			await add(member, global.sourceId, ['x'], 403);
			await more(owner, 'missing', 404);
			await more(member, 'missing', 404);
			expect(github.requests.refs).toBe(requests);
		});

		it('hides sources in other projects and refuses project viewers', async () => {
			const initial = await connectOne(editor, { scope: 'project', projectId: team.id });
			const requests = github.requests.refs;
			await more(member, initial.sourceId, 404);
			await add(member, initial.sourceId, ['x'], 404);
			await more(viewer, initial.sourceId, 403);
			await add(viewer, initial.sourceId, ['x'], 403);
			expect(github.requests.refs).toBe(requests);
		});

		it('lists only visible sources with counts and actions, without credentials or locators', async () => {
			const own = await connectOne(member, { scope: 'project', projectId: personal.id });
			const shared = await connectOne(editor, { scope: 'project', projectId: team.id });
			const global = await connectOne(owner, { scope: 'instance' });
			const response = await member.get('/skill-sources').expect(200);
			const sources = response.body.data as SkillSourceListItem[];
			expect(sources.map((source) => source.id).sort()).toEqual(
				[own.sourceId, global.sourceId].sort(),
			);
			expect(sources.find((source) => source.id === own.sourceId)).toMatchObject({
				canAddSkills: true,
				skillCount: 1,
			});
			expect(sources.find((source) => source.id === global.sourceId)?.canAddSkills).toBe(false);
			for (const source of sources) {
				expect(source).not.toHaveProperty('credentialId');
				expect(source).not.toHaveProperty('locator');
			}
			const viewed = (await viewer.get('/skill-sources').expect(200)).body
				.data as SkillSourceListItem[];
			expect(viewed.find((source) => source.id === shared.sourceId)?.canAddSkills).toBe(false);
		});

		it('gates the new routes before validating input', async () => {
			postHog.getFeatureFlags.mockResolvedValue({});
			await owner.get('/skill-sources').expect(404);
			await more(owner, 'missing', 404);
			await owner.post('/skill-sources/missing/skills').send({}).expect(404);
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

		it('imports one of two picked skills with the same name, and reports the other', async () => {
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

			expect(data.imported).toEqual([expect.objectContaining({ name: 'twin' })]);
			expect(data.failed).toEqual([
				{ key: expect.any(String), name: 'twin', reason: 'name_taken' },
			]);
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
				[{ id: data.imported[0].skillId, projectId: null, agentId: null }],
				'github',
				'sync',
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

		it.each(['tree/main/empty', 'tree/main/missing', 'tree/empty-branch'])(
			'offers the saved source without reading skills from %s',
			async (path) => {
				const { data: first } = await connectPdf(owner, { scope: 'instance' });
				github.push('acme/skills', { ...FILES, 'empty/README.md': '# No skills' });
				github.push('acme/skills', { 'README.md': '# No skills' }, 'empty-branch');
				const archives = github.requests.archives;
				const connected = vi.spyOn(Container.get(SkillsTelemetry), 'connectedSource');

				const { data } = await discover(owner, { url: `${REPO}/${path}`, scope: 'instance' });

				expect(data.duplicate).toEqual({
					kind: 'blocked',
					where: 'global',
					sourceId: first.sourceId,
				});
				expect(data.skills).toEqual([]);
				expect(github.requests.archives).toBe(archives);
				expect(connected).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({ status: 'failure', reason: 'duplicate_source' }),
					ownerUser.id,
				);
				connected.mockRestore();

				const remaining = await owner
					.post(`/skill-sources/${first.sourceId}/discover`)
					.send()
					.expect(200);
				expect(remaining.body.data.source.ref).toBe('main');
				expect(remaining.body.data.skills).toEqual(
					expect.arrayContaining([expect.objectContaining({ name: 'docx' })]),
				);
			},
		);

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
