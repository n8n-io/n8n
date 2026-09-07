/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { getPersonalProject, testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { AppRepository } from '@/modules/apps/app.repository';
import { PageRepository } from '@/modules/apps/page.repository';
import { createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let ownerProject: Project;

const testServer = utils.setupTestServer({
	endpointGroups: ['apps'],
	modules: ['apps'],
});

let appRepository: AppRepository;
let pageRepository: PageRepository;

beforeAll(async () => {
	appRepository = Container.get(AppRepository);
	pageRepository = Container.get(PageRepository);

	owner = await createOwner();
	member = await createMember();

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);

	ownerProject = await getPersonalProject(owner);
});

beforeEach(async () => {
	await testDb.truncate(['App', 'Page']);
});

describe('POST /projects/:projectId/apps', () => {
	test('creates an app for a project member', async () => {
		const response = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps`)
			.send({ name: 'My App', namespace: 'my-app' })
			.expect(200);

		expect(response.body.data).toMatchObject({ name: 'My App', namespace: 'my-app' });
	});

	test('rejects a non-member with 403', async () => {
		await authMemberAgent
			.post(`/projects/${ownerProject.id}/apps`)
			.send({ name: 'My App', namespace: 'my-app' })
			.expect(403);
	});

	test('rejects a duplicate namespace in the same project with 409', async () => {
		await appRepository.createApp(ownerProject.id, 'First', 'dup');

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps`)
			.send({ name: 'Second', namespace: 'dup' })
			.expect(409);
	});
});

describe('GET /projects/:projectId/apps', () => {
	test('lists apps for a project member, 403 for a non-member', async () => {
		await appRepository.createApp(ownerProject.id, 'My App', 'my-app');

		const response = await authOwnerAgent.get(`/projects/${ownerProject.id}/apps`).expect(200);
		expect(response.body.data).toHaveLength(1);

		await authMemberAgent.get(`/projects/${ownerProject.id}/apps`).expect(403);
	});
});

describe('App pages', () => {
	test('creates a page and a nested child page under it', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');

		const rootResponse = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: 'home' })
			.expect(200);

		const childResponse = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: 'nested', parentPageId: rootResponse.body.data.id })
			.expect(200);

		expect(childResponse.body.data.parentPageId).toBe(rootResponse.body.data.id);

		const listResponse = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.expect(200);
		expect(listResponse.body.data).toHaveLength(2);
	});

	test('accepts an empty route, meaning this page is the index page for its level', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');

		const response = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: '' })
			.expect(200);

		expect(response.body.data.route).toBe('');
	});

	test('accepts a dynamic param segment, e.g. :id', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');

		const response = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: ':id' })
			.expect(200);

		expect(response.body.data.route).toBe(':id');
	});

	test('rejects creating a sub-page under an index page', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const indexPage = await pageRepository.createPage(app.id, null, '');

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: 'child', parentPageId: indexPage.id })
			.expect(400);
	});

	test('rejects turning a page with children into an index page', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const parent = await pageRepository.createPage(app.id, null, 'parent');
		await pageRepository.createPage(app.id, parent.id, 'child');

		await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/pages/${parent.id}`)
			.send({ route: '' })
			.expect(400);
	});

	test('rejects creating a page whose route collides with a sibling, at any level', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: 'foo' })
			.expect(200);

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: 'foo' })
			.expect(409);
	});

	test('rejects creating a second index page at the same level', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		await pageRepository.createPage(app.id, null, '');

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: '' })
			.expect(409);
	});

	test('allows the same route at different levels (different parents)', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const parentA = await pageRepository.createPage(app.id, null, 'a');
		const parentB = await pageRepository.createPage(app.id, null, 'b');

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: 'same', parentPageId: parentA.id })
			.expect(200);

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: 'same', parentPageId: parentB.id })
			.expect(200);
	});

	test('rejects renaming a page to collide with a sibling', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		await pageRepository.createPage(app.id, null, 'foo');
		const other = await pageRepository.createPage(app.id, null, 'bar');

		await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/pages/${other.id}`)
			.send({ route: 'foo' })
			.expect(409);
	});

	test('allows saving a page with its own current route unchanged', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const page = await pageRepository.createPage(app.id, null, 'foo');

		await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/pages/${page.id}`)
			.send({ route: 'foo' })
			.expect(200);
	});

	test('deleting an app deletes its pages', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		await pageRepository.createPage(app.id, null, 'home');

		await authOwnerAgent.delete(`/projects/${ownerProject.id}/apps/${app.id}`).expect(200);

		const remaining = await pageRepository.findManyByAppId(app.id);
		expect(remaining).toHaveLength(0);
	});

	test("rejects updating a page through a different app's URL", async () => {
		const appA = await appRepository.createApp(ownerProject.id, 'App A', 'app-a');
		const appB = await appRepository.createApp(ownerProject.id, 'App B', 'app-b');
		const page = await pageRepository.createPage(appA.id, null, 'foo');

		await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${appB.id}/pages/${page.id}`)
			.send({ route: 'moved' })
			.expect(404);
	});

	test("rejects deleting a page through a different app's URL, leaving it untouched", async () => {
		const appA = await appRepository.createApp(ownerProject.id, 'App A', 'app-a');
		const appB = await appRepository.createApp(ownerProject.id, 'App B', 'app-b');
		const page = await pageRepository.createPage(appA.id, null, 'foo');

		await authOwnerAgent
			.delete(`/projects/${ownerProject.id}/apps/${appB.id}/pages/${page.id}`)
			.expect(404);

		const remaining = await pageRepository.findManyByAppId(appA.id);
		expect(remaining).toHaveLength(1);
	});

	test('rejects creating a page whose parentPageId belongs to a different app', async () => {
		const appA = await appRepository.createApp(ownerProject.id, 'App A', 'app-a');
		const appB = await appRepository.createApp(ownerProject.id, 'App B', 'app-b');
		const pageInA = await pageRepository.createPage(appA.id, null, 'foo');

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${appB.id}/pages`)
			.send({ route: 'child', parentPageId: pageInA.id })
			.expect(404);
	});
});
