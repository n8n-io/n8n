import { DbLock, DbLockService, type OperationContext } from '@n8n/db';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AppArtifact } from '../app-artifact.entity';
import { AppArtifactService } from '../app-artifact.service';
import { appStorageLockSubKey } from '../app-storage-lock';
import type { AppVersion } from '../app-version.entity';
import { AppVersionRepository } from '../app-version.repository';
import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import { AppArchive } from '../storage/app-archive';
import type { NewSourceVersion } from '../storage/app-version-stores';
import {
	SnapshotAppSourceVersionStore,
	SnapshotAppBuildResultStore,
} from '../storage/snapshot-app-version-stores';

const version: NewSourceVersion = {
	id: 'version',
	appId: 'app',
	expectedDraftVersionId: 'draft',
	label: 'Snapshot',
};
const files = new Map([['index.html', Buffer.from('<html/>')]]);

function createStores() {
	const archives = mock<AppArchive>();
	const artifacts = mock<AppArtifactService>();
	const versions = mock<AppVersionRepository>();
	const apps = mock<AppRepository>();
	const locks = mock<DbLockService>();
	const ctx = mock<OperationContext>();
	locks.withLockContext.mockImplementation(async (_key, fn) => await fn(ctx));
	const artifact = mock<AppArtifact>({ id: 1, appId: version.appId });
	archives.pack.mockResolvedValue(Buffer.from('archive'));
	artifacts.upload.mockResolvedValue(artifact);
	apps.findById.mockResolvedValue(mock<App>());
	apps.advanceDraft.mockResolvedValue(true);
	versions.findVersionById.mockResolvedValue(
		mock<AppVersion>({ appId: version.appId, bundleArtifactId: null }),
	);
	versions.attachBundle.mockResolvedValue(true);
	return {
		source: new SnapshotAppSourceVersionStore(archives, artifacts, versions, apps, locks),
		builds: new SnapshotAppBuildResultStore(archives, artifacts, versions, locks),
		archives,
		artifacts,
		versions,
		apps,
		artifact,
		ctx,
		locks,
	};
}

describe('SnapshotAppSourceVersionStore', () => {
	it('creates a source-backed version and advances the expected draft', async () => {
		const { source, archives, artifacts, versions, apps, artifact, ctx, locks } = createStores();

		await source.createVersion(version, files);

		expect(archives.pack).toHaveBeenCalledWith(files);
		expect(artifacts.upload).toHaveBeenCalledWith(version.appId, Buffer.from('archive'));
		expect(locks.withLockContext).toHaveBeenCalledWith(DbLock.APPS_STORAGE, expect.any(Function), {
			subKey: appStorageLockSubKey(version.appId),
		});
		expect(artifacts.completeUpload).toHaveBeenCalledWith(artifact, ctx);
		expect(versions.insertVersion).toHaveBeenCalledWith(
			{ id: version.id, appId: version.appId, label: version.label, sourceArtifactId: artifact.id },
			ctx,
		);
		expect(apps.advanceDraft).toHaveBeenCalledWith(
			version.appId,
			version.expectedDraftVersionId,
			version.id,
			ctx,
		);
		expect(artifacts.discard).not.toHaveBeenCalled();
	});

	it('discards the upload when the app disappears', async () => {
		const { source, artifacts, versions, apps, artifact } = createStores();
		apps.findById.mockResolvedValue(null);

		await expect(source.createVersion(version, files)).rejects.toThrow(NotFoundError);

		expect(versions.insertVersion).not.toHaveBeenCalled();
		expect(artifacts.discard).toHaveBeenCalledWith(artifact);
	});

	it('discards a stale save when the draft changes during the upload', async () => {
		const { source, artifacts, apps, artifact } = createStores();
		apps.advanceDraft.mockResolvedValue(false);

		await expect(source.createVersion(version, files)).rejects.toThrow(ConflictError);

		expect(artifacts.discard).toHaveBeenCalledWith(artifact);
	});

	it('discards the upload and preserves a metadata write error', async () => {
		const { source, artifacts, versions, artifact } = createStores();
		const error = new Error('Could not save the version.');
		versions.insertVersion.mockRejectedValue(error);

		await expect(source.createVersion(version, files)).rejects.toBe(error);

		expect(artifacts.discard).toHaveBeenCalledWith(artifact);
	});

	it('reads source files in the default archive mode', async () => {
		const { source, archives, artifacts, versions } = createStores();
		const body = Buffer.from('archive');
		versions.findVersionById.mockResolvedValue(mock<AppVersion>({ sourceArtifactId: 7 }));
		artifacts.read.mockResolvedValue(body);
		archives.unpack.mockResolvedValue(files);

		expect(await source.readSource(version.id)).toEqual(files);
		expect(artifacts.read).toHaveBeenCalledWith(7);
		expect(archives.unpack).toHaveBeenCalledWith(body);
	});

	it('lists source files without unpacking file content', async () => {
		const { source, archives, artifacts, versions } = createStores();
		const body = Buffer.from('archive');
		versions.findVersionById.mockResolvedValue(mock<AppVersion>({ sourceArtifactId: 7 }));
		artifacts.read.mockResolvedValue(body);
		archives.listFiles.mockResolvedValue(['index.html']);

		expect(await source.listSourceFiles(version.id)).toEqual(['index.html']);
		expect(artifacts.read).toHaveBeenCalledWith(7);
		expect(archives.listFiles).toHaveBeenCalledWith(body);
		expect(archives.unpack).not.toHaveBeenCalled();
	});

	it('reads a source file without unpacking all file content', async () => {
		const { source, archives, artifacts, versions } = createStores();
		const body = Buffer.from('archive');
		const content = Buffer.from('<html/>');
		versions.findVersionById.mockResolvedValue(mock<AppVersion>({ sourceArtifactId: 7 }));
		artifacts.read.mockResolvedValue(body);
		archives.readFile.mockResolvedValue(content);

		expect(await source.readSourceFile(version.id, 'index.html')).toBe(content);
		expect(artifacts.read).toHaveBeenCalledWith(7);
		expect(archives.readFile).toHaveBeenCalledWith(body, 'index.html');
		expect(archives.unpack).not.toHaveBeenCalled();
	});

	it.each(['readSource', 'listSourceFiles', 'readSourceFile'] as const)(
		'returns not found for a missing version in %s',
		async (operation) => {
			const { source, artifacts, versions } = createStores();
			versions.findVersionById.mockResolvedValue(null);

			await expect(source[operation](version.id, 'index.html')).rejects.toThrow(NotFoundError);

			expect(artifacts.read).not.toHaveBeenCalled();
		},
	);
});

