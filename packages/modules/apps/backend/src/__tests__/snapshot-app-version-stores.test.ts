import { DbLockService, type OperationContext } from '@n8n/db';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AppArtifact } from '../app-artifact.entity';
import { AppArtifactService } from '../app-artifact.service';
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
	const artifact = mock<AppArtifact>({ id: 1 });
	archives.pack.mockResolvedValue(Buffer.from('archive'));
	artifacts.upload.mockResolvedValue(artifact);
	apps.findById.mockResolvedValue(mock<App>());
	apps.advanceDraft.mockResolvedValue(true);
	versions.findVersionById.mockResolvedValue(mock<AppVersion>({ bundleArtifactId: null }));
	versions.attachBundle.mockResolvedValue(true);
	return {
		source: new SnapshotAppSourceVersionStore(archives, artifacts, versions, apps, locks),
		builds: new SnapshotAppBuildResultStore(archives, artifacts, versions, locks),
		artifacts,
		versions,
		apps,
		artifact,
		ctx,
	};
}

describe('SnapshotAppSourceVersionStore', () => {
	it('creates a source-backed version and advances the expected draft', async () => {
		const { source, artifacts, versions, apps, artifact, ctx } = createStores();

		await source.createVersion(version, files);

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

	it('returns not found when reading a missing version', async () => {
		const { source, artifacts, versions } = createStores();
		versions.findVersionById.mockResolvedValue(null);

		await expect(source.readSource(version.id)).rejects.toThrow(NotFoundError);

		expect(artifacts.read).not.toHaveBeenCalled();
	});
});

describe('SnapshotAppBuildResultStore', () => {
	it('attaches the uploaded bundle in the upload-completion transaction', async () => {
		const { builds, artifacts, versions, artifact, ctx } = createStores();

		await builds.recordSuccess(version.id, files);

		expect(artifacts.completeUpload).toHaveBeenCalledWith(artifact, ctx);
		expect(versions.attachBundle).toHaveBeenCalledWith(version.id, artifact.id, ctx);
		expect(artifacts.discard).not.toHaveBeenCalled();
	});

	it('discards the bundle when the version disappears', async () => {
		const { builds, artifacts, versions, artifact } = createStores();
		versions.findVersionById.mockResolvedValue(null);

		await expect(builds.recordSuccess(version.id, files)).rejects.toThrow(NotFoundError);

		expect(versions.attachBundle).not.toHaveBeenCalled();
		expect(artifacts.discard).toHaveBeenCalledWith(artifact);
	});

	it('discards the bundle when the version no longer accepts a build result', async () => {
		const { builds, artifacts, versions, artifact } = createStores();
		versions.attachBundle.mockResolvedValue(false);

		await expect(builds.recordSuccess(version.id, files)).rejects.toThrow(ConflictError);

		expect(artifacts.discard).toHaveBeenCalledWith(artifact);
	});

	it('does not attach an expired upload', async () => {
		const { builds, artifacts, versions, artifact } = createStores();
		const error = new ConflictError('Upload expired.');
		artifacts.completeUpload.mockRejectedValue(error);

		await expect(builds.recordSuccess(version.id, files)).rejects.toBe(error);

		expect(versions.attachBundle).not.toHaveBeenCalled();
		expect(artifacts.discard).toHaveBeenCalledWith(artifact);
	});

	it('returns not found when the version has no bundle', async () => {
		const { builds, artifacts } = createStores();

		await expect(builds.readBundle(version.id)).rejects.toThrow(NotFoundError);

		expect(artifacts.read).not.toHaveBeenCalled();
	});
});
