import { AI_PREFERENCE_CONTENT_MAX_LENGTH, AI_PREFERENCE_MAX_PER_SCOPE } from '@n8n/api-types';
import type { AiPreferenceSource } from '@n8n/api-types';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { AiPreferenceRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { AiPreferenceService, renderAiPreferencesBlock } from '@/services/ai-preference.service';

import { createAdmin, createMember, createOwner } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

let owner: User;
let admin: User;
let member: User;
let outsider: User;

let ownerAgent: SuperAgentTest;
let adminAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;
let outsiderAgent: SuperAgentTest;

/** `member` is an editor here, `outsider` is not a member at all. */
let project: Project;
/** `member` may only read this one. */
let readOnlyProject: Project;

const testServer = utils.setupTestServer({ endpointGroups: ['ai-preferences'] });

beforeAll(async () => {
	owner = await createOwner();
	admin = await createAdmin();
	member = await createMember();
	outsider = await createMember();

	ownerAgent = testServer.authAgentFor(owner);
	adminAgent = testServer.authAgentFor(admin);
	memberAgent = testServer.authAgentFor(member);
	outsiderAgent = testServer.authAgentFor(outsider);

	project = await createTeamProject('Marketing');
	await linkUserToProject(member, project, 'project:editor');

	readOnlyProject = await createTeamProject('Sales');
	await linkUserToProject(member, readOnlyProject, 'project:viewer');
});

beforeEach(async () => {
	await testDb.truncate(['AiPreference']);
});

const repository = () => Container.get(AiPreferenceRepository);

async function seed(attributes: {
	content: string;
	userId?: string | null;
	projectId?: string | null;
	source?: AiPreferenceSource;
	createdAt?: Date;
}) {
	const row = await repository().save(
		repository().create({
			id: crypto.randomUUID(),
			content: attributes.content,
			// The column is NOT NULL and carries no default, so every write names a surface.
			source: attributes.source ?? 'ui',
			userId: attributes.userId ?? null,
			projectId: attributes.projectId ?? null,
		}),
	);
	// The timestamp columns carry millisecond precision, so rows seeded in one loop
	// tie. A test that asserts an order sets the value it means.
	if (attributes.createdAt) {
		await repository().update(row.id, { createdAt: attributes.createdAt });
	}
	return row;
}

function contentsOf(response: { body: { data: { data: Array<{ content: string }> } } }) {
	return response.body.data.data.map((row) => row.content);
}

describe('POST /ai-preferences', () => {
	test('saves a personal preference for any user', async () => {
		const response = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'Keep replies short.', scope: 'user' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({
			content: 'Keep replies short.',
			userId: member.id,
			user: { id: member.id, email: member.email },
			projectId: null,
			project: null,
			scopes: ['aiPreference:read', 'aiPreference:update', 'aiPreference:delete'],
		});
		expect(typeof response.body.data.createdAt).toBe('string');
		expect(typeof response.body.data.updatedAt).toBe('string');

		const stored = await repository().findByIdWithRelations(response.body.data.id);
		expect(stored).toMatchObject({ content: 'Keep replies short.', userId: member.id });
	});

	test('records the settings area as the surface that wrote the row', async () => {
		// The write path names the surface. A client cannot claim `aia` or `mcp` by
		// sending a source of its own (CONTEXT-137).
		const response = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'From settings.', scope: 'user', source: 'aia' });

		expect(response.body.data.source).toBe('ui');
		const stored = await repository().findOneByOrFail({ id: response.body.data.id });
		expect(stored.source).toBe('ui');
	});

	test('refuses a write once the scope holds the cap', async () => {
		const filler = Array.from({ length: AI_PREFERENCE_MAX_PER_SCOPE }, (_, index) => ({
			id: crypto.randomUUID(),
			content: `Rule ${index}.`,
			source: 'ui' as const,
			userId: outsider.id,
			projectId: null,
			createdById: outsider.id,
		}));
		await repository().insert(filler);

		const response = await outsiderAgent
			.post('/ai-preferences')
			.send({ content: 'One too many.', scope: 'user' });

		expect(response.statusCode).toBe(400);
		expect(await repository().countForTarget({ scope: 'user', userId: outsider.id })).toBe(
			AI_PREFERENCE_MAX_PER_SCOPE,
		);

		await repository().delete({ userId: outsider.id });
	});

	test("counts the target user's scope when an admin writes for somebody else", async () => {
		// The cap belongs to the scope, so a full scope refuses the admin too, and an admin
		// with an empty scope of their own can still write for themselves.
		const filler = Array.from({ length: AI_PREFERENCE_MAX_PER_SCOPE }, (_, index) => ({
			id: crypto.randomUUID(),
			content: `Rule ${index}.`,
			source: 'ui' as const,
			userId: member.id,
			projectId: null,
			createdById: member.id,
		}));
		await repository().insert(filler);

		const refused = await ownerAgent
			.post('/ai-preferences')
			.send({ content: 'One too many.', scope: 'user', userId: member.id });
		expect(refused.statusCode).toBe(400);
		expect(await repository().countForTarget({ scope: 'user', userId: member.id })).toBe(
			AI_PREFERENCE_MAX_PER_SCOPE,
		);

		const own = await ownerAgent
			.post('/ai-preferences')
			.send({ content: 'Mine alone.', scope: 'user' });
		expect(own.statusCode).toBe(200);

		await repository().delete({ userId: member.id });
		await repository().delete({ userId: owner.id });
	});

	test('records the author', async () => {
		const response = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'Mine.', scope: 'user' });

		const stored = await repository().findOneByOrFail({ id: response.body.data.id });
		expect(stored.createdById).toBe(member.id);
	});

	test('trims the content and refuses a blank preference', async () => {
		const saved = await memberAgent
			.post('/ai-preferences')
			.send({ content: '  Prefer sub-workflows.  ', scope: 'user' });
		expect(saved.body.data.content).toBe('Prefer sub-workflows.');

		// Blank content is skipped when the prompt block is built, so it would save and
		// never reach a prompt.
		for (const content of ['', '   ', '\n\t']) {
			const response = await memberAgent.post('/ai-preferences').send({ content, scope: 'user' });
			expect(response.statusCode).toBe(400);
		}
	});

	test('refuses content over the cap', async () => {
		const response = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'x'.repeat(AI_PREFERENCE_CONTENT_MAX_LENGTH + 1), scope: 'user' });

		expect(response.statusCode).toBe(400);
	});

	test('lets an owner and an admin save an instance preference', async () => {
		for (const agent of [ownerAgent, adminAgent]) {
			const response = await agent
				.post('/ai-preferences')
				.send({ content: 'Everyone.', scope: 'instance' });

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toMatchObject({ userId: null, projectId: null });
		}
	});

	test('refuses an instance preference from a member', async () => {
		const response = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'Everyone.', scope: 'instance' });

		expect(response.statusCode).toBe(403);
		expect(await repository().count()).toBe(0);
	});

	test('lets a project editor save a project preference', async () => {
		const response = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'Marketing rule.', scope: 'project', projectId: project.id });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({
			userId: null,
			projectId: project.id,
			project: { id: project.id, name: 'Marketing' },
			// An editor holds every write on it, so the row says so.
			scopes: ['aiPreference:read', 'aiPreference:update', 'aiPreference:delete'],
		});
	});

	test('refuses a project preference from a viewer and from a non-member', async () => {
		const viewer = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'Sales rule.', scope: 'project', projectId: readOnlyProject.id });
		expect(viewer.statusCode).toBe(403);

		const nonMember = await outsiderAgent
			.post('/ai-preferences')
			.send({ content: 'Marketing rule.', scope: 'project', projectId: project.id });
		expect(nonMember.statusCode).toBe(403);

		expect(await repository().count()).toBe(0);
	});

	test('refuses a project preference with no project id', async () => {
		const response = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'Which project?', scope: 'project' });

		expect(response.statusCode).toBe(400);
	});

	test('refuses a project id on a scope that has no project', async () => {
		// Dropping it quietly would save the preference somewhere the caller did not ask
		// for, so a client that names the wrong scope hears about it.
		for (const scope of ['user', 'instance'] as const) {
			const response = await ownerAgent
				.post('/ai-preferences')
				.send({ content: 'Somewhere.', scope, projectId: project.id });

			expect(response.statusCode).toBe(400);
		}

		expect(await repository().count()).toBe(0);
	});

	test('refuses a project id on a scope that has no project, on update too', async () => {
		const row = await seed({ content: 'Mine', userId: member.id });

		const response = await memberAgent
			.patch(`/ai-preferences/${row.id}`)
			.send({ content: 'Mine', scope: 'user', projectId: project.id });

		expect(response.statusCode).toBe(400);
		expect(await repository().findOneByOrFail({ id: row.id })).toMatchObject({
			userId: member.id,
			projectId: null,
		});
	});

	test("lets a user and an admin save a preference on the user's personal project", async () => {
		const personal = await getPersonalProject(member);

		// Unlike a user preference, which follows the user everywhere, this one applies
		// only when the personal project is in scope.
		const ownRequest = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'Mine, here.', scope: 'project', projectId: personal.id });
		expect(ownRequest.statusCode).toBe(200);
		expect(ownRequest.body.data).toMatchObject({
			userId: null,
			projectId: personal.id,
			project: { id: personal.id, type: 'personal' },
			scopes: ['aiPreference:read', 'aiPreference:update', 'aiPreference:delete'],
		});

		const adminRequest = await adminAgent
			.post('/ai-preferences')
			.send({ content: 'Yours, here.', scope: 'project', projectId: personal.id });
		expect(adminRequest.statusCode).toBe(200);

		expect(await repository().count()).toBe(2);
	});

	test("refuses a preference on another member's personal project", async () => {
		const personal = await getPersonalProject(outsider);

		const response = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'Yours, really.', scope: 'project', projectId: personal.id });

		expect(response.statusCode).toBe(403);
		expect(await repository().count()).toBe(0);
	});

	test('lets an admin save a preference for another user, but not a member', async () => {
		const adminRequest = await adminAgent
			.post('/ai-preferences')
			.send({ content: 'For you.', scope: 'user', userId: member.id });
		expect(adminRequest.statusCode).toBe(200);
		expect(adminRequest.body.data).toMatchObject({
			userId: member.id,
			user: { id: member.id, email: member.email },
		});

		const memberRequest = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'For you.', scope: 'user', userId: outsider.id });
		expect(memberRequest.statusCode).toBe(403);

		const unknownUser = await adminAgent
			.post('/ai-preferences')
			.send({ content: 'For nobody.', scope: 'user', userId: crypto.randomUUID() });
		expect(unknownUser.statusCode).toBe(400);

		// A malformed id is refused by validation, before any database lookup.
		const malformedUser = await adminAgent
			.post('/ai-preferences')
			.send({ content: 'For nobody.', scope: 'user', userId: 'not-a-uuid' });
		expect(malformedUser.statusCode).toBe(400);

		expect(await repository().count()).toBe(1);
	});

	test('refuses a user id on a scope that has no user', async () => {
		const response = await ownerAgent
			.post('/ai-preferences')
			.send({ content: 'Everyone.', scope: 'instance', userId: member.id });

		expect(response.statusCode).toBe(400);
		expect(await repository().count()).toBe(0);
	});
});

