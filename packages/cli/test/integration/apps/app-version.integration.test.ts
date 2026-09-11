/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { ModuleRegistry } from '@n8n/backend-common';
import { getPersonalProject, mockInstance, testDb } from '@n8n/backend-test-utils';
import { AppsConfig } from '@n8n/config';
import { BinaryDataRepository, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { existsSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { Header, type types } from 'tar';

import { AppVersionRepository } from '@/modules/apps/app-version.repository';
import { InstanceAiService } from '@/modules/instance-ai/instance-ai.service';
import { MAX_TARBALL_BYTES } from '@/modules/apps/app-version.service';
import { AppRepository } from '@/modules/apps/app.repository';
import { AppsService } from '@/modules/apps/apps.service';
import { PageRepository } from '@/modules/apps/page.repository';
import { injectInspectorScript } from '@/modules/apps/serving/inject-inspector-script';
import { InstanceWriteAccessService } from '@/services/instance-write-access.service';
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
const instanceAiService = mockInstance(InstanceAiService);

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
	instanceAiService.destroyAppSandbox.mockClear();
});

const createApp = async () => await appRepository.createApp(ownerProject.id, 'Hello', 'hello');

const rawGet = async (requestPath: string) =>
	await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
		const { port } = testServer.httpServer.address() as AddressInfo;
		http
			.request({ host: '127.0.0.1', port, path: requestPath }, (res) => {
				let body = '';
				res.setEncoding('utf8');
				res.on('data', (chunk: string) => (body += chunk));
				res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body }));
			})
			.on('error', reject)
			.end();
	});

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

	test('rejects the upload on a protected instance with 403', async () => {
		const app = await createApp();
		const writeAccess = Container.get(InstanceWriteAccessService);
		writeAccess.setReadOnly(true);

		try {
			await upload(app.id).expect(403);
		} finally {
			writeAccess.setReadOnly(false);
		}
		expect(await appVersionRepository.listByAppId(app.id)).toHaveLength(0);
	});

	test('rejects an extra form field with 400', async () => {
		const app = await createApp();

		await upload(app.id).field('extra', 'x').expect(400);
	});

	test('rejects a dist without index.html with 400', async () => {
		const app = await createApp();
		const noIndex = tgz([{ path: './assets/app.js', content: APP_JS }]);

		const response = await upload(app.id, sourceTgz(), noIndex).expect(400);

		expect(response.body.message).toContain('index.html');
		expect(await appVersionRepository.listByAppId(app.id)).toHaveLength(0);
	});

	test('rejects a tarball that unpacks past the size budget with 400', async () => {
		const app = await createApp();
		const MB = 1024 * 1024;
		const header = new Header({ path: './big', type: 'File', size: 201 * MB, mtime: new Date(0) });
		header.encode();
		// Concatenated gzip members keep the fixture small; gunzip reads them as one stream.
		const bomb = Buffer.concat([
			gzipSync(header.block!),
			...Array<Buffer>(201).fill(gzipSync(Buffer.alloc(MB))),
			gzipSync(Buffer.alloc(1024)),
		]);

		const response = await upload(app.id, bomb).expect(400);

		expect(response.body.message).toContain('unpacks to more than');
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

	test('rejects a gzip file that is not a tar archive with 400', async () => {
		const app = await createApp();

		await upload(app.id, sourceTgz(), gzipSync(Buffer.from('not a tar archive'))).expect(400);
	});

	test('rejects a file larger than the size limit with 400', async () => {
		const app = await createApp();

		await upload(app.id, sourceTgz(), Buffer.alloc(MAX_TARBALL_BYTES + 1)).expect(400);
	});

	test('rejects an upload past maxVersionsPerApp with a friendly message', async () => {
		const app = await createApp();
		const appsConfig = Container.get(AppsConfig);
		const original = appsConfig.maxVersionsPerApp;
		appsConfig.maxVersionsPerApp = 1;

		try {
			await upload(app.id).expect(200);

			const response = await upload(app.id).expect(400);

			expect(response.body.message).toContain('Version limit exceeded');
			expect(await appVersionRepository.listByAppId(app.id)).toHaveLength(1);
		} finally {
			appsConfig.maxVersionsPerApp = original;
		}
	});

	test('rejects an upload that would exceed maxProjectBlobSize with a friendly message', async () => {
		const app = await createApp();
		const appsConfig = Container.get(AppsConfig);
		const original = appsConfig.maxProjectBlobSize;
		appsConfig.maxProjectBlobSize = 10;

		try {
			const response = await upload(app.id).expect(400);

			expect(response.body.message).toContain('App storage limit exceeded');
			expect(await appVersionRepository.listByAppId(app.id)).toHaveLength(0);
		} finally {
			appsConfig.maxProjectBlobSize = original;
		}
	});

	test("sumSizeByProjectId only counts the given project's apps, and excludes pruned dist blobs", async () => {
		const memberProject = await getPersonalProject(member);
		const app = await createApp();
		const otherApp = await appRepository.createApp(memberProject.id, 'Other', 'other');

		await upload(app.id).expect(200);
		await authMemberAgent
			.post(`/projects/${memberProject.id}/apps/${otherApp.id}/versions`)
			.attach('source', sourceTgz(), 'src.tgz')
			.attach('dist', distTgz(), 'dist.tgz')
			.expect(200);

		const [version] = await appVersionRepository.listByAppId(app.id);
		expect(await appVersionRepository.sumSizeByProjectId(ownerProject.id)).toBe(
			version.sourceSizeBytes + (version.distSizeBytes ?? 0),
		);
		expect(await appVersionRepository.sumSizeByProjectId(memberProject.id)).toBeGreaterThan(0);

		// Pruning (six uploads keeps five dists) clears distSizeBytes alongside
		// distStorageKey - the sum must equal exactly what the surviving rows hold.
		// Which of the six gets pruned isn't fixed (ties on createdAt), so read it
		// back from the rows rather than assuming it's the first upload.
		for (let i = 0; i < 5; i++) await upload(app.id, sourceTgz(), distTgz(`v${i}`)).expect(200);
		const versions = await appVersionRepository.listByAppId(app.id);
		expect(versions).toHaveLength(6);
		expect(versions.filter((v) => v.distSizeBytes === null)).toHaveLength(1);
		const expectedTotal = versions.reduce(
			(sum, v) => sum + v.sourceSizeBytes + (v.distSizeBytes ?? 0),
			0,
		);
		expect(await appVersionRepository.sumSizeByProjectId(ownerProject.id)).toBe(expectedTotal);
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

		// Uploads within the same millisecond share `createdAt`, so the listing
		// order and the pruned one are not fixed by upload order.
		const versions: Array<{ id: string; hasDist: boolean }> = list.body.data;
		expect(versions.map((v) => v.id).sort()).toEqual([...versionIds].sort());
		expect(versions.filter((v) => v.hasDist)).toHaveLength(5);
		expect(versions.find((v) => v.id === versionIds[5])?.hasDist).toBe(true);

		const app2 = await appRepository.findOneBy({ id: app.id });
		expect(app2?.activeVersionId).toBe(versionIds[5]);
	});
});

