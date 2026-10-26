import { appSchema, appVersionSchema } from '@n8n/api-types';
import { DbLock, DbLockService } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';

import { AppRepository } from '../app.repository';
import { AppHostService } from '../serving/app-host.service';
import { appStorageLockSubKey } from '../storage/app-storage-lock';
import { AppVersionRepository } from '../versions/app-version.repository';

@Service()
export class AppPublicationService {
	constructor(
		private readonly apps: AppRepository,
		private readonly versions: AppVersionRepository,
		private readonly hosts: AppHostService,
		private readonly locks: DbLockService,
	) {}

	async publish(projectId: string, appId: string, versionId: string | null) {
		if (
			!appSchema.shape.id.safeParse(appId).success ||
			(versionId !== null && !appVersionSchema.shape.id.safeParse(versionId).success)
		) {
			throw new NotFoundError('App or version not found.');
		}
		await this.locks.withLockContext(
			DbLock.APPS_STORAGE,
			async (ctx) => {
				const app = await this.apps.findInProject(projectId, appId, ctx);
				if (!app) throw new NotFoundError('App not found.');
				if (versionId !== null) {
					if (!this.hosts.origin(app.namespace)) {
						throw new BadRequestError('Use a valid app namespace before publishing this app.');
					}
					const version = await this.versions.findVersionById(versionId, ctx);
					if (!version || version.appId !== appId)
						throw new NotFoundError('App version not found.');
					if (version.buildStatus !== 'succeeded' || version.bundleArtifactId === null) {
						throw new ConflictError('Select a successful app version with a stored bundle.');
					}
				}
				await this.apps.setPublishedVersion(projectId, appId, versionId, ctx);
			},
			{ subKey: appStorageLockSubKey(appId) },
		);
	}
}