describe('GET /ai-preferences', () => {
	test('returns the instance rows, the caller rows and the rows of readable projects', async () => {
		await seed({ content: 'Instance' });
		await seed({ content: 'Mine', userId: member.id });
		await seed({ content: 'Someone else', userId: outsider.id });
		await seed({ content: 'Marketing', projectId: project.id });
		await seed({ content: 'Sales', projectId: readOnlyProject.id });

		const response = await memberAgent.get('/ai-preferences');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.count).toBe(4);
		expect(contentsOf(response).sort()).toEqual(['Instance', 'Marketing', 'Mine', 'Sales']);
	});

	test('returns the rows oldest first, the order they reach a prompt in', async () => {
		await seed({ content: 'third', userId: member.id, createdAt: new Date('2026-03-01') });
		await seed({ content: 'first', userId: member.id, createdAt: new Date('2026-01-01') });
		await seed({ content: 'second', userId: member.id, createdAt: new Date('2026-02-01') });

		const response = await memberAgent.get('/ai-preferences');

		expect(contentsOf(response)).toEqual(['first', 'second', 'third']);
	});

	test('hides the rows of a project the caller is not a member of', async () => {
		await seed({ content: 'Marketing', projectId: project.id });

		const response = await outsiderAgent.get('/ai-preferences');

		expect(response.body.data.count).toBe(0);
	});

	test("includes the caller's personal project rows, and not another member's", async () => {
		await seed({ content: 'Mine, here', projectId: (await getPersonalProject(member)).id });
		await seed({ content: 'Theirs, there', projectId: (await getPersonalProject(outsider)).id });

		const response = await memberAgent.get('/ai-preferences');

		expect(contentsOf(response)).toEqual(['Mine, here']);
	});

	test('shows an owner every project row and every user row, and names their owners', async () => {
		await seed({ content: 'Marketing', projectId: project.id });
		await seed({ content: 'Someone else', userId: member.id });
		await seed({ content: 'Theirs, there', projectId: (await getPersonalProject(outsider)).id });

		const response = await ownerAgent.get('/ai-preferences');
		const rows: Array<{ content: string; user: { id: string } | null; project: unknown }> =
			response.body.data.data;

		expect(rows.map((row) => row.content).sort()).toEqual([
			'Marketing',
			'Someone else',
			'Theirs, there',
		]);
		expect(rows.find((row) => row.content === 'Someone else')?.user).toMatchObject({
			id: member.id,
			email: member.email,
		});
		expect(rows.find((row) => row.content === 'Theirs, there')?.project).toMatchObject({
			type: 'personal',
		});
	});

	test("lets an admin update and delete another user's row", async () => {
		await seed({ content: 'Someone else', userId: member.id });

		const response = await adminAgent.get('/ai-preferences');

		expect(response.body.data.data[0].scopes).toEqual([
			'aiPreference:read',
			'aiPreference:update',
			'aiPreference:delete',
		]);
	});

	test('reports what the caller may do to each row', async () => {
		await seed({ content: 'Instance' });
		await seed({ content: 'Mine', userId: member.id });
		await seed({ content: 'Marketing', projectId: project.id });
		await seed({ content: 'Sales', projectId: readOnlyProject.id });

		const response = await memberAgent.get('/ai-preferences');
		const scopesByContent = Object.fromEntries(
			response.body.data.data.map((row: { content: string; scopes: string[] }) => [
				row.content,
				row.scopes,
			]),
		);

		expect(scopesByContent.Instance).toEqual(['aiPreference:read']);
		expect(scopesByContent.Sales).toEqual(['aiPreference:read']);
		expect(scopesByContent.Mine).toEqual([
			'aiPreference:read',
			'aiPreference:update',
			'aiPreference:delete',
		]);
		expect(scopesByContent.Marketing).toEqual([
			'aiPreference:read',
			'aiPreference:update',
			'aiPreference:delete',
		]);
	});

	test('refuses a page of no rows, which would read the whole collection', async () => {
		await seed({ content: 'Mine', userId: member.id });

		const response = await memberAgent.get('/ai-preferences').query({ skip: 0, take: 0 });

		expect(response.statusCode).toBe(400);
	});

	test('pages the rows and keeps the total', async () => {
		for (const content of ['one', 'two', 'three']) {
			await seed({ content, userId: member.id });
		}

		const whole = await memberAgent.get('/ai-preferences');
		const pages = await Promise.all(
			[0, 1, 2].map(
				async (skip) => await memberAgent.get('/ai-preferences').query({ skip, take: 1 }),
			),
		);

		// Each page must cut the same list in the same place, so paging never repeats a
		// row or drops one. Rows seeded in one loop share a timestamp, so the assertion
		// reads the order back rather than assuming the seeding order.
		for (const page of pages) {
			expect(page.body.data.count).toBe(3);
			expect(page.body.data.data).toHaveLength(1);
		}
		expect(pages.flatMap(contentsOf)).toEqual(contentsOf(whole));
	});
});