describe('PATCH /projects/:projectId/apps/:appId/active-version', () => {
	const setActive = (appId: string, versionId: string | null) =>
		authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${appId}/active-version`)
			.send({ versionId });

	test('serves an older built version again and flags the newer one as unpublished', async () => {
		const app = await createApp();
		const firstId: string = (await upload(app.id, sourceTgz(), distTgz('first')).expect(200)).body
			.data.id;
		await upload(app.id, sourceTgz(), distTgz('second')).expect(200);

		const response = await setActive(app.id, firstId).expect(200);

		expect(response.body.data).toMatchObject({
			activeVersionId: firstId,
			hasUnpublishedChanges: true,
		});
		expect((await visitor.get('/apps/hello/').expect(200)).text).toBe(
			injectInspectorScript('first'),
		);
		const list = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/versions`)
			.expect(200);
		expect(list.body.data.find((v: { id: string }) => v.id === firstId)).toMatchObject({
			isActive: true,
			kind: 'publish',
		});
	});

	test('unpublishes with null so the namespace answers the not-found page', async () => {
		const app = await createApp();
		await upload(app.id).expect(200);

		const response = await setActive(app.id, null).expect(200);

		expect(response.body.data).toMatchObject({
			activeVersionId: null,
			hasUnpublishedChanges: true,
		});
		await visitor.get('/apps/hello/').expect(404);
	});

	test('rejects a source-only snapshot with 400', async () => {
		const app = await createApp();
		await upload(app.id).expect(200);
		const snapshot = await Container.get(AppsService).createSourceSnapshot(app.id, sourceTgz());

		const response = await setActive(app.id, snapshot.id).expect(400);

		expect(response.body.message).toContain('no build');
		expect(snapshot).toMatchObject({ isActive: false, kind: 'snapshot' });
	});

	test("rejects another app's version with 400", async () => {
		const app = await createApp();
		const other = await appRepository.createApp(ownerProject.id, 'Other', 'other');
		const otherVersionId: string = (await upload(other.id).expect(200)).body.data.id;

		await setActive(app.id, otherVersionId).expect(400);

		expect((await appRepository.findOneBy({ id: app.id }))?.activeVersionId).toBeNull();
	});

	test('rejects a non-member with 403', async () => {
		const app = await createApp();

		await authMemberAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}/active-version`)
			.send({ versionId: null })
			.expect(403);
	});
});

describe('GET /projects/:projectId/apps/:appId/versions/:versionId/source', () => {
	test('downloads the stored source tarball as an attachment', async () => {
		const app = await createApp();
		const source = sourceTgz();
		const versionId: string = (await upload(app.id, source).expect(200)).body.data.id;

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/versions/${versionId}/source`)
			.buffer(true)
			.parse((res, callback) => {
				const chunks: Buffer[] = [];
				res.on('data', (chunk: Buffer) => chunks.push(chunk));
				res.on('end', () => callback(null, Buffer.concat(chunks)));
			})
			.expect(200);

		expect(response.headers['content-type']).toContain('application/gzip');
		expect(response.headers['content-disposition']).toBe(
			`attachment; filename="hello-${versionId}.tgz"`,
		);
		expect(Buffer.from(response.body as Buffer).equals(source)).toBe(true);
	});

	test("answers 404 for another app's version", async () => {
		const app = await createApp();
		const other = await appRepository.createApp(ownerProject.id, 'Other', 'other');
		const otherVersionId: string = (await upload(other.id).expect(200)).body.data.id;

		await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/versions/${otherVersionId}/source`)
			.expect(404);
	});
});

describe('POST /projects/:projectId/apps/:appId/versions/:versionId/restore', () => {
	const restore = (appId: string, versionId: string) =>
		authOwnerAgent.post(`/projects/${ownerProject.id}/apps/${appId}/versions/${versionId}/restore`);

	test('stores the old source as the newest draft, keeps its label and the active version', async () => {
		const app = await createApp();
		const oldSource = tgz([{ path: './src/main.ts', content: 'old' }]);
		const appsService = Container.get(AppsService);
		const old = await appsService.createSourceSnapshot(app.id, oldSource);
		await appVersionRepository.setLabel([old.id], 'Added tasks');
		const publishedId: string = (await upload(app.id).expect(200)).body.data.id;

		const response = await restore(app.id, old.id).expect(200);

		expect(response.body.data).toMatchObject({
			kind: 'snapshot',
			isActive: false,
			label: 'Added tasks',
		});
		const [newest] = await appVersionRepository.listByAppId(app.id);
		expect(newest.id).toBe(response.body.data.id);
		expect(newest.id).not.toBe(old.id);
		expect((await appRepository.findOneBy({ id: app.id }))?.activeVersionId).toBe(publishedId);
		expect((await appsService.getSourceTarball(app.id))?.data.equals(oldSource)).toBe(true);
		expect(instanceAiService.destroyAppSandbox).not.toHaveBeenCalled();
	});

	test('drops the app sandbox when instance-ai is active and no run is editing the app', async () => {
		const app = await createApp();
		const versionId: string = (await upload(app.id).expect(200)).body.data.id;
		instanceAiService.hasActiveRunForApp.mockReturnValue(false);
		const isActive = vi
			.spyOn(Container.get(ModuleRegistry), 'isActive')
			.mockImplementation((name) => name === 'instance-ai' || name === 'apps');

		try {
			await restore(app.id, versionId).expect(200);
		} finally {
			isActive.mockRestore();
		}

		expect(instanceAiService.destroyAppSandbox).toHaveBeenCalledWith(app.id);
	});

	test('answers 409 while the assistant is editing the app', async () => {
		const app = await createApp();
		const versionId: string = (await upload(app.id).expect(200)).body.data.id;
		instanceAiService.hasActiveRunForApp.mockReturnValue(true);
		const isActive = vi
			.spyOn(Container.get(ModuleRegistry), 'isActive')
			.mockImplementation((name) => name === 'instance-ai' || name === 'apps');

		try {
			await restore(app.id, versionId).expect(409);
		} finally {
			isActive.mockRestore();
		}

		expect(await appVersionRepository.countByAppId(app.id)).toBe(1);
		expect(instanceAiService.destroyAppSandbox).not.toHaveBeenCalled();
	});

	test("answers 404 for another app's version", async () => {
		const app = await createApp();
		const other = await appRepository.createApp(ownerProject.id, 'Other', 'other');
		const otherVersionId: string = (await upload(other.id).expect(200)).body.data.id;

		await restore(app.id, otherVersionId).expect(404);

		expect(await appVersionRepository.countByAppId(app.id)).toBe(0);
	});

	test('rejects a non-member with 403', async () => {
		const app = await createApp();
		const versionId: string = (await upload(app.id).expect(200)).body.data.id;

		await authMemberAgent
			.post(`/projects/${ownerProject.id}/apps/${app.id}/versions/${versionId}/restore`)
			.expect(403);
	});
});

describe('AppsService.getSourceTarball', () => {
	test('returns null for an app without versions', async () => {
		const app = await createApp();

		await expect(Container.get(AppsService).getSourceTarball(app.id)).resolves.toBeNull();
	});

	test('returns the source of the newest version, whichever one is active', async () => {
		const app = await createApp();
		const first = sourceTgz();
		const second = tgz([{ path: './src/main.ts', content: 'export const v = 2;' }]);
		const firstId: string = (await upload(app.id, first).expect(200)).body.data.id;
		const secondId: string = (await upload(app.id, second).expect(200)).body.data.id;
		const newest = { versionId: secondId, data: second };

		await expect(Container.get(AppsService).getSourceTarball(app.id)).resolves.toEqual(newest);

		await appRepository.setActiveVersionId(app.id, firstId);
		await expect(Container.get(AppsService).getSourceTarball(app.id)).resolves.toEqual(newest);

		await appRepository.setActiveVersionId(app.id, null);
		await expect(Container.get(AppsService).getSourceTarball(app.id)).resolves.toEqual(newest);
	});
});

describe('GET /projects/:projectId/apps/:appId/versions/:versionId/files', () => {
	const list = (appId: string, versionId: string) =>
		authOwnerAgent.get(`/projects/${ownerProject.id}/apps/${appId}/versions/${versionId}/files`);

	const readFile = (appId: string, versionId: string, filePath: string) =>
		authOwnerAgent.get(
			`/projects/${ownerProject.id}/apps/${appId}/versions/${versionId}/files/${filePath}`,
		);

	test('lists the paths of every file in the source', async () => {
		const app = await createApp();
		const multiFile = tgz([
			{ path: './src/main.ts', content: 'export {};' },
			{ path: './src/App.vue', content: '<template />' },
			{ path: './package.json', content: '{}' },
		]);
		const { body } = await upload(app.id, multiFile).expect(200);

		const response = await list(app.id, body.data.id).expect(200);

		expect(response.body.data.sort()).toEqual(['package.json', 'src/App.vue', 'src/main.ts']);
	});

	test("returns a file's content", async () => {
		const app = await createApp();
		const { body } = await upload(app.id).expect(200);

		const response = await readFile(app.id, body.data.id, 'src/main.ts').expect(200);

		expect(response.body.data).toEqual({ content: 'export {};' });
	});

	test('returns 404 for a file that does not exist', async () => {
		const app = await createApp();
		const { body } = await upload(app.id).expect(200);

		await readFile(app.id, body.data.id, 'nope.txt').expect(404);
	});

	test('never resolves a file outside the source directory', async () => {
		const app = await createApp();
		const { body } = await upload(app.id).expect(200);

		await readFile(app.id, body.data.id, '..%2F..%2F..%2Fconfig').expect(404);
	});

	test('returns 404 for a version belonging to a different app', async () => {
		const app = await createApp();
		const otherApp = await appRepository.createApp(ownerProject.id, 'Other', 'other');
		const { body } = await upload(otherApp.id).expect(200);

		await list(app.id, body.data.id).expect(404);
	});

	test('rejects a non-member with 403', async () => {
		const app = await createApp();
		const { body } = await upload(app.id).expect(200);

		await authMemberAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/versions/${body.data.id}/files`)
			.expect(403);
	});
});

