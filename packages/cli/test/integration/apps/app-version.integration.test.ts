/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { getPersonalProject, testDb } from '@n8n/backend-test-utils';
import { BinaryDataRepository, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { Header, type types } from 'tar';

import { AppVersionRepository } from '@/modules/apps/app-version.repository';
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
/** No auth and no `/rest` prefix: an App is served at the instance root, to anyone. */
let visitor: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['apps'],
	modules: ['apps'],
});

let appRepository: AppRepository;
let appVersionRepository: AppVersionRepository;
let pageRepository: PageRepository;
let binaryDataRepository: BinaryDataRepository;
let cacheRoot: string;

type TarEntry = {
	path: string;
	type?: types.EntryTypeName;
	content?: string;
	linkpath?: string;
};

/** Gzipped tar built entry by entry, so a test can include entries `tar.c` would refuse to pack. */
const tgz = (entries: TarEntry[]) => {
	const blocks = entries.map((entry) => {
		const content = Buffer.from(entry.content ?? '', 'utf-8');
		const header = new Header({
			path: entry.path,
			type: entry.type ?? 'File',
			size: content.length,
			mtime: new Date(0),
			linkpath: entry.linkpath,
		});
		header.encode();
		const data = Buffer.alloc(Math.ceil(content.length / 512) * 512);
		content.copy(data);
		return Buffer.concat([header.block!, data]);
	});
	return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
};

const INDEX_HTML = '<!doctype html><html><body>hello app</body></html>';
const APP_JS = 'console.log("hello");';

const distTgz = (indexHtml = INDEX_HTML) =>
	tgz([
		{ path: './index.html', content: indexHtml },
		{ path: './assets/', type: 'Directory' },
		{ path: './assets/app.js', content: APP_JS },
	]);
const sourceTgz = () => tgz([{ path: './src/main.ts', content: 'export {};' }]);

beforeAll(async () => {
	appRepository = Container.get(AppRepository);
	appVersionRepository = Container.get(AppVersionRepository);
	pageRepository = Container.get(PageRepository);
	binaryDataRepository = Container.get(BinaryDataRepository);
	cacheRoot = path.join(Container.get(InstanceSettings).n8nFolder, 'apps');

	owner = await createOwner();
	member = await createMember();
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
	ownerProject = await getPersonalProject(owner);
	visitor = testServer.restlessAgent;
});

beforeEach(async () => {
	await testDb.truncate(['App', 'Page']);
});

const createApp = async () => await appRepository.createApp(ownerProject.id, 'Hello', 'hello');

const upload = (appId: string, source = sourceTgz(), dist = distTgz()) =>
	authOwnerAgent
		.post(`/projects/${ownerProject.id}/apps/${appId}/versions`)
		.attach('source', source, 'src.tgz')
		.attach('dist', dist, 'dist.tgz');

describe('POST /projects/:projectId/apps/:appId/versions', () => {
	test('stores a version and makes it the active one', async () => {
		const app = await createApp();

		const response = await upload(app.id).expect(200);

		expect(response.body.data).toMatchObject({ appId: app.id, hasDist: true });
		const updated = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}`)
			.expect(200);
		expect(updated.body.data.activeVersionId).toBe(response.body.data.id);
	});

	test('rejects a non-member with 403', async () => {
		const app = await createApp();

		await authMemberAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/versions`)
			.attach('source', sourceTgz(), 'src.tgz')
			.attach('dist', distTgz(), 'dist.tgz')
			.expect(403);
	});

	test('rejects a missing tarball with 400', async () => {
		const app = await createApp();

		await authOwnerAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/versions`)
			.attach('source', sourceTgz(), 'src.tgz')
			.expect(400);
	});

	test('rejects a file that is not gzip with 400', async () => {
		const app = await createApp();

		await upload(app.id, sourceTgz(), Buffer.from('not a tarball')).expect(400);
	});

	test('skips entries that would land outside the dist directory', async () => {
		const app = await createApp();
		const evil = tgz([
			{ path: './index.html', content: INDEX_HTML },
			{ path: '../evil', content: 'escaped' },
			{ path: './passwd', type: 'SymbolicLink', linkpath: '/etc/passwd' },
		]);

		const response = await upload(app.id, sourceTgz(), evil).expect(200);
		await visitor.get('/apps/hello/').expect(200);

		const distDir = path.join(cacheRoot, response.body.data.id);
		expect(existsSync(path.join(distDir, 'index.html'))).toBe(true);
		expect(existsSync(path.join(distDir, 'passwd'))).toBe(false);
		expect(existsSync(path.join(cacheRoot, 'evil'))).toBe(false);
		expect(existsSync(path.join(cacheRoot, '..', 'evil'))).toBe(false);
	});

	test('keeps the dist of the active version and the newest five', async () => {
		const app = await createApp();
		const versionIds: string[] = [];
		for (let i = 0; i < 6; i++) {
			const response = await upload(app.id, sourceTgz(), distTgz(`v${i}`)).expect(200);
			versionIds.push(response.body.data.id);
		}

		const list = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/versions`)
			.expect(200);

		const versions: Array<{ id: string; hasDist: boolean }> = list.body.data;
		expect(versions.map((v) => v.id)).toEqual([...versionIds].reverse());
		expect(versions.map((v) => v.hasDist)).toEqual([true, true, true, true, true, false]);

		const app2 = await appRepository.findOneBy({ id: app.id });
		expect(app2?.activeVersionId).toBe(versionIds[5]);
	});
});

