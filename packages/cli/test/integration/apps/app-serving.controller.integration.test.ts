import { getPersonalProject, testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { gzipSync } from 'node:zlib';
import { Header } from 'tar';

import { AppVersionService } from '@/modules/apps/app-version.service';
import { AppRepository } from '@/modules/apps/app.repository';
import { PageRepository } from '@/modules/apps/page.repository';
import { AppPageTokenService } from '@/modules/apps/serving/app-page-token';
import { createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let owner: User;
let ownerProject: Project;
/** No auth and no `/rest` prefix: an App page is served at the instance root, to anyone. */
let visitor: SuperAgentTest;

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
	ownerProject = await getPersonalProject(owner);
	visitor = testServer.restlessAgent;
});

beforeEach(async () => {
	await testDb.truncate(['App', 'Page']);
});

const createApp = async (namespace = 'acme') =>
	await appRepository.createApp(ownerProject.id, 'Acme Portal', namespace);

const tgz = (files: Record<string, string>) => {
	const blocks = Object.entries(files).map(([path, text]) => {
		const content = Buffer.from(text);
		const header = new Header({ path, type: 'File', size: content.length, mtime: new Date(0) });
		header.encode();
		const data = Buffer.alloc(Math.ceil(content.length / 512) * 512);
		content.copy(data);
		return Buffer.concat([header.block!, data]);
	});
	return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
};

const INDEX_HTML = '<!doctype html><html><head><title>Acme</title></head><body>app</body></html>';
const APP_JS = 'console.log("app")';

/** An app with a served version. */
const createBuiltApp = async (namespace = 'acme') => {
	const app = await createApp(namespace);
	await Container.get(AppVersionService).create(
		app.id,
		app.projectId,
		tgz({ './src/main.ts': 'export {};' }),
		tgz({ './index.html': INDEX_HTML, './assets/app.js': APP_JS }),
	);
	return app;
};

const pageTokenOf = (html: string) =>
	html.match(/<meta name="n8n-app-token" content="([^"]+)">/)?.[1];

describe('GET /apps/:namespace/ with an active version', () => {
	test('serves index.html with a page token for the anonymous visitor', async () => {
		const app = await createBuiltApp();

		const response = await visitor.get('/apps/acme/').expect(200);

		expect(response.headers['content-type']).toContain('text/html');
		expect(response.headers['content-security-policy']).toContain('sandbox');
		expect(response.headers['cache-control']).toBe('no-store');
		expect(response.headers['set-cookie']).toBeUndefined();
		const token = pageTokenOf(response.text);
		expect(response.text).toBe(
			INDEX_HTML.replace('</head>', `<meta name="n8n-app-token" content="${token}"></head>`),
		);
		expect(Container.get(AppPageTokenService).verify(token!, app.id)).toBe(true);
	});

	test('mints a token for the app that serves the page, not another one', async () => {
		await createBuiltApp();
		const other = await createBuiltApp('other');

		const response = await visitor.get('/apps/acme/').expect(200);

		expect(Container.get(AppPageTokenService).verify(pageTokenOf(response.text)!, other.id)).toBe(
			false,
		);
	});

	test('serves assets unchanged', async () => {
		await createBuiltApp();

		const response = await visitor.get('/apps/acme/assets/app.js').expect(200);

		expect(response.text).toBe(APP_JS);
	});
});

describe('GET /apps/:namespace', () => {
	test('redirects the bare namespace to the trailing-slash URL', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');

		const response = await visitor.get('/apps/acme').expect(302);

		expect(response.headers.location).toBe('/apps/acme/');
	});

	test('serves the index page of an App without a session', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');

		const response = await visitor.get('/apps/acme/').expect(200);

		expect(response.headers['content-type']).toContain('text/html');
		expect(response.text).toContain('Acme Portal');
	});

	test('serves the sandbox content security policy, as forms and webhooks do', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');

		const response = await visitor.get('/apps/acme/').expect(200);

		expect(response.headers['content-security-policy']).toContain('sandbox');
		expect(response.headers['content-security-policy']).not.toContain('allow-same-origin');
	});

	test('answers 404 for a namespace no App owns', async () => {
		const response = await visitor.get('/apps/nobody').expect(404);

		expect(response.text).toContain('Page not found');
	});

	test('answers 404 for an App with no index page', async () => {
		await createApp();

		await visitor.get('/apps/acme').expect(404);
	});

	test('answers 404 for a path no page owns', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');

		await visitor.get('/apps/acme/nowhere').expect(404);
	});

	test('renders the menu as a nested list, mirroring the page tree', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');
		const clients = await pageRepository.createPage(app.id, null, 'clients');
		await pageRepository.createPage(app.id, clients.id, 'orders');

		const response = await visitor.get('/apps/acme/clients').expect(200);

		expect(response.text).toContain("href='/apps/acme'");
		expect(response.text).toContain("href='/apps/acme/clients/orders'");
		// One list for the top level and one for the children of `clients`: the
		// partial has to recurse to produce the second.
		expect(response.text.match(/<ul>/g)).toHaveLength(2);
	});

	test('escapes a param value where it reaches the page', async () => {
		const app = await createApp();
		const clients = await pageRepository.createPage(app.id, null, 'clients');
		await pageRepository.createPage(app.id, clients.id, ':id');

		// The value lands in the menu, both as a link label and inside an href.
		const response = await visitor
			.get(`/apps/acme/clients/${encodeURIComponent('"><script>alert(1)')}`)
			.expect(200);

		expect(response.text).not.toContain('<script>alert(1)');
		expect(response.text).toContain('&lt;script&gt;alert(1)');
	});

	test('answers 404 for a param value carrying an encoded slash', async () => {
		const app = await createApp();
		const clients = await pageRepository.createPage(app.id, null, 'clients');
		await pageRepository.createPage(app.id, clients.id, ':id');

		// One segment cannot hold a path: the menu builds its own links from these
		// values, so a slash inside one would point somewhere else.
		await visitor.get('/apps/acme/clients/a%2Fb').expect(404);
	});

	test('encodes a param value back into the menu links', async () => {
		const app = await createApp();
		const clients = await pageRepository.createPage(app.id, null, 'clients');
		const detail = await pageRepository.createPage(app.id, clients.id, ':id');
		await pageRepository.createPage(app.id, detail.id, 'orders');

		const response = await visitor.get('/apps/acme/clients/a%20b').expect(200);

		expect(response.text).toContain("href='/apps/acme/clients/a%20b/orders'");
	});

	test('does not serve a page of another App', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, 'clients');
		const other = await appRepository.createApp(ownerProject.id, 'Other', 'other');
		await pageRepository.createPage(other.id, null, 'secret');

		await visitor.get('/apps/acme/secret').expect(404);
	});
});