describe('SnapshotAppBuildResultStore', () => {
	it('attaches the uploaded bundle in the upload-completion transaction', async () => {
		const { builds, archives, artifacts, versions, artifact, ctx, locks } = createStores();

		await builds.recordSuccess(version.appId, version.id, files);

		expect(archives.pack).toHaveBeenCalledWith(files, true);
		expect(artifacts.upload).toHaveBeenCalledWith(version.appId, Buffer.from('archive'));
		expect(locks.withLockContext).toHaveBeenCalledWith(DbLock.APPS_STORAGE, expect.any(Function), {
			subKey: appStorageLockSubKey(version.appId),
		});
		expect(artifacts.completeUpload).toHaveBeenCalledWith(artifact, ctx);
		expect(versions.attachBundle).toHaveBeenCalledWith(version.id, artifact.id, ctx);
		expect(artifacts.discard).not.toHaveBeenCalled();
	});

	it.each([
		{ reason: 'missing', target: null },
		{ reason: 'in another app', target: mock<AppVersion>({ appId: 'other-app' }) },
	])('discards the bundle when the version is $reason', async ({ target }) => {
		const { builds, artifacts, versions, artifact } = createStores();
		versions.findVersionById.mockResolvedValue(target);

		await expect(builds.recordSuccess(version.appId, version.id, files)).rejects.toThrow(
			NotFoundError,
		);

		expect(versions.attachBundle).not.toHaveBeenCalled();
		expect(artifacts.discard).toHaveBeenCalledWith(artifact);
	});

	it('discards the bundle when the version no longer accepts a build result', async () => {
		const { builds, artifacts, versions, artifact } = createStores();
		versions.attachBundle.mockResolvedValue(false);

		await expect(builds.recordSuccess(version.appId, version.id, files)).rejects.toThrow(
			ConflictError,
		);

		expect(artifacts.discard).toHaveBeenCalledWith(artifact);
	});

	it('does not attach an expired upload', async () => {
		const { builds, artifacts, versions, artifact } = createStores();
		const error = new ConflictError('Upload expired.');
		artifacts.completeUpload.mockRejectedValue(error);

		await expect(builds.recordSuccess(version.appId, version.id, files)).rejects.toBe(error);

		expect(versions.attachBundle).not.toHaveBeenCalled();
		expect(artifacts.discard).toHaveBeenCalledWith(artifact);
	});

	it('reads bundle files in bundle archive mode', async () => {
		const { builds, archives, artifacts, versions } = createStores();
		const body = Buffer.from('archive');
		versions.findVersionById.mockResolvedValue(mock<AppVersion>({ bundleArtifactId: 8 }));
		artifacts.read.mockResolvedValue(body);
		archives.unpack.mockResolvedValue(files);

		expect(await builds.readBundle(version.id)).toEqual(files);
		expect(artifacts.read).toHaveBeenCalledWith(8);
		expect(archives.unpack).toHaveBeenCalledWith(body, true);
	});

	it('returns not found when the version has no bundle', async () => {
		const { builds, artifacts } = createStores();

		await expect(builds.readBundle(version.id)).rejects.toThrow(NotFoundError);

		expect(artifacts.read).not.toHaveBeenCalled();
	});
});