describe('GET /apps/:namespace with an active version', () => {
	test('redirects the bare namespace to the trailing-slash URL', async () => {
		const app = await createApp();
		await upload(app.id).expect(200);

		const response = await visitor.get('/apps/hello').expect(302);

		expect(response.headers.location).toBe('/apps/hello/');
	});

	test('keeps the query string on the trailing-slash redirect', async () => {
		const app = await createApp();
		await upload(app.id).expect(200);

		const response = await visitor.get('/apps/hello?token=abc&x=1').expect(302);

		expect(response.headers.location).toBe('/apps/hello/?token=abc&x=1');
	});

	test('serves index.html with the sandbox policy and no caching', async () => {
		const app = await createApp();
		await upload(app.id).expect(200);

		const response = await visitor.get('/apps/hello/').expect(200);

		expect(response.headers['content-type']).toContain('text/html');
		expect(response.headers['content-security-policy']).toContain('sandbox');
		expect(response.headers['cache-control']).toBe('no-cache');
		expect(response.text).toBe(injectInspectorScript(INDEX_HTML));
	});

	test('serves every html file with the sandbox policy and no caching', async () => {
		const app = await createApp();
		const about = '<!doctype html><html><body>about</body></html>';
		const dist = tgz([
			{ path: './index.html', content: INDEX_HTML },
			{ path: './about.html', content: about },
		]);
		await upload(app.id, sourceTgz(), dist).expect(200);

		const response = await visitor.get('/apps/hello/about.html').expect(200);

		expect(response.headers['content-type']).toContain('text/html');
		expect(response.headers['content-security-policy']).toContain('sandbox');
		expect(response.headers['cache-control']).toBe('no-cache');
		expect(response.text).toBe(injectInspectorScript(about));
	});

	test('serves assets with their own content type, the sandbox policy and revalidation', async () => {
		const app = await createApp();
		await upload(app.id).expect(200);

		const response = await visitor.get('/apps/hello/assets/app.js').expect(200);

		expect(response.headers['content-type']).toMatch(/javascript/);
		expect(response.headers['content-security-policy']).toContain('sandbox');
		expect(response.headers['cache-control']).toBe('public, max-age=0, must-revalidate');
		expect(response.headers.etag).toBeDefined();
		expect(response.text).toBe(APP_JS);
	});

	test('serves a non-html document with the sandbox policy', async () => {
		const app = await createApp();
		const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
		const dist = tgz([
			{ path: './index.html', content: INDEX_HTML },
			{ path: './logo.svg', content: svg },
		]);
		await upload(app.id, sourceTgz(), dist).expect(200);

		const response = await visitor.get('/apps/hello/logo.svg').expect(200);

		expect(response.headers['content-type']).toContain('image/svg+xml');
		expect(response.headers['content-security-policy']).toContain('sandbox');
		expect(response.body.toString()).toBe(svg);
	});

	test('falls back to index.html for a client-side route', async () => {
		const app = await createApp();
		await upload(app.id).expect(200);

		const response = await visitor.get('/apps/hello/deep/route').expect(200);

		expect(response.headers['content-type']).toContain('text/html');
		expect(response.text).toBe(injectInspectorScript(INDEX_HTML));
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
			expect(response.text).toBe(injectInspectorScript(INDEX_HTML));
		}

		// superagent normalises `..` before the request leaves the process.
		const raw = await rawGet('/apps/hello/../../config');
		expect(raw.statusCode).toBe(200);
		expect(raw.body).toBe(injectInspectorScript(INDEX_HTML));
	});

	test('serves the newest version after a second upload', async () => {
		const app = await createApp();
		await upload(app.id).expect(200);
		await upload(app.id, sourceTgz(), distTgz('second')).expect(200);

		const response = await visitor.get('/apps/hello/').expect(200);

		expect(response.text).toBe(injectInspectorScript('second'));
	});
});

