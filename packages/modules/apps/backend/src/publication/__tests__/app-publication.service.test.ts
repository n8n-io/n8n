import { EventService } from '@n8n/backend-services';
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
	const events = mock<EventService>();
	locks.withLockContext.mockImplementation(async (_key, fn) => await fn({}));
	apps.findInProject.mockResolvedValue(mock<App>({ id: appId }));
	versions.findVersionById.mockResolvedValue(
		mock<AppVersion>({ id: versionId, appId, buildStatus: 'succeeded', bundleArtifactId: 1 }),
	);
	return {
		apps,
		versions,
		hosts,
		locks,
		events,
		service: new AppPublicationService(apps, versions, hosts, locks, events),
	};
}

describe('AppPublicationService', () => {
	it('publishes an explicitly selected version without advancing the draft', async () => {
		const { service, apps } = setup();
		await service.publish('project', appId, versionId);
		expect(apps.setPublishedVersion).toHaveBeenCalledWith(
			'project',
			appId,
			versionId,
			undefined,
			{},
		);
		expect(apps.advanceDraft).not.toHaveBeenCalled();
	});

	it('saves the version details and the visibility in the publication lock', async () => {
		const { service, apps, versions, locks } = setup();
		await service.publish('project', appId, versionId, {
			label: 'Launch',
			description: 'Adds charts',
			visibility: 'instance',
		});
		expect(locks.withLockContext).toHaveBeenCalledOnce();
		expect(versions.setDetails).toHaveBeenCalledWith(
			versionId,
			{ label: 'Launch', description: 'Adds charts' },
			{},
		);
		expect(apps.setPublishedVersion).toHaveBeenCalledWith(
			'project',
			appId,
			versionId,
			'instance',
			{},
		);
	});

	it('stores an empty description as null', async () => {
		const { service, versions } = setup();
		await service.publish('project', appId, versionId, { label: 'Launch', description: '' });
		expect(versions.setDetails).toHaveBeenCalledWith(
			versionId,
			{ label: 'Launch', description: null },
			{},
		);
	});

	it('saves nothing when the version is not built', async () => {
		const { service, apps, versions } = setup();
		versions.findVersionById.mockResolvedValue(
			mock<AppVersion>({ id: versionId, appId, buildStatus: 'failed', bundleArtifactId: null }),
		);
		await expect(
			service.publish('project', appId, versionId, { label: 'Launch', visibility: 'instance' }),
		).rejects.toThrow('successful app version');
		expect(versions.setDetails).not.toHaveBeenCalled();
		expect(apps.setPublishedVersion).not.toHaveBeenCalled();
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
		expect(versions.setDetails).not.toHaveBeenCalled();
		expect(apps.setPublishedVersion).toHaveBeenCalledWith('project', appId, null, undefined, {});
	});

	describe('telemetry events', () => {
		const actor = { userId: 'user-1' };

		it.each([
			{ publishedVersionId: null, isFirstPublish: true },
			{ publishedVersionId: '33333333-3333-4333-8333-333333333333', isFirstPublish: false },
		])(
			'emits app-published with isFirstPublish $isFirstPublish',
			async ({ publishedVersionId, isFirstPublish }) => {
				const { service, apps, events } = setup();
				apps.findInProject.mockResolvedValue(
					mock<App>({ id: appId, visibility: 'instance', publishedVersionId }),
				);

				await service.publish('project', appId, versionId, {}, actor);

				expect(events.emit).toHaveBeenCalledExactlyOnceWith('app-published', {
					...actor,
					appId,
					versionId,
					visibility: 'instance',
					isFirstPublish,
				});
			},
		);

		it('emits app-unpublished when the version is null', async () => {
			const { service, apps, events } = setup();
			apps.findInProject.mockResolvedValue(mock<App>({ id: appId, publishedVersionId: versionId }));

			await service.publish('project', appId, null, {}, actor);

			expect(events.emit).toHaveBeenCalledExactlyOnceWith('app-unpublished', { ...actor, appId });
		});

		it.each([
			{ name: 'unpublishing an unpublished app', publishedVersionId: null, target: null },
			{
				name: 'publishing the published version again',
				publishedVersionId: versionId,
				target: versionId,
			},
		])('emits nothing when $name', async ({ publishedVersionId, target }) => {
			const { service, apps, events } = setup();
			apps.findInProject.mockResolvedValue(mock<App>({ id: appId, publishedVersionId }));

			await service.publish('project', appId, target, {}, actor);

			expect(events.emit).not.toHaveBeenCalled();
		});

		it('reports the visibility chosen in the publish dialog and its change', async () => {
			const { service, apps, events } = setup();
			apps.findInProject.mockResolvedValue(
				mock<App>({ id: appId, visibility: 'project', publishedVersionId: null }),
			);

			await service.publish(
				'project',
				appId,
				versionId,
				{ label: 'Launch', visibility: 'instance' },
				actor,
			);

			expect(events.emit).toHaveBeenCalledWith('app-visibility-changed', {
				...actor,
				appId,
				from: 'project',
				to: 'instance',
			});
			expect(events.emit).toHaveBeenCalledWith(
				'app-published',
				expect.objectContaining({ visibility: 'instance' }),
			);
			expect(events.emit).toHaveBeenCalledTimes(2);
		});

		it('reports only the visibility change when the published version is published again', async () => {
			const { service, apps, events } = setup();
			apps.findInProject.mockResolvedValue(
				mock<App>({ id: appId, visibility: 'project', publishedVersionId: versionId }),
			);

			await service.publish('project', appId, versionId, { visibility: 'instance' }, actor);

			expect(events.emit).toHaveBeenCalledExactlyOnceWith(
				'app-visibility-changed',
				expect.objectContaining({ from: 'project', to: 'instance' }),
			);
		});

		it('emits nothing when the publish is rejected', async () => {
			const { service, hosts, events } = setup();
			hosts.origin.mockReturnValue(null);

			await expect(service.publish('project', appId, versionId, {}, actor)).rejects.toThrow();
			expect(events.emit).not.toHaveBeenCalled();
		});
	});
});
