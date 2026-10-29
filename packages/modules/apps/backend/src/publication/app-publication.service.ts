import { appSchema, appVersionSchema } from '@n8n/api-types';
import { DbLock, DbLockService } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';

import { AppRepository } from '../app.repository';
import { AppHostService } from '../serving/app-host.service';
import { appStorageLockSubKey } from '../storage/app-storage-lock';
import { AppVersionRepository } from '../versions/app-version.repository';
import { assertBuiltVersion } from '../versions/assert-built-version';

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
					assertBuiltVersion(await this.versions.findVersionById(versionId, ctx), appId);
				}
				await this.apps.setPublishedVersion(projectId, appId, versionId, ctx);
			},
			{ subKey: appStorageLockSubKey(appId) },
		);
	}
}
