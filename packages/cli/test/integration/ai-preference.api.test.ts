import { AI_PREFERENCE_CONTENT_MAX_LENGTH } from '@n8n/api-types';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { AiPreferenceRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { AiPreferenceService } from '@/services/ai-preference.service';

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
	createdAt?: Date;
}) {
	const row = await repository().save(
		repository().create({
			id: crypto.randomUUID(),
			content: attributes.content,
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
			projectId: null,
			project: null,
			scopes: ['aiPreference:read', 'aiPreference:update', 'aiPreference:delete'],
		});
		expect(typeof response.body.data.createdAt).toBe('string');
		expect(typeof response.body.data.updatedAt).toBe('string');

		const stored = await repository().findByIdWithProject(response.body.data.id);
		expect(stored).toMatchObject({ content: 'Keep replies short.', userId: member.id });
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
		});
	});

	test('reports the scopes the author holds on the row it just created', async () => {
		const response = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'Marketing rule.', scope: 'project', projectId: project.id });

		expect(response.body.data.scopes).toEqual([
			'aiPreference:read',
			'aiPreference:update',
			'aiPreference:delete',
		]);
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

	test('refuses a preference aimed at a personal project', async () => {
		const personal = await getPersonalProject(member);

		// The owner of a personal project holds no project preference scope on it, so the
		// request never reaches the check that names the reason.
		const ownRequest = await memberAgent
			.post('/ai-preferences')
			.send({ content: 'Mine, really.', scope: 'project', projectId: personal.id });
		expect(ownRequest.statusCode).toBe(403);

		// An instance owner holds every project scope, so only the check stops them. A
		// preference on a personal project would reach one user, which the personal scope
		// already does.
		const ownerRequest = await ownerAgent
			.post('/ai-preferences')
			.send({ content: 'Yours, really.', scope: 'project', projectId: personal.id });
		expect(ownerRequest.statusCode).toBe(400);

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

	test('shows an owner every project row without listing every project id', async () => {
		await seed({ content: 'Marketing', projectId: project.id });
		await seed({ content: 'Someone else', userId: member.id });

		const response = await ownerAgent.get('/ai-preferences');

		expect(contentsOf(response)).toEqual(['Marketing']);
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
		await ownerAgent.post('/ai-preferences').send({ content: 'Everyone.', scope: 'instance' });
		await memberAgent.post('/ai-preferences').send({ content: 'Just me.', scope: 'user' });
		await memberAgent
			.post('/ai-preferences')
			.send({ content: 'Marketing rule.', scope: 'project', projectId: project.id });

		const applicable = await Container.get(AiPreferenceService).getApplicableAcrossProjects(member);

		expect(applicable).toEqual({
			instance: ['Everyone.'],
			user: ['Just me.'],
			projects: [{ id: project.id, name: 'Marketing', items: ['Marketing rule.'] }],
		});
	});
});
