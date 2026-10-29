import {
	SKILL_SYNC_FLAG,
	type SkillSourceConnectResponse,
	type SkillSourceDiscovery,
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

import { createSkill, deleteAllSkills, findLatestSkillVersion, findSkill } from '../../testing';
import { SkillSourceConnection } from '../../database/entities/skill-source-connection.entity';
import { SkillsTelemetry } from '../../services/skills-telemetry.service';
import { FakeGitHub } from '../test-utils/fake-github';
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

	it('answers 404 when the Skill Sync flag is off for the user', async () => {
		postHog.getFeatureFlags.mockResolvedValue({});

		await discover(owner, { url: REPO, scope: 'instance' }, 404);
		await connect(owner, { url: REPO, scope: 'instance', skillKeys: ['x'] }, 404);
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
			['https://gitlab.com/acme/skills', 400, 'invalid_url'],
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

	describe('duplicate rules', () => {
		const connectPdf = async (agent: SuperAgentTest, scope: Record<string, unknown>) => {
			const { data: discovery } = await discover(agent, { url: REPO, ...scope });
			return await connect(agent, { url: REPO, ...scope, skillKeys: keysOf(discovery, ['pdf']) });
		};

		it('blocks a second source in Global, and lets an admin add skills to the first', async () => {
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
