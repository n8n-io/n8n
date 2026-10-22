import type { AppBuildResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';

import { AppBuildService } from '../build/app-build.service';
import { createAppScaffold } from '../scaffold/app-scaffold';
import { AppVersionService } from './app-version.service';
import type { AppFiles } from '../storage/app-version-stores';

@Service()
export class AppChangeService {
	constructor(
		private readonly versions: AppVersionService,
		private readonly builds: AppBuildService,
		private readonly logger: Logger,
	) {}

	async commit(
		projectId: string,
		appId: string,
		expectedDraftVersionId: string | null,
		files: AppFiles,
		label: string | null = null,
	): Promise<AppBuildResponse> {
		this.builds.assertNotStopping();
		const version = await this.versions.saveSource(
			projectId,
			appId,
			expectedDraftVersionId,
			files,
			label,
		);
		try {
			return await this.builds.build(projectId, appId, version.id);
		} catch (error) {
			if (error instanceof ConflictError) {
				const status = await this.builds.status(projectId, appId, version.id);
				this.logger.debug('Returning stored app build status after a conflict.', {
					projectId,
					appId,
					versionId: version.id,
					status: status.status,
				});
				return status;
			}
			throw error;
		}
	}

	// TODO: might remove this later, as it's likely that the AI assistant
	// will receive the app "template", make edits to it and only then create
	// an initial version of the app. Keeping it for now for testing
	async scaffold(projectId: string, appId: string): Promise<AppBuildResponse> {
		return await this.commit(projectId, appId, null, createAppScaffold());
	}

	async restore(
		projectId: string,
		appId: string,
		versionId: string,
		expectedDraftVersionId: string | null,
	): Promise<AppBuildResponse> {
		this.builds.assertNotStopping();
		const version = await this.versions.getVersion(projectId, appId, versionId);
		const files = await this.versions.readSource(projectId, appId, versionId);
		this.logger.debug('Restoring app source into a new version.', {
			projectId,
			appId,
			sourceVersionId: versionId,
			expectedDraftVersionId,
		});
		return await this.commit(projectId, appId, expectedDraftVersionId, files, version.label);
	}
}
