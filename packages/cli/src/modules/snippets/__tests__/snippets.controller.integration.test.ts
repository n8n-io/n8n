import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { CacheService } from '@/services/cache/cache.service';
import { createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

import { SnippetsService } from '../snippets.service';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let teamProject: Project;

const testServer = utils.setupTestServer({
	endpointGroups: ['snippets'],
	modules: ['snippets'],
});

beforeAll(async () => {
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate(['Snippet', 'Project', 'ProjectRelation']);
	await Container.get(CacheService).delete('snippets');

	owner = await createOwner();
	member = await createMember();
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
	teamProject = await createTeamProject('test project', owner);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('POST /snippets', () => {
	test('creates a global snippet', async () => {
		const response = await authOwnerAgent
			.post('/snippets')
			.send({ name: 'double', code: '(n) => n * 2', description: 'doubles a number' })
			.expect(200);

		expect(response.body.data.name).toBe('double');
		expect(response.body.data.projectId).toBeNull();
	});

	test('creates a project-scoped snippet', async () => {
		const response = await authOwnerAgent
			.post('/snippets')
			.send({ name: 'greet', code: '(s) => "hi " + s', projectId: teamProject.id })
			.expect(200);

		expect(response.body.data.projectId).toBe(teamProject.id);
	});

	test('rejects code that is not a single expression', async () => {
		await authOwnerAgent
			.post('/snippets')
			.send({ name: 'bad', code: 'function f() {}' })
			.expect(400);

		await authOwnerAgent.post('/snippets').send({ name: 'bad', code: 'const x = 1' }).expect(400);
	});

	test('rejects invalid and reserved names', async () => {
		await authOwnerAgent.post('/snippets').send({ name: '1bad', code: '(n) => n' }).expect(400);

		await authOwnerAgent
			.post('/snippets')
			.send({ name: 'constructor', code: '(n) => n' })
			.expect(400);
	});

	test('rejects duplicate names in the same scope', async () => {
		await authOwnerAgent.post('/snippets').send({ name: 'dupe', code: '1' }).expect(200);
		await authOwnerAgent.post('/snippets').send({ name: 'dupe', code: '2' }).expect(400);

		// Same name in a project scope is fine
		await authOwnerAgent
			.post('/snippets')
			.send({ name: 'dupe', code: '3', projectId: teamProject.id })
			.expect(200);
	});

	test('stores unit tests and validates their code', async () => {
		const response = await authOwnerAgent
			.post('/snippets')
			.send({
				name: 'double',
				code: '(n) => n * 2',
				tests: [
					{ code: '$snippets.double(2)', expected: '4' },
					{ code: '$snippets.double(3)', expected: '6' },
				],
			})
			.expect(200);
		expect(response.body.data.tests).toEqual([
			{ code: '$snippets.double(2)', expected: '4' },
			{ code: '$snippets.double(3)', expected: '6' },
		]);

		await authOwnerAgent
			.post('/snippets')
			.send({
				name: 'other',
				code: '1',
				tests: [{ code: 'const x = 1', expected: '1' }],
			})
			.expect(400);

		await authOwnerAgent
			.post('/snippets')
			.send({
				name: 'other2',
				code: '1',
				tests: [{ code: '1', expected: 'const x = 1' }],
			})
			.expect(400);

		// The expected value is required
		await authOwnerAgent
			.post('/snippets')
			.send({
				name: 'other3',
				code: '1',
				tests: [{ code: '$snippets.double(2)' }],
			})
			.expect(400);
	});

	test('forbids members from creating global snippets', async () => {
		await authMemberAgent.post('/snippets').send({ name: 'nope', code: '1' }).expect(403);
	});

	test('allows project editors to create project snippets', async () => {
		await linkUserToProject(member, teamProject, 'project:editor');

		await authMemberAgent
			.post('/snippets')
			.send({ name: 'projectFn', code: '(n) => n', projectId: teamProject.id })
			.expect(200);
	});
});

describe('GET /snippets', () => {
	test('lists global snippets for members, hides inaccessible project snippets', async () => {
		await authOwnerAgent.post('/snippets').send({ name: 'globalFn', code: '1' }).expect(200);
		await authOwnerAgent
			.post('/snippets')
			.send({ name: 'projectFn', code: '2', projectId: teamProject.id })
			.expect(200);

		const response = await authMemberAgent.get('/snippets').expect(200);
		const names = response.body.data.map((snippet: { name: string }) => snippet.name);
		expect(names).toEqual(['globalFn']);

		const ownerResponse = await authOwnerAgent.get('/snippets').expect(200);
		expect(ownerResponse.body.data).toHaveLength(2);
	});
});

describe('PATCH /snippets/:id', () => {
	test('updates code and validates it', async () => {
		const created = await authOwnerAgent
			.post('/snippets')
			.send({ name: 'fn', code: '(n) => n' })
			.expect(200);
		const id = created.body.data.id;

		await authOwnerAgent.patch(`/snippets/${id}`).send({ code: '(n) => n + 1' }).expect(200);
		await authOwnerAgent.patch(`/snippets/${id}`).send({ code: '(n =>' }).expect(400);
	});

	test('forbids members from updating global snippets', async () => {
		const created = await authOwnerAgent
			.post('/snippets')
			.send({ name: 'fn', code: '1' })
			.expect(200);

		await authMemberAgent
			.patch(`/snippets/${created.body.data.id}`)
			.send({ code: '2' })
			.expect(403);
	});
});

describe('DELETE /snippets/:id', () => {
	test('deletes a snippet', async () => {
		const created = await authOwnerAgent
			.post('/snippets')
			.send({ name: 'fn', code: '1' })
			.expect(200);

		await authOwnerAgent.delete(`/snippets/${created.body.data.id}`).expect(200);

		const response = await authOwnerAgent.get('/snippets').expect(200);
		expect(response.body.data).toHaveLength(0);
	});
});

describe('getSourcesForExecution', () => {
	test('resolves global and project sources by project id', async () => {
		await authOwnerAgent.post('/snippets').send({ name: 'globalFn', code: '1' }).expect(200);
		await authOwnerAgent
			.post('/snippets')
			.send({ name: 'projectFn', code: '2', projectId: teamProject.id })
			.expect(200);

		const service = Container.get(SnippetsService);

		const withProject = await service.getSourcesForExecution(undefined, teamProject.id);
		expect(withProject).toEqual({ global: { globalFn: '1' }, project: { projectFn: '2' } });

		const withoutProject = await service.getSourcesForExecution();
		expect(withoutProject).toEqual({ global: { globalFn: '1' }, project: {} });
	});
});
