import type { AppBinding, AppBuildResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';

import { AppBuildService } from '../build/app-build.service';
import { createAppScaffold } from '../scaffold/app-scaffold';
import type { AppVersion } from './app-version.entity';
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
		bindings?: AppBinding[],
	): Promise<AppBuildResponse> {
		this.builds.assertNotStopping();
		const version = await this.versions.saveSource(
			projectId,
			appId,
			expectedDraftVersionId,
			files,
			label,
			bindings,
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

	/**
	 * Saves the source of `expectedDraftVersionId` with other bindings as a new
	 * version. The new version shares a successful build of the draft, because
	 * bindings do not change the bundle. Otherwise it starts its own build.
	 */
	async saveBindings(
		projectId: string,
		appId: string,
		expectedDraftVersionId: string,
		bindings: AppBinding[],
	): Promise<AppVersion> {
		this.builds.assertNotStopping();
		const draft = await this.versions.getVersion(projectId, appId, expectedDraftVersionId);
		if (draft.buildStatus === 'succeeded' && draft.bundleArtifactId !== null) {
			return await this.versions.copyDraft(projectId, appId, expectedDraftVersionId, bindings);
		}
		const files = await this.versions.readSource(projectId, appId, expectedDraftVersionId);
		const version = await this.versions.saveSource(
			projectId,
			appId,
			expectedDraftVersionId,
			files,
			draft.label,
			bindings,
		);
		try {
			await this.builds.startBuild(projectId, appId, version.id);
		} catch (error) {
			// The bindings are saved. The build status shows the problem, and the user can retry it.
			this.logger.warn('Could not start the build of an app version.', {
				projectId,
				appId,
				versionId: version.id,
				error,
			});
		}
		return version;
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
		return await this.commit(
			projectId,
			appId,
			expectedDraftVersionId,
			files,
			version.label,
			version.bindings,
		);
	}
}
