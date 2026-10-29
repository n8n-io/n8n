import { Logger } from '@n8n/backend-common';
import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { AppRetentionService } from '../../storage/app-retention.service';
import type { AppVersion } from '../app-version.entity';
import { AppVersionRepository } from '../app-version.repository';
import { AppVersionService } from '../app-version.service';
import type { App } from '../../app.entity';
import { AppRepository } from '../../app.repository';
import { AppSourceVersionStore, AppBuildResultStore } from '../../storage/app-version-stores';

const appId = '11111111-1111-4111-8111-111111111111';
const versionId = '22222222-2222-4222-8222-222222222222';
const files = new Map([['index.html', Buffer.from('<html/>')]]);
const attempt = { attemptNumber: 1, startedAt: new Date() };

function createService() {
	const apps = mock<AppRepository>();
	const versions = mock<AppVersionRepository>();
	const sourceVersions = mock<AppSourceVersionStore>();
	const buildResults = mock<AppBuildResultStore>();
	const retention = mock<AppRetentionService>();
	const version = mock<AppVersion>({
		id: versionId,
		appId,
		label: 'Original',
		buildStatus: 'queued',
	});
	apps.findInProject.mockResolvedValue(mock<App>({ id: appId, draftVersionId: versionId }));
	versions.findVersionById.mockResolvedValue(version);
	sourceVersions.createVersion.mockImplementation(async (data) => {
		versions.findVersionById.mockResolvedValue(
			mock<AppVersion>({ ...version, id: data.id, label: data.label }),
		);
	});
	const service = new AppVersionService(
		apps,
		versions,
		sourceVersions,
		buildResults,
		retention,
		mock<Logger>(),
	);
	return { service, apps, versions, sourceVersions, buildResults, retention, version };
}

describe('AppVersionService', () => {
	it('does not read source files from another app', async () => {
		const { service, versions, sourceVersions } = createService();
		versions.findVersionById.mockResolvedValue(
			mock<AppVersion>({ id: versionId, appId: 'other-app' }),
		);

		await expect(service.readSource('project', appId, versionId)).rejects.toThrow(NotFoundError);

		expect(sourceVersions.readSource).not.toHaveBeenCalled();
	});

	it('does not change a label on a version from another app', async () => {
		const { service, versions } = createService();
		versions.findVersionById.mockResolvedValue(
			mock<AppVersion>({ id: versionId, appId: 'other-app' }),
		);

		await expect(service.setLabel('project', appId, versionId, 'Updated')).rejects.toThrow(
			NotFoundError,
		);

		expect(versions.setLabel).not.toHaveBeenCalled();
	});

	it('does not read a bundle when the app is outside the requested project', async () => {
		const { service, apps, buildResults } = createService();
		apps.findInProject.mockResolvedValue(null);

		await expect(service.readBundle('other-project', appId, versionId)).rejects.toThrow(
			NotFoundError,
		);

		expect(buildResults.readBundle).not.toHaveBeenCalled();
	});

	it.each([
		{ appId: 'invalid', versionId },
		{ appId, versionId: 'invalid' },
	])('returns not found for malformed IDs: $appId / $versionId', async (ids) => {
		const { service } = createService();

		await expect(service.getVersion('project', ids.appId, ids.versionId)).rejects.toThrow(
			NotFoundError,
		);
	});

	it('returns not found for a missing version', async () => {
		const { service, versions } = createService();
		versions.findVersionById.mockResolvedValue(null);

		await expect(service.getVersion('project', appId, versionId)).rejects.toThrow(NotFoundError);
	});

	it('rejects a stale draft before creating a source version', async () => {
		const { service, sourceVersions } = createService();

		await expect(service.saveSource('project', appId, null, files)).rejects.toThrow(ConflictError);

		expect(sourceVersions.createVersion).not.toHaveBeenCalled();
	});

	it.each(['queued', 'succeeded', 'failed'] as const)(
		'rejects a bundle for a %s version',
		async (buildStatus) => {
			const { service, versions, buildResults, version } = createService();
			versions.findVersionById.mockResolvedValue({ ...version, buildStatus });

			await expect(
				service.attachBundle('project', appId, versionId, files, attempt),
			).rejects.toThrow(ConflictError);

			expect(buildResults.recordSuccess).not.toHaveBeenCalled();
		},
	);

	it('returns the completed build for a running version', async () => {
		const { service, versions, buildResults, version } = createService();
		const completed = mock<AppVersion>({
			...version,
			buildStatus: 'succeeded',
			bundleArtifactId: 2,
		});
		versions.findVersionById.mockResolvedValue({ ...version, buildStatus: 'running' });
		buildResults.recordSuccess.mockImplementation(async () => {
			versions.findVersionById.mockResolvedValue(completed);
		});

		expect(await service.attachBundle('project', appId, versionId, files, attempt)).toEqual(
			completed,
		);
		expect(buildResults.recordSuccess).toHaveBeenCalledWith(appId, versionId, files, attempt);
	});

	it('restores files and the label into a new version', async () => {
		const { service, sourceVersions } = createService();
		sourceVersions.readSource.mockResolvedValue(files);

		const restored = await service.restoreSource('project', appId, versionId, versionId);

		expect(restored.id).not.toBe(versionId);
		expect(sourceVersions.createVersion).toHaveBeenCalledWith(
			{ id: restored.id, appId, expectedDraftVersionId: versionId, label: 'Original' },
			files,
		);
	});

	it('returns an accepted save when retention fails', async () => {
		const { service, retention } = createService();
		retention.prune.mockRejectedValue(new Error('Cleanup failed.'));

		const saved = await service.saveSource('project', appId, versionId, files);

		expect(saved.id).not.toBe(versionId);
		expect(retention.prune).toHaveBeenCalledWith(appId);
	});

	it.each(['Updated', null])('returns the version after setting its label to %s', async (label) => {
		const { service, versions, version } = createService();
		versions.setLabel.mockImplementation(async (id, nextLabel) => ({
			...version,
			id,
			label: nextLabel,
		}));

		expect(await service.setLabel('project', appId, versionId, label)).toEqual({
			...version,
			label,
		});
		expect(versions.setLabel).toHaveBeenCalledWith(versionId, label);
	});

	it('rejects an oversized label before changing the version', async () => {
		const { service, versions } = createService();

		await expect(service.setLabel('project', appId, versionId, 'a'.repeat(256))).rejects.toThrow(
			BadRequestError,
		);

		expect(versions.setLabel).not.toHaveBeenCalled();
	});
});
