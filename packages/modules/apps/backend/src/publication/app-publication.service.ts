import { appSchema, appVersionSchema, type PublishAppDto } from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import { DbLock, DbLockService, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';

import type { AppActor } from '../app-events';
import type { App } from '../app.entity';
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
		private readonly events: EventService,
	) {}

	async assertCanPublish(projectId: string, appId: string, versionId: string) {
		this.assertValidIds(appId, versionId);
		const app = await this.apps.findInProject(projectId, appId);
		if (!app) throw new NotFoundError('App not found.');
		await this.assertPublishable(app, versionId);
	}

	async publish(
		projectId: string,
		appId: string,
		versionId: string | null,
		details: Partial<Omit<PublishAppDto, 'versionId'>> = {},
		actor?: AppActor,
	) {
		this.assertValidIds(appId, versionId);
		const before = await this.locks.withLockContext(
			DbLock.APPS_STORAGE,
			async (ctx) => {
				const app = await this.apps.findInProject(projectId, appId, ctx);
				if (!app) throw new NotFoundError('App not found.');
				if (versionId !== null) {
					await this.assertPublishable(app, versionId, ctx);
					if (details.label !== undefined) {
						await this.versions.setDetails(
							versionId,
							{ label: details.label, description: details.description || null },
							ctx,
						);
					}
				}
				await this.apps.setPublishedVersion(projectId, appId, versionId, details.visibility, ctx);
				return app;
			},
			{ subKey: appStorageLockSubKey(appId) },
		);
		const visibility = details.visibility ?? before.visibility;
		if (visibility !== before.visibility) {
			this.events.emit('app-visibility-changed', {
				...actor,
				appId,
				from: before.visibility,
				to: visibility,
			});
		}
		if (before.publishedVersionId === versionId) return;
		if (versionId === null) {
			this.events.emit('app-unpublished', { ...actor, appId });
		} else {
			this.events.emit('app-published', {
				...actor,
				appId,
				versionId,
				visibility,
				isFirstPublish: before.publishedVersionId === null,
			});
		}
	}

	private assertValidIds(appId: string, versionId: string | null) {
		if (
			!appSchema.shape.id.safeParse(appId).success ||
			(versionId !== null && !appVersionSchema.shape.id.safeParse(versionId).success)
		) {
			throw new NotFoundError('App or version not found.');
		}
	}

	private async assertPublishable(app: App, versionId: string, ctx?: OperationContext) {
		if (!this.hosts.origin(app.namespace)) {
			throw new BadRequestError('Use a valid app namespace before publishing this app.');
		}
		assertBuiltVersion(await this.versions.findVersionById(versionId, ctx), app.id);
	}
}