describe('GET /ai-preferences/count', () => {
	test('returns the size of the list the caller would see, without rows', async () => {
		await seed({ content: 'Instance' });
		await seed({ content: 'Mine', userId: member.id });
		await seed({ content: 'Someone else', userId: outsider.id });
		await seed({ content: 'Marketing', projectId: project.id });

		const asMember = await memberAgent.get('/ai-preferences/count');
		const asOwner = await ownerAgent.get('/ai-preferences/count');

		expect(asMember.statusCode).toBe(200);
		expect(asMember.body.data).toEqual({ count: 3 });
		expect(asOwner.body.data).toEqual({ count: 4 });
	});
});

describe('PATCH /ai-preferences/:id', () => {
	test('replaces the content of a personal preference', async () => {
		const row = await seed({ content: 'Old', userId: member.id });

		const response = await memberAgent
			.patch(`/ai-preferences/${row.id}`)
			.send({ content: 'New', scope: 'user' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data.content).toBe('New');
		expect((await repository().findOneByOrFail({ id: row.id })).content).toBe('New');
	});

	test('keeps the surface that created the row, whatever the edit says', async () => {
		const created = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'From settings.', scope: 'user' });

		// A body carrying a surface is ignored on an edit as it is on a create, so an
		// assistant edit of a person's row never relabels it.
		const response = await memberAgent
			.patch(`/ai-preferences/${created.body.data.id}`)
			.send({ content: 'Edited.', scope: 'user', source: 'aia' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data.source).toBe('ui');
		expect((await repository().findOneByOrFail({ id: created.body.data.id })).source).toBe('ui');
	});

	test('carries the surface through a move between scopes', async () => {
		const row = await seed({ content: 'Written by a client.', userId: member.id, source: 'mcp' });

		const response = await memberAgent
			.patch(`/ai-preferences/${row.id}`)
			.send({ content: 'Written by a client.', scope: 'project', projectId: project.id });

		expect(response.statusCode).toBe(200);
		expect(response.body.data.source).toBe('mcp');
		expect((await repository().findOneByOrFail({ id: row.id })).source).toBe('mcp');
	});

	test('moves a preference when the caller may write both targets', async () => {
		const row = await seed({ content: 'Mine', userId: member.id });

		const response = await memberAgent
			.patch(`/ai-preferences/${row.id}`)
			.send({ content: 'Mine', scope: 'project', projectId: project.id });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({ userId: null, projectId: project.id });
		expect(await repository().findOneByOrFail({ id: row.id })).toMatchObject({
			userId: null,
			projectId: project.id,
		});
	});

	test('moves a preference back off a project', async () => {
		const row = await seed({ content: 'Marketing', projectId: project.id });

		const response = await memberAgent
			.patch(`/ai-preferences/${row.id}`)
			.send({ content: 'Marketing', scope: 'user' });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({ userId: member.id, projectId: null });
		expect(await repository().findOneByOrFail({ id: row.id })).toMatchObject({
			userId: member.id,
			projectId: null,
		});
	});

	test('refuses a move to a target the caller may not write', async () => {
		const row = await seed({ content: 'Mine', userId: member.id });

		const response = await memberAgent
			.patch(`/ai-preferences/${row.id}`)
			.send({ content: 'Mine', scope: 'instance' });

		expect(response.statusCode).toBe(403);
		expect((await repository().findOneByOrFail({ id: row.id })).userId).toBe(member.id);
	});

	test('refuses an edit of a row the caller may only read', async () => {
		const row = await seed({ content: 'Instance', userId: null, projectId: null });

		const response = await memberAgent
			.patch(`/ai-preferences/${row.id}`)
			.send({ content: 'Hijacked', scope: 'instance' });

		expect(response.statusCode).toBe(403);
		expect((await repository().findOneByOrFail({ id: row.id })).content).toBe('Instance');
	});

	test('hides a row the caller cannot see', async () => {
		const row = await seed({ content: 'Someone else', userId: outsider.id });

		const response = await memberAgent
			.patch(`/ai-preferences/${row.id}`)
			.send({ content: 'Hijacked', scope: 'user' });

		expect(response.statusCode).toBe(404);
		expect((await repository().findOneByOrFail({ id: row.id })).content).toBe('Someone else');
	});

	test("lets an admin edit another user's preference and keep its owner", async () => {
		const row = await seed({ content: 'Old', userId: member.id });

		const response = await adminAgent
			.patch(`/ai-preferences/${row.id}`)
			.send({ content: 'New', scope: 'user', userId: member.id });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({
			content: 'New',
			userId: member.id,
			user: { id: member.id },
		});
		expect(await repository().findOneByOrFail({ id: row.id })).toMatchObject({
			content: 'New',
			userId: member.id,
		});
	});

	test("moves another user's preference to the admin when no user is named", async () => {
		// The owner is explicit on the wire. A request without one means the caller.
		const row = await seed({ content: 'Theirs', userId: member.id });

		const response = await adminAgent
			.patch(`/ai-preferences/${row.id}`)
			.send({ content: 'Theirs', scope: 'user' });

		expect(response.statusCode).toBe(200);
		expect((await repository().findOneByOrFail({ id: row.id })).userId).toBe(admin.id);
	});

	test('refuses a move into a project the caller may only read, even with update rights on the row', async () => {
		// A move creates the row in the new place, so it needs the create right there.
		const row = await seed({ content: 'Mine', userId: member.id });

		const response = await memberAgent
			.patch(`/ai-preferences/${row.id}`)
			.send({ content: 'Mine', scope: 'project', projectId: readOnlyProject.id });

		expect(response.statusCode).toBe(403);
		expect((await repository().findOneByOrFail({ id: row.id })).userId).toBe(member.id);
	});
});

