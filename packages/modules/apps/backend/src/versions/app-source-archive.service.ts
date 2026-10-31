import type { AppBuildResponse } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { AppArchive } from '../app-archive';
import { AppsService } from '../apps.service';
import { createAppScaffold } from '../scaffold/app-scaffold';
import { AppChangeService } from './app-change.service';
import { AppVersionService } from './app-version.service';

/** Moves the source of an app in and out of an editing workspace as one archive. */
@Service()
export class AppSourceArchiveService {
	constructor(
		private readonly apps: AppsService,
		private readonly versions: AppVersionService,
		private readonly changes: AppChangeService,
		private readonly archives: AppArchive,
	) {}

	/** The draft source, or the scaffold when the app has no version yet. */
	async exportDraft(
		projectId: string,
		appId: string,
	): Promise<{ baseVersionId: string | null; archive: Buffer }> {
		const { draftVersionId } = await this.apps.getApp(projectId, appId);
		const files = draftVersionId
			? await this.versions.readSource(projectId, appId, draftVersionId)
			: createAppScaffold();
		return { baseVersionId: draftVersionId, archive: await this.archives.pack(files) };
	}

	/** Saves the archive as a new version on top of `baseVersionId` and builds it. */
	async commit(
		projectId: string,
		appId: string,
		baseVersionId: string | null,
		archive: Buffer,
		label: string | null,
	): Promise<AppBuildResponse> {
		const files = await this.archives.unpack(archive);
		return await this.changes.commit(projectId, appId, baseVersionId, files, label);
	}
}