describe('GET /apps/:namespace without a version', () => {
	test('redirects the bare namespace to the trailing-slash URL', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');

		const response = await visitor.get('/apps/hello').expect(302);

		expect(response.headers.location).toBe('/apps/hello/');
	});

	test('still serves pages', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');

		const response = await visitor.get('/apps/hello/').expect(200);

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
		const versionId = response.body.data.id;
		await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/versions/${versionId}/files`)
			.expect(200);
		const distDir = path.join(cacheRoot, versionId);
		const sourceDir = path.join(path.dirname(cacheRoot), 'apps-source', versionId);
		expect(existsSync(distDir)).toBe(true);
		expect(existsSync(sourceDir)).toBe(true);
		const [version] = await appVersionRepository.listByAppId(app.id);

		await authOwnerAgent.delete(`/projects/${ownerProject.id}/apps/${app.id}`).expect(200);

		expect(await appVersionRepository.listByAppId(app.id)).toHaveLength(0);
		expect(existsSync(distDir)).toBe(false);
		expect(existsSync(sourceDir)).toBe(false);
		expect(await binaryDataRepository.findContentByFileId(version.sourceStorageKey)).toBeNull();
		expect(await binaryDataRepository.findContentByFileId(version.distStorageKey!)).toBeNull();
	});
});