describe('DELETE /ai-preferences/:id', () => {
	test('removes a personal preference', async () => {
		const row = await seed({ content: 'Mine', userId: member.id });

		const response = await memberAgent.delete(`/ai-preferences/${row.id}`);

		expect(response.statusCode).toBe(200);
		expect(await repository().count()).toBe(0);
	});

	test('removes a project preference for an editor', async () => {
		const row = await seed({ content: 'Marketing', projectId: project.id });

		const response = await memberAgent.delete(`/ai-preferences/${row.id}`);

		expect(response.statusCode).toBe(200);
		expect(await repository().count()).toBe(0);
	});

	test('refuses to remove a row the caller may only read', async () => {
		const instanceRow = await seed({ content: 'Instance' });
		const salesRow = await seed({ content: 'Sales', projectId: readOnlyProject.id });

		expect((await memberAgent.delete(`/ai-preferences/${instanceRow.id}`)).statusCode).toBe(403);
		expect((await memberAgent.delete(`/ai-preferences/${salesRow.id}`)).statusCode).toBe(403);
		expect(await repository().count()).toBe(2);
	});

	test('hides a row the caller cannot see', async () => {
		const row = await seed({ content: 'Someone else', userId: outsider.id });

		expect((await memberAgent.delete(`/ai-preferences/${row.id}`)).statusCode).toBe(404);
		expect(await repository().count()).toBe(1);
	});
});

