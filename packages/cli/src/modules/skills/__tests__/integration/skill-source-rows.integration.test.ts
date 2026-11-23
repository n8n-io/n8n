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
import { randomUUID } from 'node:crypto';

import { AgentSkillRepository } from '@/modules/agents/repositories/agent-skill.repository';
import { createSkill, deleteAllSkills } from '../../testing';
import { SkillSourceConnection } from '../../database/entities/skill-source-connection.entity';
import { SkillSourceLink } from '../../database/entities/skill-source-link.entity';
import { SkillSourceBackoff } from '../../services/skill-source-backoff';
import { SkillSyncService } from '../../services/skill-sync.service';
import { FakeGitHub } from '../test-utils/fake-github';

import { createAgent } from '@test-integration/db/agents';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
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
	let updater: SuperAgentTest;
	let outsider: SuperAgentTest;
	let team: Project;

	const db = () => Container.get(DataSource).manager;

	beforeAll(async () => {
		memberUser = await createMember();
		const viewerUser = await createMember();
		const updaterUser = await createMember();
		owner = server.authAgentFor(await createOwner());
		editor = server.authAgentFor(memberUser);
		viewer = server.authAgentFor(viewerUser);
		updater = server.authAgentFor(updaterUser);
		outsider = server.authAgentFor(await createMember());
		team = await createTeamProject('Marketing');
		team.icon = { type: 'emoji', value: '🚀' };
		await db().save(team);
		await linkUserToProject(memberUser, team, 'project:editor');
		await linkUserToProject(viewerUser, team, 'project:viewer');
		const updaterRole = await createCustomRoleWithScopeSlugs(
			['projectSkill:list', 'projectSkill:read', 'projectSkill:update'],
			{ roleType: 'project' },
		);
		await linkUserToProject(updaterUser, team, updaterRole.slug);
	});

	beforeEach(async () => {
		await deleteAllSkills();
		await db().delete(SkillSourceConnection, {});
		postHog.getFeatureFlags.mockResolvedValue({ [SKILL_SYNC_FLAG]: true });
		(Reflect.get(Container.get(SkillSourceBackoff), 'waits') as Map<string, unknown>).clear();
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

	const list = async (agent: SuperAgentTest, query: Record<string, string | number | undefined>) =>
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
					canImport: true,
				}),
			]);
			expect((await viewer.get('/skill-sources').expect(200)).body.data).toEqual([
				expect.objectContaining({
					id: zeta,
					canReview: false,
					canImport: false,
					updatesAvailable: 0,
					updatesBlocked: 0,
				}),
			]);
			expect((await outsider.get('/skill-sources').expect(200)).body.data).toEqual([]);
			expect((await updater.get('/skill-sources').expect(200)).body.data).toEqual([
				expect.objectContaining({ id: zeta, canReview: true, canImport: false }),
			]);
		});

		it('reports import permission for Global sources', async () => {
			const { sourceId } = (
				await owner
					.post('/skill-sources')
					.send({
						url: 'https://github.com/acme/zeta',
						scope: 'instance',
						skillKeys: [JSON.stringify({ path: 'skills/z1' })],
					})
					.expect(200)
			).body.data as SkillSourceConnectResponse;
			expect((await owner.get('/skill-sources').expect(200)).body.data).toEqual([
				expect.objectContaining({ id: sourceId, canReview: true, canImport: true }),
			]);
			expect((await outsider.get('/skill-sources').expect(200)).body.data).toEqual([
				expect.objectContaining({ id: sourceId, canReview: false, canImport: false }),
			]);
		});

		it.each([
			['credential_missing', 'credential_issue'],
			['not_found', 'source_unavailable'],
			['archive_too_large', 'source_unavailable'],
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
			await editor.get('/skills').query({ sourceIds: randomUUID() }).expect(404);
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

		it('splits a large source across pages and repeats its source id', async () => {
			const zeta = await connect('acme/zeta');
			await connect('acme/alpha');

			const first = await list(editor, { groupBy: 'source', sortBy: 'name:asc', take: 2 });
			const second = await list(editor, {
				groupBy: 'source',
				sortBy: 'name:asc',
				page: 1,
				take: 2,
			});

			expect(namesOf(first)).toEqual(['a1', 'a2']);
			expect(namesOf(second)).toEqual(['z1', 'z2']);
			expect(first.count).toBe(5);
			expect(first.pageCount).toBe(3);
			expect(second.page).toBe(1);
			const third = await list(editor, { groupBy: 'source', sortBy: 'name:asc', page: 2, take: 2 });
			expect(namesOf(third)).toEqual(['z3']);
			expect(third.data[0].sourceId).toBe(zeta);
		});

		it('fills ten-skill pages across uneven sources', async () => {
			github.push('acme/alpha', repo(['a1']));
			github.push('acme/zeta', repo(Array.from({ length: 10 }, (_, index) => `z${index}`)));
			const alpha = await connect('acme/alpha');
			const zeta = await connect('acme/zeta');
			const query = { groupBy: 'source', sortBy: 'name:asc', take: 10 };
			const first = await list(editor, query);
			const second = await list(editor, { ...query, page: 1 });
			expect(namesOf(first)).toEqual(['a1', 'z0', 'z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'z8']);
			expect(first.data.map(({ sourceId }) => sourceId)).toEqual([alpha, ...Array(9).fill(zeta)]);
			expect(first.sourceRanges).toEqual([
				{ sourceId: alpha, start: 1, end: 1, total: 1 },
				{ sourceId: zeta, start: 1, end: 9, total: 10 },
			]);
			expect(namesOf(second)).toEqual(['z9']);
			expect(second.data[0].sourceId).toBe(zeta);
			expect(second.sourceRanges).toEqual([{ sourceId: zeta, start: 10, end: 10, total: 10 }]);
			expect(second).toMatchObject({ count: 11, page: 1, pageCount: 2 });
		});

		it('keeps empty sources beside skills without consuming a pagination slot', async () => {
			const zeta = await connect('acme/zeta');
			const alpha = await connect('acme/alpha');
			await db().delete(SkillSourceLink, { sourceId: alpha });
			const first = await list(editor, { groupBy: 'source', take: 1 });
			expect(first.collapsedSources).toEqual([{ sourceId: alpha, index: 0, skillCount: 0 }]);
			const focused = await list(editor, { groupBy: 'source', take: 1, focusSourceId: zeta });
			expect(focused.page).toBe(0);
			expect(focused.data.every(({ sourceId }) => sourceId === zeta)).toBe(true);
			expect(focused.data).toHaveLength(1);
			expect(focused.collapsedSources).toEqual([{ sourceId: alpha, index: 0, skillCount: 0 }]);
		});

		it('counts the skills of a folded source', async () => {
			const zeta = await connect('acme/zeta');
			await connect('acme/alpha');

			const page = await list(editor, {
				groupBy: 'source',
				sortBy: 'name:asc',
				collapsedSourceIds: zeta,
			});

			expect(namesOf(page)).toEqual(['a1', 'a2']);
			expect(page.collapsedSources).toEqual([{ sourceId: zeta, index: 2, skillCount: 3 }]);
			expect(page.count).toBe(5);
		});

		it('keeps a later page and its other skills when a source is folded', async () => {
			const zeta = await connect('acme/zeta');
			await connect('acme/alpha');
			await createSkill({ projectId: team.id, content: { name: 'local' } });
			const query = { groupBy: 'source', sortBy: 'name:asc', page: 1, take: 4 };
			const expanded = await list(editor, query);
			const folded = await list(editor, { ...query, collapsedSourceIds: zeta });
			expect(namesOf(expanded)).toEqual(['z3', 'local']);
			expect(namesOf(folded)).toEqual(['local']);
			expect(folded).toMatchObject({
				count: expanded.count,
				page: 1,
				pageCount: expanded.pageCount,
			});
			expect(folded.collapsedSources).toEqual([{ sourceId: zeta, index: 0, skillCount: 3 }]);
			expect(folded.sourceRanges).toEqual(expanded.sourceRanges);
			expect(folded.sourceRanges).toEqual([{ sourceId: zeta, start: 3, end: 3, total: 3 }]);
			expect(namesOf(await list(editor, query))).toEqual(namesOf(expanded));
		});

		it('applies access and filters before slicing and clamps an invalid page', async () => {
			await connect('acme/zeta');
			await connect('acme/alpha');
			const query = { groupBy: 'source', sortBy: 'name:desc', search: 'z', take: 2, page: 99 };
			const filtered = await list(editor, query);
			expect(namesOf(filtered)).toEqual(['z1']);
			expect(filtered).toMatchObject({ count: 3, page: 1, pageCount: 2 });
			expect(filtered.sourceRanges).toEqual([
				{ sourceId: filtered.data[0].sourceId, start: 3, end: 3, total: 3 },
			]);
			expect(await list(outsider, query)).toMatchObject({
				count: 0,
				data: [],
				page: 0,
				pageCount: 1,
			});
		});

		it.each([
			{ search: 'a2', names: ['a2'] },
			{ search: 'ALPHA', names: ['a1', 'a2'] },
			{ search: 'AcMe/AlPhA', names: ['a1', 'a2'] },
		])('finds matching skills and sources by $search', async ({ search, names }) => {
			await connect('acme/zeta');
			const alpha = await connect('acme/alpha');

			const page = await list(viewer, { groupBy: 'source', search, sortBy: 'name:asc' });

			expect(namesOf(page)).toEqual(names);
			expect(page.data.every(({ sourceId }) => sourceId === alpha)).toBe(true);
			expect(page.count).toBe(names.length);
		});

		it('combines repository matches with skill name and description matches', async () => {
			github.push('acme/zeta', {
				...repo(['z1', 'z2']),
				'skills/z1/SKILL.md': skillMd('z1', 'Follow the guide.', 'Use alpha conventions.'),
			});
			await connect('acme/zeta');
			await connect('acme/alpha');
			await createSkill({ projectId: team.id, content: { name: 'alpha-local' } });

			const page = await list(editor, { groupBy: 'source', search: 'alpha', sortBy: 'name:asc' });

			expect(namesOf(page)).toEqual(['a1', 'a2', 'z1', 'alpha-local']);
			expect(page.count).toBe(4);
			const plain = await list(editor, { search: 'alpha', sortBy: 'name:asc' });
			expect(namesOf(plain)).toEqual(['alpha-local', 'z1']);
		});

		it('filters multiple sources before paging and keeps folded pagination slots', async () => {
			const zeta = await connect('acme/zeta');
			const alpha = await connect('acme/alpha');
			github.push('acme/other', repo(['other']));
			await connect('acme/other');
			await createSkill({ projectId: team.id, content: { name: 'local' } });
			const query = {
				groupBy: 'source',
				sourceIds: `${alpha},${zeta}`,
				search: 'ACME',
				take: 2,
				sortBy: 'name:asc',
			};

			const first = await list(editor, query);
			const second = await list(editor, { ...query, page: 1 });
			expect(namesOf(first)).toEqual(['a1', 'a2']);
			expect(namesOf(second)).toEqual(['z1', 'z2']);
			expect(first).toMatchObject({ count: 5, pageCount: 3 });
			expect(second).toMatchObject({ count: 5, pageCount: 3, page: 1 });
			expect(second.sourceRanges).toEqual([{ sourceId: zeta, start: 1, end: 2, total: 3 }]);
			const third = await list(editor, { ...query, page: 2 });
			expect(namesOf(third)).toEqual(['z3']);
			expect(third.sourceRanges).toEqual([{ sourceId: zeta, start: 3, end: 3, total: 3 }]);

			const folded = await list(editor, { ...query, collapsedSourceIds: zeta, page: 1 });
			expect(folded).toMatchObject({ count: 5, pageCount: 3, page: 1, data: [] });
			expect(folded.collapsedSources).toEqual([{ sourceId: zeta, index: 0, skillCount: 3 }]);
			expect(folded.sourceRanges).toEqual(second.sourceRanges);
			const selected = await list(editor, { ...query, sourceIds: alpha, search: 'zeta' });
			expect(selected).toMatchObject({ count: 0, data: [], collapsedSources: [] });
		});

		it('combines source search and selection with scope, agent and skill creator', async () => {
			const alpha = await connect('acme/alpha');
			const zeta = await connect('acme/zeta');
			const { data } = await list(editor, { search: 'a1' });
			const agent = await createAgent({
				id: randomUUID(),
				name: 'Support bot',
				projectId: team.id,
				integrations: [],
				tools: {},
				versionId: randomUUID(),
			});
			await Container.get(AgentSkillRepository).replaceDependencies(agent.id, [
				{ skillId: data[0].id },
			]);
			const query = {
				groupBy: 'source',
				sourceIds: `${alpha},${zeta}`,
				search: 'acme',
				scope: 'project',
				agentId: agent.id,
				createdById: memberUser.id,
			};

			expect(namesOf(await list(editor, query))).toEqual(['a1']);
			for (const filter of [{ scope: 'instance' }, { createdById: randomUUID() }]) {
				expect(await list(editor, { ...query, ...filter })).toMatchObject({
					count: 0,
					data: [],
					collapsedSources: [],
				});
			}
			expect(await list(outsider, query)).toMatchObject({ count: 0, data: [] });
		});

		it('keeps matching empty sources while respecting scope and skill filters', async () => {
			const alpha = await connect('acme/alpha');
			await db().delete(SkillSourceLink, { sourceId: alpha });
			const query = { groupBy: 'source' };

			for (const filter of [{ search: 'alpha' }, { sourceIds: alpha }]) {
				const page = await list(editor, { ...query, ...filter, scope: 'project' });
				expect(page.collapsedSources).toEqual([{ sourceId: alpha, index: 0, skillCount: 0 }]);
				expect(page).toMatchObject({ count: 0, pageCount: 1, data: [] });
			}
			for (const filter of [
				{ scope: 'instance' },
				{ createdById: memberUser.id },
				{ search: 'unrelated' },
				{ sourceIds: randomUUID() },
			]) {
				expect(await list(editor, { ...query, sourceIds: alpha, ...filter })).toMatchObject({
					count: 0,
					data: [],
					collapsedSources: [],
				});
			}
		});

		it('hides inaccessible source matches and ignores unknown selected sources', async () => {
			const alpha = await connect('acme/alpha');
			const query = { groupBy: 'source', sourceIds: `${alpha},${randomUUID()}`, search: 'alpha' };
			expect(await list(viewer, query)).toMatchObject({ count: 2 });
			await createSkill({ content: { name: 'alpha-global' } });
			for (const empty of [false, true]) {
				if (empty) await db().delete(SkillSourceLink, { sourceId: alpha });
				expect(await list(outsider, query)).toMatchObject({
					count: 0,
					data: [],
					collapsedSources: [],
				});
				const search = await list(outsider, { groupBy: 'source', search: 'alpha' });
				expect(namesOf(search)).toEqual(['alpha-global']);
				expect(search.collapsedSources).toEqual([]);
			}
		});

		it.each(['%', '_', 'github.com', 'main'])(
			'does not match source metadata by %s',
			async (search) => {
				await connect('acme/alpha');
				expect(await list(editor, { groupBy: 'source', search })).toMatchObject({
					count: 0,
					data: [],
					collapsedSources: [],
				});
			},
		);

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
