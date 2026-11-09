import type { AppBinding, AppBuildResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';

import type { AppActor, AppBuildOrigin } from '../app-events';
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
		origin: AppBuildOrigin = {},
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
			return await this.builds.build(projectId, appId, version.id, false, {
				changeSource: expectedDraftVersionId === null ? 'initial' : 'chat',
				...origin,
			});
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
	 * bindings do not change the bundle. Otherwise it starts its own build. An app
	 * without a version gets its first version from the scaffold.
	 */
	async saveBindings(
		projectId: string,
		appId: string,
		expectedDraftVersionId: string | null,
		bindings: AppBinding[],
		actor?: AppActor,
	): Promise<{ version: AppVersion; previousBindings: AppBinding[] }> {
		this.builds.assertNotStopping();
		const origin: AppBuildOrigin = { ...actor, changeSource: 'bindings' };
		if (expectedDraftVersionId === null) {
			const version = await this.saveAndStartBuild(
				projectId,
				appId,
				null,
				createAppScaffold(),
				null,
				bindings,
				origin,
			);
			return { version, previousBindings: [] };
		}
		const draft = await this.versions.getVersion(projectId, appId, expectedDraftVersionId);
		const previousBindings = draft.bindings;
		if (draft.buildStatus === 'succeeded' && draft.bundleArtifactId !== null) {
			const version = await this.versions.copyDraft(
				projectId,
				appId,
				expectedDraftVersionId,
				bindings,
			);
			return { version, previousBindings };
		}
		const version = await this.saveAndStartBuild(
			projectId,
			appId,
			expectedDraftVersionId,
			await this.versions.readSource(projectId, appId, expectedDraftVersionId),
			draft.label,
			bindings,
			origin,
		);
		return { version, previousBindings };
	}

	/** Saves a version and starts its build without waiting for the build. */
	private async saveAndStartBuild(
		projectId: string,
		appId: string,
		expectedDraftVersionId: string | null,
		files: AppFiles,
		label: string | null,
		bindings: AppBinding[],
		origin: AppBuildOrigin,
	): Promise<AppVersion> {
		const version = await this.versions.saveSource(
			projectId,
			appId,
			expectedDraftVersionId,
			files,
			label,
			bindings,
		);
		await this.startBuildInBackground(projectId, appId, version.id, origin);
		return version;
	}

	private async startBuildInBackground(
		projectId: string,
		appId: string,
		versionId: string,
		origin: AppBuildOrigin = {},
	) {
		try {
			await this.builds.startBuild(projectId, appId, versionId, false, origin);
		} catch (error) {
			// The version is saved. The build status shows the problem, and the user can retry it.
			this.logger.warn('Could not start the build of an app version.', {
				projectId,
				appId,
				versionId,
				error,
			});
		}
	}

	// TODO: might remove this later, as it's likely that the AI assistant
	// will receive the app "template", make edits to it and only then create
	// an initial version of the app. Keeping it for now for testing
	async scaffold(projectId: string, appId: string): Promise<AppBuildResponse> {
		return await this.commit(projectId, appId, null, createAppScaffold());
	}

	/**
	 * Restores the source, label and bindings of a version into a new version and
	 * starts its build without waiting for it. The caller checks the bindings.
	 */
	async startRestore(
		projectId: string,
		appId: string,
		versionId: string,
		expectedDraftVersionId: string | null,
		actor?: AppActor,
	): Promise<AppVersion> {
		this.builds.assertNotStopping();
		const version = await this.versions.restoreSource(
			projectId,
			appId,
			versionId,
			expectedDraftVersionId,
		);
		await this.startBuildInBackground(projectId, appId, version.id, {
			...actor,
			changeSource: 'restore',
		});
		return version;
	}
}