describe('GET /apps/:namespace with an active version', () => {
	test('redirects the bare namespace to the trailing-slash URL', async () => {
		const app = await createApp();
		await upload(app.id).expect(200);

		const response = await visitor.get('/apps/hello').expect(302);

		expect(response.headers.location).toBe('/apps/hello/');
	});

	test('serves index.html with the sandbox policy and no caching', async () => {
		const app = await createApp();
		await upload(app.id).expect(200);

		const response = await visitor.get('/apps/hello/').expect(200);

		expect(response.headers['content-type']).toContain('text/html');
		expect(response.headers['content-security-policy']).toContain('sandbox');
		expect(response.headers['cache-control']).toBe('no-cache');
		expect(response.text).toBe(INDEX_HTML);
	});

	test('serves assets with their own content type and without the policy', async () => {
		const app = await createApp();
		await upload(app.id).expect(200);

		const response = await visitor.get('/apps/hello/assets/app.js').expect(200);

		expect(response.headers['content-type']).toMatch(/javascript/);
		expect(response.headers['content-security-policy']).toBeUndefined();
		expect(response.headers['cache-control']).toBe('public, max-age=3600');
		expect(response.text).toBe(APP_JS);
	});

	test('falls back to index.html for a client-side route', async () => {
		const app = await createApp();
		await upload(app.id).expect(200);

		const response = await visitor.get('/apps/hello/deep/route').expect(200);

		expect(response.headers['content-type']).toContain('text/html');
		expect(response.text).toBe(INDEX_HTML);
	});

	test('never serves a file outside the dist directory', async () => {
		const app = await createApp();
		await upload(app.id).expect(200);

		for (const url of [
			'/apps/hello/..%2F..%2F..%2Fconfig',
			'/apps/hello/assets/..%2F..%2F..%2Fconfig',
			'/apps/hello/%2Fetc%2Fpasswd',
		]) {
			const response = await visitor.get(url).expect(200);
			expect(response.text).toBe(INDEX_HTML);
		}
	});

	test('serves the newest version after a second upload', async () => {
		const app = await createApp();
		await upload(app.id).expect(200);
		await upload(app.id, sourceTgz(), distTgz('second')).expect(200);

		const response = await visitor.get('/apps/hello/').expect(200);

		expect(response.text).toBe('second');
	});
});

describe('GET /apps/:namespace without a version', () => {
	test('still serves pages, without a redirect', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');

		const response = await visitor.get('/apps/hello').expect(200);

		expect(response.headers['content-type']).toContain('text/html');
		expect(response.headers['content-security-policy']).toContain('sandbox');
		expect(response.text).toContain('Hello');
	});
});

describe('DELETE /projects/:projectId/apps/:appId', () => {
	test('removes versions, their blobs and the extraction cache', async () => {
		const app = await createApp();
		const response = await upload(app.id).expect(200);
		await visitor.get('/apps/hello/').expect(200);
		const distDir = path.join(cacheRoot, response.body.data.id);
		expect(existsSync(distDir)).toBe(true);
		const [version] = await appVersionRepository.listByAppId(app.id);

		await authOwnerAgent.delete(`/projects/${ownerProject.id}/apps/${app.id}`).expect(200);

		expect(await appVersionRepository.listByAppId(app.id)).toHaveLength(0);
		expect(existsSync(distDir)).toBe(false);
		expect(await binaryDataRepository.findContentByFileId(version.sourceStorageKey)).toBeNull();
		expect(await binaryDataRepository.findContentByFileId(version.distStorageKey!)).toBeNull();
	});
});
