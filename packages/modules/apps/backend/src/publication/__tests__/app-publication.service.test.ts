import { DbLockService } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { AppPublicationService } from '../app-publication.service';
import { AppRepository } from '../../app.repository';
import { AppHostService } from '../../serving/app-host.service';
import { AppVersionRepository } from '../../versions/app-version.repository';
import type { App } from '../../app.entity';
import type { AppVersion } from '../../versions/app-version.entity';

const appId = '11111111-1111-4111-8111-111111111111';
const versionId = '22222222-2222-4222-8222-222222222222';

function setup() {
	const apps = mock<AppRepository>();
	const versions = mock<AppVersionRepository>();
	const hosts = mock<AppHostService>();
	hosts.origin.mockReturnValue('https://sales.apps.example.com');
	const locks = mock<DbLockService>();
	locks.withLockContext.mockImplementation(async (_key, fn) => await fn({}));
	apps.findInProject.mockResolvedValue(mock<App>({ id: appId }));
	versions.findVersionById.mockResolvedValue(
		mock<AppVersion>({ id: versionId, appId, buildStatus: 'succeeded', bundleArtifactId: 1 }),
	);
	return {
		apps,
		versions,
		hosts,
		service: new AppPublicationService(apps, versions, hosts, locks),
	};
}

describe('AppPublicationService', () => {
	it('publishes an explicitly selected version without advancing the draft', async () => {
		const { service, apps } = setup();
		await service.publish('project', appId, versionId);
		expect(apps.setPublishedVersion).toHaveBeenCalledWith('project', appId, versionId, {});
		expect(apps.advanceDraft).not.toHaveBeenCalled();
	});

	it('rejects publication without a valid app namespace', async () => {
		const { service, apps, hosts } = setup();
		hosts.origin.mockReturnValue(null);

		await expect(service.publish('project', appId, versionId)).rejects.toThrow(
			'valid app namespace',
		);

		expect(apps.setPublishedVersion).not.toHaveBeenCalled();
	});

	it.each(['queued', 'running', 'failed'] as const)('rejects a %s build', async (buildStatus) => {
		const { service, versions, apps } = setup();
		versions.findVersionById.mockResolvedValue(
			mock<AppVersion>({ appId, buildStatus, bundleArtifactId: 1 }),
		);
		await expect(service.publish('project', appId, versionId)).rejects.toThrow(
			'successful app version',
		);
		expect(apps.setPublishedVersion).not.toHaveBeenCalled();
	});

	it('rejects a retained version whose bundle was pruned', async () => {
		const { service, versions } = setup();
		versions.findVersionById.mockResolvedValue(
			mock<AppVersion>({ appId, buildStatus: 'succeeded', bundleArtifactId: null }),
		);
		await expect(service.publish('project', appId, versionId)).rejects.toThrow('stored bundle');
	});

	it('rejects another app version and cross-project publication', async () => {
		const { service, versions, apps } = setup();
		versions.findVersionById.mockResolvedValue(mock<AppVersion>({ appId: 'other' }));
		await expect(service.publish('project', appId, versionId)).rejects.toThrow('version not found');
		apps.findInProject.mockResolvedValue(null);
		await expect(service.publish('other-project', appId, versionId)).rejects.toThrow(
			'App not found',
		);
	});

	it('unpublishes without requiring a build', async () => {
		const { service, versions, apps } = setup();
		await service.publish('project', appId, null);
		expect(versions.findVersionById).not.toHaveBeenCalled();
		expect(apps.setPublishedVersion).toHaveBeenCalledWith('project', appId, null, {});
	});
});
