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
	await testDb.truncate(['App', 'AppVersion', 'Page']);
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

	test('rejects a namespace another project already uses with 409', async () => {
		const memberProject = await getPersonalProject(member);
		await appRepository.createApp(memberProject.id, 'First', 'dup');

		// A namespace is the whole public URL of an App (`/apps/dup`), which carries
		// no project, so it has to be unique instance-wide.
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

describe('GET /projects/:projectId/apps/:appId', () => {
	test('reports no active version and no publishedAt before publishing', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}`)
			.expect(200);

		expect(response.body.data.activeVersionId).toBeNull();
		expect(response.body.data.publishedAt).toBeNull();
	});

	test('reports the active version and its publishedAt after publishing', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		await pageRepository.createPage(app.id, null, '');

		const publishResponse = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/publish`)
			.expect(200);

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}`)
			.expect(200);

		expect(response.body.data.activeVersionId).toBe(publishResponse.body.data.versionId);
		expect(response.body.data.publishedAt).not.toBeNull();
	});
});

describe('POST /projects/:projectId/apps/:appId/publish', () => {
	test('publishes a snapshot of the draft pages and activates it', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		await pageRepository.createPage(app.id, null, '');

		const response = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/publish`)
			.expect(200);

		expect(response.body.data.versionId).toBeDefined();
		expect(response.body.data.url).toBe('/apps/my-app');
	});

	test('rejects publishing when a draft page has invalid content, with the zod issues', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const page = await pageRepository.createPage(app.id, null, '');
		await pageRepository.updatePage(page, {
			content: [{ id: 'b1', type: 'not-a-type', data: {} }],
		});

		const response = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/publish`)
			.expect(400);

		expect(response.body.meta.pages).toEqual([expect.objectContaining({ pageId: page.id })]);
	});

	test('rejects a non-member with 403', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');

		await authMemberAgent.post(`/projects/${ownerProject.id}/apps/${app.id}/publish`).expect(403);
	});
});

describe('GET /projects/:projectId/apps/:appId/versions and activate', () => {
	test('lists versions newest first and marks the active one', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		await pageRepository.createPage(app.id, null, '');

		const first = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/publish`)
			.expect(200);
		const second = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/publish`)
			.expect(200);

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/versions`)
			.expect(200);

		expect(response.body.data).toEqual([
			expect.objectContaining({ id: second.body.data.versionId, active: true }),
			expect.objectContaining({ id: first.body.data.versionId, active: false }),
		]);
	});

	test('activating an older version rolls back which one is active', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		await pageRepository.createPage(app.id, null, '');

		const first = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/publish`)
			.expect(200);
		await authOwnerAgent.post(`/projects/${ownerProject.id}/apps/${app.id}/publish`).expect(200);

		await authOwnerAgent
			.post(
				`/projects/${ownerProject.id}/apps/${app.id}/versions/${first.body.data.versionId}/activate`,
			)
			.expect(200);

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}`)
			.expect(200);
		expect(response.body.data.activeVersionId).toBe(first.body.data.versionId);
	});

	test('activating an unknown version answers 404', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/versions/does-not-exist/activate`)
			.expect(404);
	});
});

describe('GET /projects/:projectId/apps/:appId/pages/:pageId/preview', () => {
	test('renders the draft content even when unpublished', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const page = await pageRepository.createPage(app.id, null, '');
		await pageRepository.updatePage(page, {
			content: [{ id: 'h1', type: 'header', data: { text: 'Draft heading', level: 1 } }],
		});

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/pages/${page.id}/preview`)
			.expect(200);

		expect(response.headers['content-type']).toContain('text/html');
		expect(response.text).toContain('Draft heading');
		expect(response.headers['x-n8n-app-render-errors']).toBeUndefined();
	});

	test('reports a block that fails to render in a header and leaves it out of the html', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const page = await pageRepository.createPage(app.id, null, '');
		await pageRepository.updatePage(page, {
			content: [
				{ id: 'broken', type: 'html', data: { template: '{{#if}}' } },
				{ id: 'h1', type: 'header', data: { text: 'Still here', level: 1 } },
			],
		});

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/pages/${page.id}/preview`)
			.expect(200);

		const errors = JSON.parse(response.headers['x-n8n-app-render-errors']);
		expect(Object.keys(errors)).toEqual(['broken']);
		expect(errors.broken).toMatch(/Parse error/);
		expect(errors.broken).not.toMatch(/\nat /);
		expect(response.text).toContain('Still here');
		expect(response.text).not.toContain('Parse error');
	});

	test('fills a dynamic segment from ?params= into the interpolated content', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const page = await pageRepository.createPage(app.id, null, ':id');
		await pageRepository.updatePage(page, {
			content: [{ id: 'p1', type: 'paragraph', data: { text: 'Client {{ params.id }}' } }],
		});

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/pages/${page.id}/preview`)
			.query({ params: JSON.stringify({ id: '42' }) })
			.expect(200);

		expect(response.text).toContain('Client 42');
	});

	test('rejects a non-member with 403', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const page = await pageRepository.createPage(app.id, null, '');

		await authMemberAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/pages/${page.id}/preview`)
			.expect(403);
	});
});

describe('Page layouts', () => {
	const slot = { id: 'slot', type: 'slot', data: {} };
	const banner = { id: 'banner', type: 'header', data: { text: 'Banner', level: 2 } };

	test('PATCH stores a layout and null resets it to inherit', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const page = await pageRepository.createPage(app.id, null, '');

		const response = await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/pages/${page.id}`)
			.send({ layout: [banner, slot] })
			.expect(200);
		expect(response.body.data.layout).toEqual([banner, slot]);

		const reset = await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/pages/${page.id}`)
			.send({ layout: null })
			.expect(200);
		expect(reset.body.data.layout).toBeNull();
	});

	test('PATCH rejects a layout without a slot', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const page = await pageRepository.createPage(app.id, null, '');

		await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/pages/${page.id}`)
			.send({ layout: [banner] })
			.expect(400);
	});

	test('GET layout-preview returns the inherited layout, sanitized, with an empty slot', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const parent = await pageRepository.createPage(app.id, null, 'clients');
		await pageRepository.updatePage(parent, {
			layout: [
				{
					id: 'menu',
					type: 'html',
					data: { template: '<nav>Menu</nav><script>alert(1)</script>' },
				},
				slot,
			],
		});
		const child = await pageRepository.createPage(app.id, parent.id, 'orders', [
			{ id: 'h1', type: 'header', data: { text: 'Orders', level: 1 } },
		]);

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/pages/${child.id}/layout-preview`)
			.expect(200);

		expect(response.body.data.ownerPageId).toBe(parent.id);
		expect(response.body.data.html).toContain('data-block-id="menu"');
		expect(response.body.data.html).toContain('<nav>Menu</nav>');
		expect(response.body.data.html).toContain('<main class="app-main" data-app-slot></main>');
		expect(response.body.data.html).not.toContain('script');
		expect(response.body.data.html).not.toContain('Orders');
		expect(response.body.data.errors).toEqual({});
	});

	test('GET layout-preview reports a layout block that fails to render', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const page = await pageRepository.createPage(app.id, null, '');
		await pageRepository.updatePage(page, {
			layout: [{ id: 'menu', type: 'html', data: { template: '{{#if}}' } }, slot],
		});

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/pages/${page.id}/layout-preview`)
			.expect(200);

		expect(Object.keys(response.body.data.errors)).toEqual(['menu']);
		expect(response.body.data.html).toContain('data-block-id="menu"');
	});

	test('GET layout-preview returns nulls for the built-in shell', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const page = await pageRepository.createPage(app.id, null, '');

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/pages/${page.id}/layout-preview`)
			.expect(200);

		expect(response.body.data).toEqual({ ownerPageId: null, html: null, errors: {} });
	});

	test('GET layout-preview rejects a non-member with 403', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const page = await pageRepository.createPage(app.id, null, '');

		await authMemberAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/pages/${page.id}/layout-preview`)
			.expect(403);
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

	test('stores the content given at creation', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const content = [{ id: 'h1', type: 'header', data: { text: 'Submissions', level: 1 } }];

		const response = await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: 'submissions', content })
			.expect(200);
		expect(response.body.data.content).toEqual(content);

		const listResponse = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.expect(200);
		expect(listResponse.body.data[0].content).toEqual(content);
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

	test('rejects creating an index page under another page', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const parent = await pageRepository.createPage(app.id, null, 'parent');

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/pages`)
			.send({ route: '', parentPageId: parent.id })
			.expect(400);
	});

	test('rejects turning a sub-page into an index page', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'My App', 'my-app');
		const parent = await pageRepository.createPage(app.id, null, 'parent');
		const child = await pageRepository.createPage(app.id, parent.id, 'child');

		await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/pages/${child.id}`)
			.send({ route: '' })
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
