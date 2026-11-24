import {
	AI_PREFERENCE_CONTENT_MAX_LENGTH,
	AI_PREFERENCE_MAX_PER_SCOPE,
	type AiPreferenceSource,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { AiPreferenceRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ApiKeyScope } from '@n8n/permissions';

import { AiPreferenceSettingsService } from '@/services/ai-preference-settings.service';

import {
	createAdminWithApiKey,
	createMemberWithApiKey,
	createOwnerWithApiKey,
} from '../shared/db/users';
import { setupTestServer } from '../shared/utils/';

const testServer = setupTestServer({ endpointGroups: ['publicApi'] });

let owner: User;
let admin: User;
let member: User;
let outsider: User;
let editorProject: Project;
let viewerProject: Project;
let foreignProject: Project;

beforeAll(async () => {
	Container.get(ModuleRegistry).settings.set('mcp', { mcpAccessEnabled: true });
	owner = await createOwnerWithApiKey();
	admin = await createAdminWithApiKey();
	member = await createMemberWithApiKey();
	outsider = await createMemberWithApiKey();

	editorProject = await createTeamProject('Marketing', owner);
	await linkUserToProject(member, editorProject, 'project:editor');

	viewerProject = await createTeamProject('Sales', owner);
	await linkUserToProject(member, viewerProject, 'project:viewer');

	foreignProject = await createTeamProject('Finance', owner);
});

beforeEach(async () => {
	await testDb.truncate(['AiPreference']);
});

const repository = () => Container.get(AiPreferenceRepository);

async function seed(attributes: {
	content: string;
	source?: AiPreferenceSource;
	userId?: string | null;
	projectId?: string | null;
}) {
	return await repository().save(
		repository().create({
			id: crypto.randomUUID(),
			content: attributes.content,
			source: attributes.source ?? 'ui',
			userId: attributes.userId ?? null,
			projectId: attributes.projectId ?? null,
		}),
	);
}

function contentsOf(response: { body: { data: Array<{ content: string }> } }) {
	return response.body.data.map((row) => row.content).sort();
}

const randomId = () => crypto.randomUUID();

describe('Public API /ai-preferences', () => {
	describe('when an admin turns preferences off', () => {
		const settings = () => Container.get(AiPreferenceSettingsService);

		afterEach(async () => {
			await settings().setEnabled(true);
		});

		test('answers 404 on every route, and works again once preferences are on', async () => {
			const row = await seed({ content: 'mine', userId: owner.id });
			const agent = testServer.publicApiAgentFor(owner);
			const callEveryRoute = async () => [
				await agent.get('/ai-preferences'),
				await agent.get(`/ai-preferences/${row.id}`),
				await agent.post('/ai-preferences').send({ content: 'new', scope: 'user' }),
				await agent
					.put(`/ai-preferences/${row.id}`)
					.send({ content: 'edited', scope: 'user', userId: owner.id }),
				await agent.delete(`/ai-preferences/${row.id}`),
			];

			await settings().setEnabled(false);
			const whileOff = await callEveryRoute();
			const invalidBodyWhileOff = await agent.post('/ai-preferences').send({ scope: 'team' });

			expect(whileOff.map((response) => response.statusCode)).toEqual([404, 404, 404, 404, 404]);
			expect(invalidBodyWhileOff.statusCode).toBe(404);
			expect(whileOff[0].body).toEqual({ message: 'Not Found' });
			expect(await repository().findOneByOrFail({ id: row.id })).toMatchObject({ content: 'mine' });

			await settings().setEnabled(true);
			const whileOn = await callEveryRoute();

			expect(whileOn.map((response) => response.statusCode)).toEqual([200, 200, 201, 200, 204]);
		});
	});

	test('refuses a request without an API key', async () => {
		const response = await testServer.publicApiAgentWithoutApiKey().get('/ai-preferences');

		expect(response.statusCode).toBe(401);
	});

	describe('GET /ai-preferences', () => {
		test('returns the instance rows, the caller rows and the rows of readable projects', async () => {
			await seed({ content: 'instance' });
			await seed({ content: 'mine', userId: member.id });
			await seed({ content: 'other user', userId: outsider.id });
			await seed({ content: 'editor project', projectId: editorProject.id });
			await seed({ content: 'viewer project', projectId: viewerProject.id });
			await seed({ content: 'foreign project', projectId: foreignProject.id });

			const response = await testServer.publicApiAgentFor(member).get('/ai-preferences');

			expect(response.statusCode).toBe(200);
			expect(contentsOf(response)).toEqual([
				'editor project',
				'instance',
				'mine',
				'viewer project',
			]);
			expect(response.body.nextCursor).toBeNull();
		});

		test('shows owners and admins the rows of every user and every project', async () => {
			await seed({ content: 'instance' });
			await seed({ content: 'member row', userId: member.id });
			await seed({ content: 'foreign project', projectId: foreignProject.id });
			await seed({
				content: "member's personal project",
				projectId: (await getPersonalProject(member)).id,
			});

			for (const caller of [owner, admin]) {
				const response = await testServer.publicApiAgentFor(caller).get('/ai-preferences');

				expect(response.statusCode).toBe(200);
				expect(contentsOf(response)).toEqual([
					'foreign project',
					'instance',
					'member row',
					"member's personal project",
				]);
			}
		});

		test.each(['ui', 'import'] as const)('lists public fields for source %s', async (source) => {
			const row = await seed({ content: 'mine', userId: member.id, source });

			const response = await testServer.publicApiAgentFor(member).get('/ai-preferences');

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toEqual([
				{
					id: row.id,
					content: 'mine',
					scope: 'user',
					userId: member.id,
					projectId: null,
					source,
					createdAt: row.createdAt.toISOString(),
					updatedAt: row.updatedAt.toISOString(),
				},
			]);
		});

		test.each([
			['instance', ['instance']],
			['user', ['mine']],
			['project', ['editor project', 'viewer project']],
		])('filters by the %s scope', async (scope, expected) => {
			await seed({ content: 'instance' });
			await seed({ content: 'mine', userId: member.id });
			await seed({ content: 'other user', userId: outsider.id });
			await seed({ content: 'editor project', projectId: editorProject.id });
			await seed({ content: 'viewer project', projectId: viewerProject.id });
			await seed({ content: 'foreign project', projectId: foreignProject.id });

			const response = await testServer
				.publicApiAgentFor(member)
				.get('/ai-preferences')
				.query({ scope });

			expect(response.statusCode).toBe(200);
			expect(contentsOf(response)).toEqual(expected);
		});

		test.each([
			['user', ['member row', 'outsider row']],
			['project', ['foreign project']],
		])(
			'keeps the wider owner and admin view under the %s scope filter',
			async (scope, expected) => {
				await seed({ content: 'instance' });
				await seed({ content: 'member row', userId: member.id });
				await seed({ content: 'outsider row', userId: outsider.id });
				await seed({ content: 'foreign project', projectId: foreignProject.id });

				for (const caller of [owner, admin]) {
					const response = await testServer
						.publicApiAgentFor(caller)
						.get('/ai-preferences')
						.query({ scope });

					expect(response.statusCode).toBe(200);
					expect(contentsOf(response)).toEqual(expected);
				}
			},
		);

		test.each([{}, { scope: 'project' }])(
			'filters by a readable project with %o',
			async (scopeFilter) => {
				await seed({ content: 'instance' });
				await seed({ content: 'editor project', projectId: editorProject.id });
				await seed({ content: 'viewer project', projectId: viewerProject.id });

				const response = await testServer
					.publicApiAgentFor(member)
					.get('/ai-preferences')
					.query({ ...scopeFilter, projectId: viewerProject.id });

				expect(response.statusCode).toBe(200);
				expect(contentsOf(response)).toEqual(['viewer project']);
			},
		);

		test('returns no rows for a project the caller cannot read', async () => {
			await seed({ content: 'foreign project', projectId: foreignProject.id });

			const response = await testServer
				.publicApiAgentFor(member)
				.get('/ai-preferences')
				.query({ projectId: foreignProject.id });

			expect(response.statusCode).toBe(200);
			expect(response.body).toEqual({ data: [], nextCursor: null });
		});

		test('returns no project rows to a caller who can read no team project', async () => {
			await seed({ content: 'foreign project', projectId: foreignProject.id });
			await seed({ content: 'editor project', projectId: editorProject.id });

			const response = await testServer
				.publicApiAgentFor(outsider)
				.get('/ai-preferences')
				.query({ scope: 'project' });

			expect(response.statusCode).toBe(200);
			expect(response.body).toEqual({ data: [], nextCursor: null });
		});

		test('refuses a project filter with a scope that is not project', async () => {
			const response = await testServer
				.publicApiAgentFor(member)
				.get('/ai-preferences')
				.query({ scope: 'user', projectId: editorProject.id });

			expect(response.statusCode).toBe(400);
			expect(response.body.message).toBe('The projectId filter works only with the project scope');
		});

		test('refuses an unknown scope', async () => {
			const response = await testServer
				.publicApiAgentFor(member)
				.get('/ai-preferences')
				.query({ scope: 'team' });

			expect(response.statusCode).toBe(400);
		});

		test('pages through the rows with the cursor', async () => {
			for (const content of ['one', 'two', 'three']) {
				await seed({ content, userId: member.id });
			}

			const firstPage = await testServer
				.publicApiAgentFor(member)
				.get('/ai-preferences')
				.query({ limit: 2 });

			expect(firstPage.statusCode).toBe(200);
			expect(firstPage.body.data).toHaveLength(2);
			expect(firstPage.body.nextCursor).toEqual(expect.any(String));

			const lastPage = await testServer
				.publicApiAgentFor(member)
				.get('/ai-preferences')
				.query({ limit: 2, cursor: firstPage.body.nextCursor });

			expect(lastPage.statusCode).toBe(200);
			expect(lastPage.body.data).toHaveLength(1);
			expect(lastPage.body.nextCursor).toBeNull();
			expect([...contentsOf(firstPage), ...contentsOf(lastPage)].sort()).toEqual([
				'one',
				'three',
				'two',
			]);
		});

		test('refuses an invalid cursor', async () => {
			const response = await testServer
				.publicApiAgentFor(member)
				.get('/ai-preferences')
				.query({ cursor: 'not-a-cursor' });

			expect(response.statusCode).toBe(400);
		});

		test('refuses an API key without the aiPreference:list scope', async () => {
			const caller = await createMemberWithApiKey({ scopes: ['aiPreference:create'] });

			const response = await testServer.publicApiAgentFor(caller).get('/ai-preferences');

			expect(response.statusCode).toBe(403);
		});
	});

	describe('GET /ai-preferences/:aiPreferenceId', () => {
		test.each(['ui', 'import'] as const)('returns public fields for source %s', async (source) => {
			const row = await seed({ content: 'mine', userId: member.id, source });

			const response = await testServer.publicApiAgentFor(member).get(`/ai-preferences/${row.id}`);

			expect(response.statusCode).toBe(200);
			expect(response.body).toEqual({
				id: row.id,
				content: 'mine',
				scope: 'user',
				userId: member.id,
				projectId: null,
				source,
				createdAt: row.createdAt.toISOString(),
				updatedAt: row.updatedAt.toISOString(),
			});
		});

		test('returns a project preference to a member who can read the project', async () => {
			const row = await seed({ content: 'viewer project', projectId: viewerProject.id });

			const response = await testServer.publicApiAgentFor(member).get(`/ai-preferences/${row.id}`);

			expect(response.statusCode).toBe(200);
			expect(response.body).toMatchObject({ scope: 'project', projectId: viewerProject.id });
		});

		test("lets an owner and an admin read another user's preference", async () => {
			const row = await seed({ content: 'member row', userId: member.id });

			for (const caller of [owner, admin]) {
				const response = await testServer
					.publicApiAgentFor(caller)
					.get(`/ai-preferences/${row.id}`);

				expect(response.statusCode).toBe(200);
			}
		});

		test('answers 404 for a row the caller cannot see, and for a missing row', async () => {
			const hidden = await seed({ content: 'hidden', userId: outsider.id });
			const foreign = await seed({ content: 'foreign', projectId: foreignProject.id });

			for (const id of [hidden.id, foreign.id, randomId()]) {
				const response = await testServer.publicApiAgentFor(member).get(`/ai-preferences/${id}`);

				expect(response.statusCode).toBe(404);
			}
		});

		test('refuses an id that is not a UUID', async () => {
			const response = await testServer.publicApiAgentFor(member).get('/ai-preferences/not-a-uuid');

			expect(response.statusCode).toBe(400);
		});

		test('refuses an API key without the aiPreference:read scope', async () => {
			const caller = await createMemberWithApiKey({ scopes: ['aiPreference:list'] });
			const row = await seed({ content: 'mine', userId: caller.id });

			const response = await testServer.publicApiAgentFor(caller).get(`/ai-preferences/${row.id}`);

			expect(response.statusCode).toBe(403);
		});
	});

	describe('POST /ai-preferences', () => {
		test('saves a personal preference for a member', async () => {
			const response = await testServer
				.publicApiAgentFor(member)
				.post('/ai-preferences')
				.send({ content: '  Use British spelling  ', scope: 'user' });

			expect(response.statusCode).toBe(201);
			expect(response.body).toEqual({
				id: expect.any(String),
				content: 'Use British spelling',
				scope: 'user',
				userId: member.id,
				projectId: null,
				source: 'api',
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
			expect(await repository().findOneByOrFail({ id: response.body.id })).toMatchObject({
				source: 'api',
			});
		});

		test('lets an owner and an admin save an instance preference', async () => {
			for (const [caller, content] of [
				[owner, 'from owner'],
				[admin, 'from admin'],
			] as const) {
				const response = await testServer
					.publicApiAgentFor(caller)
					.post('/ai-preferences')
					.send({ content, scope: 'instance' });

				expect(response.statusCode).toBe(201);
				expect(response.body).toMatchObject({ scope: 'instance', userId: null, projectId: null });
			}
		});

		test('refuses an instance preference from a member', async () => {
			const response = await testServer
				.publicApiAgentFor(member)
				.post('/ai-preferences')
				.send({ content: 'Everyone', scope: 'instance' });

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(
				'You are not allowed to set preferences for the whole instance',
			);
		});

		test('lets a project editor save a project preference', async () => {
			const response = await testServer
				.publicApiAgentFor(member)
				.post('/ai-preferences')
				.send({ content: 'Tag every workflow', scope: 'project', projectId: editorProject.id });

			expect(response.statusCode).toBe(201);
			expect(response.body).toMatchObject({ scope: 'project', projectId: editorProject.id });
		});

		test('refuses a project preference from a viewer and from a non-member', async () => {
			for (const projectId of [viewerProject.id, foreignProject.id]) {
				const response = await testServer
					.publicApiAgentFor(member)
					.post('/ai-preferences')
					.send({ content: 'Tag every workflow', scope: 'project', projectId });

				expect(response.statusCode).toBe(403);
				expect(response.body.message).toBe(
					'You are not allowed to set preferences for this project',
				);
			}
		});

		test('lets an admin save a preference for another user, but not a member', async () => {
			const byAdmin = await testServer
				.publicApiAgentFor(admin)
				.post('/ai-preferences')
				.send({ content: 'Short names', scope: 'user', userId: member.id });

			expect(byAdmin.statusCode).toBe(201);
			expect(byAdmin.body.userId).toBe(member.id);

			const byMember = await testServer
				.publicApiAgentFor(outsider)
				.post('/ai-preferences')
				.send({ content: 'Short names', scope: 'user', userId: member.id });

			expect(byMember.statusCode).toBe(403);
		});

		test('refuses a second row with the same text in the same scope', async () => {
			await seed({ content: 'Use British spelling', userId: member.id });

			const response = await testServer
				.publicApiAgentFor(member)
				.post('/ai-preferences')
				.send({ content: 'Use British spelling', scope: 'user' });

			expect(response.statusCode).toBe(409);
			expect(response.body.message).toBe('This user already has a preference with the same text');
		});

		test('refuses a write once the scope holds the cap', async () => {
			for (let index = 0; index < AI_PREFERENCE_MAX_PER_SCOPE; index++) {
				await seed({ content: `rule ${index}`, userId: member.id });
			}

			const response = await testServer
				.publicApiAgentFor(member)
				.post('/ai-preferences')
				.send({ content: 'one more', scope: 'user' });

			expect(response.statusCode).toBe(400);
			expect(response.body.message).toBe(
				`A user cannot hold more than ${AI_PREFERENCE_MAX_PER_SCOPE} preferences`,
			);
		});

		test('refuses content over the length cap', async () => {
			const response = await testServer
				.publicApiAgentFor(member)
				.post('/ai-preferences')
				.send({ content: 'x'.repeat(AI_PREFERENCE_CONTENT_MAX_LENGTH + 1), scope: 'user' });

			expect(response.statusCode).toBe(400);
			expect(response.body.message).toContain(
				`content cannot be longer than ${AI_PREFERENCE_CONTENT_MAX_LENGTH} characters`,
			);
		});

		test.each(['aia', 'import'])('refuses a caller-supplied source of %s', async (source) => {
			const response = await testServer
				.publicApiAgentFor(member)
				.post('/ai-preferences')
				.send({ content: 'Short names', scope: 'user', source });

			expect(response.statusCode).toBe(400);
			expect(await repository().count()).toBe(0);
		});

		test('refuses an API key without the aiPreference:create scope', async () => {
			const caller = await createMemberWithApiKey({ scopes: ['aiPreference:list'] });

			const response = await testServer
				.publicApiAgentFor(caller)
				.post('/ai-preferences')
				.send({ content: 'Short names', scope: 'user' });

			expect(response.statusCode).toBe(403);
		});
	});

	describe('PUT /ai-preferences/:preferenceId', () => {
		test('replaces the text of a preference in place', async () => {
			const row = await seed({ content: 'old', projectId: editorProject.id });

			const response = await testServer
				.publicApiAgentFor(member)
				.put(`/ai-preferences/${row.id}`)
				.send({ content: 'new', scope: 'project', projectId: editorProject.id });

			expect(response.statusCode).toBe(200);
			expect(response.body).toMatchObject({
				id: row.id,
				content: 'new',
				scope: 'project',
				projectId: editorProject.id,
			});
		});

		test('moves a preference when the caller may write both targets', async () => {
			const row = await seed({ content: 'move me', userId: member.id });

			const response = await testServer
				.publicApiAgentFor(member)
				.put(`/ai-preferences/${row.id}`)
				.send({ content: 'move me', scope: 'project', projectId: editorProject.id });

			expect(response.statusCode).toBe(200);
			expect(response.body).toMatchObject({
				scope: 'project',
				userId: null,
				projectId: editorProject.id,
			});
		});

		test('refuses a body without a scope', async () => {
			const row = await seed({ content: 'stay', projectId: editorProject.id });

			const response = await testServer
				.publicApiAgentFor(member)
				.put(`/ai-preferences/${row.id}`)
				.send({ content: 'changed', projectId: editorProject.id });

			expect(response.statusCode).toBe(400);
			expect((await repository().findOneByOrFail({ id: row.id })).content).toBe('stay');
		});

		test('accepts the fields that a GET returns, without the server fields', async () => {
			const row = await seed({ content: 'round trip', userId: member.id });
			const fetched = await testServer.publicApiAgentFor(member).get(`/ai-preferences/${row.id}`);
			const { content, scope, userId, projectId } = fetched.body;

			const response = await testServer
				.publicApiAgentFor(member)
				.put(`/ai-preferences/${row.id}`)
				.send({ content: `${content} again`, scope, userId, projectId });

			expect(response.statusCode).toBe(200);
			expect(response.body).toMatchObject({ content: 'round trip again', scope: 'user' });
		});

		test("lets an admin edit another user's preference", async () => {
			const row = await seed({ content: 'old', userId: member.id });

			const response = await testServer
				.publicApiAgentFor(admin)
				.put(`/ai-preferences/${row.id}`)
				.send({ content: 'new', scope: 'user', userId: member.id });

			expect(response.statusCode).toBe(200);
			expect(response.body).toMatchObject({ content: 'new', userId: member.id });
		});

		test('refuses an edit of a row the caller may only read', async () => {
			const row = await seed({ content: 'read only', projectId: viewerProject.id });

			const response = await testServer
				.publicApiAgentFor(member)
				.put(`/ai-preferences/${row.id}`)
				.send({ content: 'changed', scope: 'project', projectId: viewerProject.id });

			expect(response.statusCode).toBe(403);
			expect((await repository().findOneByOrFail({ id: row.id })).content).toBe('read only');
		});

		test('answers 404 for a row the caller cannot see', async () => {
			const row = await seed({ content: 'hidden', userId: outsider.id });

			const response = await testServer
				.publicApiAgentFor(member)
				.put(`/ai-preferences/${row.id}`)
				.send({ content: 'changed', scope: 'user', userId: outsider.id });

			expect(response.statusCode).toBe(404);
		});

		test('answers 404 for a row that does not exist', async () => {
			const response = await testServer
				.publicApiAgentFor(member)
				.put(`/ai-preferences/${randomId()}`)
				.send({ content: 'changed', scope: 'user', userId: member.id });

			expect(response.statusCode).toBe(404);
		});

		test('refuses an id that is not a UUID', async () => {
			const response = await testServer
				.publicApiAgentFor(member)
				.put('/ai-preferences/not-a-uuid')
				.send({ content: 'changed', scope: 'user', userId: member.id });

			expect(response.statusCode).toBe(400);
		});

		test('refuses an edit that copies another row in the scope', async () => {
			await seed({ content: 'taken', userId: member.id });
			const row = await seed({ content: 'mine', userId: member.id });

			const response = await testServer
				.publicApiAgentFor(member)
				.put(`/ai-preferences/${row.id}`)
				.send({ content: 'taken', scope: 'user', userId: member.id });

			expect(response.statusCode).toBe(409);
		});

		test.each<ApiKeyScope[]>([
			['aiPreference:update'],
			['aiPreference:update', 'aiPreference:create'],
			['aiPreference:update', 'aiPreference:delete'],
		])('refuses a move with an API key that has only %j', async (...scopes) => {
			const caller = await createMemberWithApiKey({ scopes });
			await linkUserToProject(caller, editorProject, 'project:editor');
			const row = await seed({ content: 'stay', userId: caller.id });

			const response = await testServer
				.publicApiAgentFor(caller)
				.put(`/ai-preferences/${row.id}`)
				.send({ content: 'stay', scope: 'project', projectId: editorProject.id });

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toContain('aiPreference:create and aiPreference:delete');
			expect(await repository().findOneByOrFail({ id: row.id })).toMatchObject({
				userId: caller.id,
				projectId: null,
			});
		});

		test('lets an API key with only aiPreference:update edit in place', async () => {
			const caller = await createMemberWithApiKey({ scopes: ['aiPreference:update'] });
			const row = await seed({ content: 'old', userId: caller.id });

			const response = await testServer
				.publicApiAgentFor(caller)
				.put(`/ai-preferences/${row.id}`)
				.send({ content: 'new', scope: 'user', userId: caller.id });

			expect(response.statusCode).toBe(200);
			expect(response.body).toMatchObject({ content: 'new', userId: caller.id });
		});

		test('refuses an API key without the aiPreference:update scope', async () => {
			const caller = await createMemberWithApiKey({ scopes: ['aiPreference:list'] });
			const row = await seed({ content: 'mine', userId: caller.id });

			const response = await testServer
				.publicApiAgentFor(caller)
				.put(`/ai-preferences/${row.id}`)
				.send({ content: 'changed', scope: 'user', userId: caller.id });

			expect(response.statusCode).toBe(403);
		});
	});

	describe('DELETE /ai-preferences/:preferenceId', () => {
		test('deletes a personal preference', async () => {
			const row = await seed({ content: 'mine', userId: member.id });

			const response = await testServer
				.publicApiAgentFor(member)
				.delete(`/ai-preferences/${row.id}`);

			expect(response.statusCode).toBe(204);
			expect(await repository().existsBy({ id: row.id })).toBe(false);
		});

		test('lets an admin delete an instance preference, but not a member', async () => {
			const row = await seed({ content: 'instance' });

			const byMember = await testServer
				.publicApiAgentFor(member)
				.delete(`/ai-preferences/${row.id}`);

			expect(byMember.statusCode).toBe(403);
			expect(await repository().existsBy({ id: row.id })).toBe(true);

			const byAdmin = await testServer.publicApiAgentFor(admin).delete(`/ai-preferences/${row.id}`);

			expect(byAdmin.statusCode).toBe(204);
			expect(await repository().existsBy({ id: row.id })).toBe(false);
		});

		test("lets the owner delete a preference on a member's personal project", async () => {
			const personalProject = await getPersonalProject(member);
			const row = await seed({ content: 'personal project', projectId: personalProject.id });

			const response = await testServer
				.publicApiAgentFor(owner)
				.delete(`/ai-preferences/${row.id}`);

			expect(response.statusCode).toBe(204);
		});

		test('answers 404 for a row that does not exist', async () => {
			const response = await testServer
				.publicApiAgentFor(member)
				.delete(`/ai-preferences/${randomId()}`);

			expect(response.statusCode).toBe(404);
		});

		test('refuses an API key without the aiPreference:delete scope', async () => {
			const caller = await createMemberWithApiKey({ scopes: ['aiPreference:list'] });
			const row = await seed({ content: 'mine', userId: caller.id });

			const response = await testServer
				.publicApiAgentFor(caller)
				.delete(`/ai-preferences/${row.id}`);

			expect(response.statusCode).toBe(403);
			expect(await repository().existsBy({ id: row.id })).toBe(true);
		});
	});
});