describe('the preferences a write produces', () => {
	test('reach the block the AI surfaces inject', async () => {
		const instance = await ownerAgent
			.post('/ai-preferences')
			.send({ content: 'Everyone.', scope: 'instance' });
		const mine = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'Just me.', scope: 'user' });
		const marketing = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'Marketing rule.', scope: 'project', projectId: project.id });

		const applicable = await Container.get(AiPreferenceService).getApplicableAcrossProjects(member);

		// The id of the row the write created, not just some id: an edit addresses this value.
		expect(applicable).toEqual({
			instance: [{ id: instance.body.data.id, content: 'Everyone.' }],
			user: [{ id: mine.body.data.id, content: 'Just me.' }],
			projects: [
				{
					id: project.id,
					name: 'Marketing',
					type: 'team',
					items: [{ id: marketing.body.data.id, content: 'Marketing rule.' }],
				},
			],
		});
	});

	test('keep two preferences with the same text apart by id', async () => {
		// A remint or a conflation of ids is invisible when the text is unique, and the assistant
		// edits by id, so the same sentence saved twice has to stay two addressable rows.
		const first = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'Keep replies short.', scope: 'user' });
		const second = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'Keep replies short.', scope: 'user' });

		expect(second.body.data.id).not.toBe(first.body.data.id);

		const applicable = await Container.get(AiPreferenceService).getApplicable(member.id, []);

		// Ids, not order: two writes inside one millisecond tie on `createdAt` and the query
		// falls back to `id ASC`, which is a random uuid. Order is covered where it is seeded,
		// in `ai-preference.repository.test.ts` and in the `GET /ai-preferences` block above.
		expect(applicable.user).toHaveLength(2);
		expect(applicable.user.map((item) => item.id).sort()).toEqual(
			[first.body.data.id, second.body.data.id].sort(),
		);
		expect(applicable.user.every((item) => item.content === 'Keep replies short.')).toBe(true);
	});

	test('reach the block only when the personal project is in scope', async () => {
		const personal = await getPersonalProject(member);
		await memberAgent
			.post('/ai-preferences')
			.send({ content: 'Only here.', scope: 'project', projectId: personal.id });
		const service = Container.get(AiPreferenceService);

		// A thread bound to a team project does not see it; one bound to the personal
		// project does, and the block folds it into the personal group instead of naming its owner.
		const inTeamProject = await service.getApplicable(member.id, [
			{ id: project.id, name: project.name, type: 'team' },
		]);
		expect(inTeamProject.projects).toEqual([]);

		const inPersonalProject = await service.getApplicable(member.id, [
			{ id: personal.id, name: personal.name, type: 'personal' },
		]);
		expect(inPersonalProject.projects).toEqual([
			{
				id: personal.id,
				name: personal.name,
				type: 'personal',
				items: [{ id: expect.any(String), content: 'Only here.' }],
			},
		]);
		const block = renderAiPreferencesBlock(inPersonalProject);
		expect(block).toContain('Personal preferences:\n- Only here.');
		expect(block).not.toContain(personal.name);
	});
});
