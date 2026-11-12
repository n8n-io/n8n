import {
	SKILL_SYNC_FLAG,
	type SkillListResponse,
	type SkillSourceConnectResponse,
	type SkillSourceDiscovery,
	type SkillSourceListItem,
} from '@n8n/api-types';
import { PostHogClient } from '@n8n/backend-services';
import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import nock from 'nock';

import { createSkill, deleteAllSkills } from '../../testing';
import { SkillSourceConnection } from '../../database/entities/skill-source-connection.entity';
import { SkillSourceLink } from '../../database/entities/skill-source-link.entity';
import { SkillSyncService } from '../../services/skill-sync.service';
import { FakeGitHub } from '../test-utils/fake-github';

import { createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import { setupTestServer } from '@test-integration/utils';

const skillMd = (name: string, body = `Follow ${name}.`, description = `${name} description`) =>
	`---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`;

/** A repository with these skills, each in `skills/<name>`. */
const repo = (names: string[]): Record<string, string> => ({
	'README.md': '# Skills\n',
	...Object.fromEntries(names.map((name) => [`skills/${name}/SKILL.md`, skillMd(name)])),
});

beforeAll(async () => {
	await testModules.loadModules(['skills', 'agents']);
	nock.disableNetConnect();
	nock.enableNetConnect(/127\.0\.0\.1|localhost/);
});

afterAll(() => {
	nock.enableNetConnect();
});

describe('Sources in the skills table', () => {
	const server = setupTestServer({ endpointGroups: ['ai'] });
	const postHog = mockInstance(PostHogClient);
	const github = new FakeGitHub();
	let memberUser: User;
	let owner: SuperAgentTest;
	let editor: SuperAgentTest;
	let viewer: SuperAgentTest;
	let outsider: SuperAgentTest;
	let team: Project;

	const db = () => Container.get(DataSource).manager;

	beforeAll(async () => {
		memberUser = await createMember();
		const viewerUser = await createMember();
		owner = server.authAgentFor(await createOwner());
		editor = server.authAgentFor(memberUser);
		viewer = server.authAgentFor(viewerUser);
		outsider = server.authAgentFor(await createMember());
		team = await createTeamProject('Marketing');
		team.icon = { type: 'emoji', value: '🚀' };
		await db().save(team);
		await linkUserToProject(memberUser, team, 'project:editor');
		await linkUserToProject(viewerUser, team, 'project:viewer');
	});

	beforeEach(async () => {
		await deleteAllSkills();
		await db().delete(SkillSourceConnection, {});
		postHog.getFeatureFlags.mockResolvedValue({ [SKILL_SYNC_FLAG]: true });
		(Reflect.get(Container.get(SkillSyncService), 'backoff') as Map<string, unknown>).clear();
		github.start();
		github.push('acme/zeta', repo(['z1', 'z2', 'z3']));
		github.push('acme/alpha', repo(['a1', 'a2']));
	});

	afterEach(() => {
		github.stop();
	});

	/** Imports every skill of the repository into the team, and answers the source id. */
	const connect = async (repository: string) => {
		const scope = { scope: 'project', projectId: team.id };
		const url = `https://github.com/${repository}`;
		const discovery = (
			await editor
				.post('/skill-sources/discover')
				.send({ url, ...scope })
				.expect(200)
		).body.data as SkillSourceDiscovery;
		const { sourceId } = (
			await editor
				.post('/skill-sources')
				.send({ url, ...scope, skillKeys: discovery.skills.map(({ key }) => key) })
				.expect(200)
		).body.data as SkillSourceConnectResponse;
		return sourceId;
	};

	const list = async (agent: SuperAgentTest, query: Record<string, string | number>) =>
		(await agent.get('/skills').query(query).expect(200)).body.data as SkillListResponse;

	const namesOf = (page: SkillListResponse) => page.data.map(({ name }) => name);

	describe('GET /skill-sources', () => {
		it('lists the sources the user can see, with their skills and updates', async () => {
			const zeta = await connect('acme/zeta');
			github.push('acme/zeta', {
				...repo(['z1', 'z2', 'z3']),
				'skills/z1/SKILL.md': skillMd('z1', 'v2'),
			});
			await db().update(SkillSourceConnection, { id: zeta }, { lastCheckedAt: new Date(0) });
			await Container.get(SkillSyncService).checkAll();

			const sources = (await editor.get('/skill-sources').expect(200)).body
				.data as SkillSourceListItem[];

			expect(sources).toEqual([
				expect.objectContaining({
					id: zeta,
					label: 'acme/zeta',
					ref: 'main',
					projectId: team.id,
					projectName: 'Marketing',
					projectType: 'team',
					projectIcon: { type: 'emoji', value: '🚀' },
					skillCount: 3,
					updatesAvailable: 1,
					updatesBlocked: 0,
					health: 'connected',
					canReview: true,
				}),
			]);
			expect((await viewer.get('/skill-sources').expect(200)).body.data).toEqual([
				expect.objectContaining({
					id: zeta,
					canReview: false,
					updatesAvailable: 0,
					updatesBlocked: 0,
				}),
			]);
			expect((await outsider.get('/skill-sources').expect(200)).body.data).toEqual([]);
		});

		it.each([
			['credential_missing', 'credential_issue'],
			['not_found', 'source_unavailable'],
			['archive_too_large', 'check_failed'],
		])(
			'shows %s health to viewers, and clears it after a successful check',
			async (reason, health) => {
				const sourceId = await connect('acme/zeta');
				const lastCheckedAt = new Date('2026-01-01T00:00:00.000Z');
				await db().update(
					SkillSourceConnection,
					{ id: sourceId },
					{
						lastCheckedAt,
						lastErrorReason: reason,
					},
				);

				const [source] = (await viewer.get('/skill-sources').expect(200)).body
					.data as SkillSourceListItem[];
				expect(source).toMatchObject({
					health,
					lastCheckedAt: lastCheckedAt.toISOString(),
					canReview: false,
					updatesAvailable: 0,
					updatesBlocked: 0,
				});
				expect(source).not.toHaveProperty('credentialId');
				expect(source).not.toHaveProperty('lastErrorReason');

				await editor.post(`/skill-sources/${sourceId}/check`).expect(200);
				const [recovered] = (await viewer.get('/skill-sources').expect(200)).body
					.data as SkillSourceListItem[];
				expect(recovered.health).toBe('connected');
				expect(recovered.lastCheckedAt).not.toBe(lastCheckedAt.toISOString());
			},
		);

		it('keeps a source that has no synced skills left', async () => {
			const zeta = await connect('acme/zeta');
			await db().delete(SkillSourceLink, { sourceId: zeta });

			const sources = (await editor.get('/skill-sources').expect(200)).body
				.data as SkillSourceListItem[];

			expect(sources).toEqual([expect.objectContaining({ id: zeta, skillCount: 0 })]);
		});

		it('answers 404 with the flag off', async () => {
			postHog.getFeatureFlags.mockResolvedValue({});

			await editor.get('/skill-sources').expect(404);
		});
	});

	describe('POST /skill-sources/:sourceId/check', () => {
		it('checks the source for a user who may change it, and refuses the others', async () => {
			const zeta = await connect('acme/zeta');
			await db().update(SkillSourceConnection, { id: zeta }, { lastCheckedAt: new Date(0) });

			const { body } = await editor.post(`/skill-sources/${zeta}/check`).expect(200);

			expect(body.data).toMatchObject({ label: 'acme/zeta', updatesFound: 0, throttled: false });
			await viewer.post(`/skill-sources/${zeta}/check`).expect(403);
			// A malformed id finds no source, also on Postgres, where it is not a valid uuid.
			await editor.post('/skill-sources/not-a-uuid/check').expect(404);
			await outsider.post(`/skill-sources/${zeta}/check`).expect(404);
			postHog.getFeatureFlags.mockResolvedValue({});
			await editor.post(`/skill-sources/${zeta}/check`).expect(404);
		});
	});

	describe('GET /skills?groupBy=source', () => {
		it('answers 404 for grouped lists with Skill Sync off and keeps the plain list available', async () => {
			postHog.getFeatureFlags.mockResolvedValue({});
			await editor.get('/skills').query({ groupBy: 'source' }).expect(404);
			await outsider.get('/skills').query({ groupBy: 'source', projectId: team.id }).expect(404);
			await editor.get('/skills').expect(200);
		});

		it('puts each source first, by repository, then the skills that no source syncs', async () => {
			const zeta = await connect('acme/zeta');
			const alpha = await connect('acme/alpha');
			await createSkill({ projectId: team.id, content: { name: 'local' } });

			const page = await list(editor, { groupBy: 'source', sortBy: 'name:asc' });

			expect(namesOf(page)).toEqual(['a1', 'a2', 'z1', 'z2', 'z3', 'local']);
			expect(page.data.map(({ sourceId }) => sourceId)).toEqual([
				alpha,
				alpha,
				zeta,
				zeta,
				zeta,
				null,
			]);
			expect(page.count).toBe(6);
			expect(page.collapsedSources).toEqual([]);
		});

		it('keeps each source group whole, including a group larger than the page target', async () => {
			await connect('acme/zeta');
			await connect('acme/alpha');

			const first = await list(editor, { groupBy: 'source', sortBy: 'name:asc', take: 2 });
			const second = await list(editor, {
				groupBy: 'source',
				sortBy: 'name:asc',
				page: 1,
				take: 2,
			});

			expect(namesOf(first)).toEqual(['a1', 'a2']);
			expect(namesOf(second)).toEqual(['z1', 'z2', 'z3']);
			expect(first.count).toBe(5);
			expect(first.pageCount).toBe(2);
			expect(second.page).toBe(1);
		});

		it('paginates empty sources and finds the page of a source', async () => {
			const zeta = await connect('acme/zeta');
			const alpha = await connect('acme/alpha');
			await db().delete(SkillSourceLink, { sourceId: alpha });
			const first = await list(editor, { groupBy: 'source', take: 1 });
			expect(first.collapsedSources).toEqual([{ sourceId: alpha, index: 0, skillCount: 0 }]);
			const focused = await list(editor, { groupBy: 'source', take: 1, focusSourceId: zeta });
			expect(focused.page).toBe(1);
			expect(focused.data.every(({ sourceId }) => sourceId === zeta)).toBe(true);
			expect(focused.data).toHaveLength(3);
			expect(focused.collapsedSources).toEqual([]);
		});

		it('counts a folded source as one row in place of its skills', async () => {
			const zeta = await connect('acme/zeta');
			await connect('acme/alpha');

			const page = await list(editor, {
				groupBy: 'source',
				sortBy: 'name:asc',
				collapsedSourceIds: zeta,
			});

			expect(namesOf(page)).toEqual(['a1', 'a2']);
			expect(page.collapsedSources).toEqual([{ sourceId: zeta, index: 2, skillCount: 3 }]);
			expect(page.count).toBe(3);
		});

		it('keeps only the groups with a match when searching', async () => {
			await connect('acme/zeta');
			const alpha = await connect('acme/alpha');

			const page = await list(editor, { groupBy: 'source', search: 'a2' });

			expect(namesOf(page)).toEqual(['a2']);
			expect(page.data[0].sourceId).toBe(alpha);
		});

		it('refuses an id that is not a source id', async () => {
			await editor
				.get('/skills')
				.query({ groupBy: 'source', collapsedSourceIds: 'not-a-uuid' })
				.expect(400);
		});

		it('gives each synced skill its source id in the plain list too', async () => {
			const zeta = await connect('acme/zeta');

			const page = await list(owner, { sortBy: 'name:asc' });

			expect(page.data.map(({ sourceId }) => sourceId)).toEqual([zeta, zeta, zeta]);
			expect(page.collapsedSources).toBeUndefined();
		});
	});
});
