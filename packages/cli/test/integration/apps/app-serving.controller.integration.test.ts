import { getPersonalProject, testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { gzipSync } from 'node:zlib';
import { Header } from 'tar';

import { AppVersionService } from '@/modules/apps/app-version.service';
import { AppRepository } from '@/modules/apps/app.repository';
import { injectInspectorScript } from '@/modules/apps/serving/inject-inspector-script';
import { createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let owner: User;
let ownerProject: Project;
/** No auth and no `/rest` prefix: a published App is served at the instance root, to anyone. */
let visitor: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['apps'],
	modules: ['apps'],
});

let appRepository: AppRepository;

beforeAll(async () => {
	appRepository = Container.get(AppRepository);

	owner = await createOwner();
	ownerProject = await getPersonalProject(owner);
	visitor = testServer.restlessAgent;
});

beforeEach(async () => {
	await testDb.truncate(['App']);
});

const createApp = async () => await appRepository.createApp(ownerProject.id, 'Acme Portal', 'acme');

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
const createBuiltApp = async () => {
	const app = await createApp();
	await Container.get(AppVersionService).create(
		app.id,
		app.projectId,
		tgz({ './src/main.ts': 'export {};' }),
		tgz({ './index.html': INDEX_HTML, './assets/app.js': APP_JS }),
	);
	return app;
};

describe('GET /apps/:namespace/ with an active version', () => {
	test('serves index.html to the anonymous visitor without a cookie', async () => {
		await createBuiltApp();

		const response = await visitor.get('/apps/acme/').expect(200);

		expect(response.headers['content-type']).toContain('text/html');
		expect(response.headers['content-security-policy']).toContain('sandbox');
		expect(response.headers['cache-control']).toBe('no-cache');
		expect(response.headers['set-cookie']).toBeUndefined();
		expect(response.text).toBe(injectInspectorScript(INDEX_HTML));
	});

	test('serves assets unchanged', async () => {
		await createBuiltApp();

		const response = await visitor.get('/apps/acme/assets/app.js').expect(200);

		expect(response.text).toBe(APP_JS);
	});
});

describe('GET /apps/:namespace', () => {
	test('redirects the bare namespace to the trailing-slash URL', async () => {
		await createBuiltApp();

		const response = await visitor.get('/apps/acme?tab=1').expect(302);

		expect(response.headers.location).toBe('/apps/acme/?tab=1');
	});

	test('serves index.html for a client-side route', async () => {
		await createBuiltApp();

		const response = await visitor.get('/apps/acme/clients/42').expect(200);

		expect(response.text).toBe(injectInspectorScript(INDEX_HTML));
	});

	test('answers 404 for a namespace no App owns', async () => {
		await visitor.get('/apps/nobody/').expect(404);
	});

	test('answers 404 for an App with no active version', async () => {
		await createApp();

		await visitor.get('/apps/acme/').expect(404);
	});

	test('reserves the api segment for the runtime routes', async () => {
		await createBuiltApp();

		await visitor.get('/apps/acme/api/anything').expect(404);
	});
});
