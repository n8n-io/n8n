import { DbLock, DbLockService, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, NotFoundError } from '@n8n/errors';

import { AppArchive } from '../app-archive';
import {
	AppSourceVersionStore,
	AppBuildResultStore,
	type AppFiles,
	type NewSourceVersion,
} from './app-version-stores';
import { AppArtifactService } from './app-artifact.service';
import type { AppBuildAttempt } from '../build/app-build.types';
import { appStorageLockSubKey } from './app-storage-lock';
import { AppVersionRepository } from '../versions/app-version.repository';
import { AppRepository } from '../app.repository';
import { AppsConfig } from '../apps.config';

@Service()
export class SnapshotAppSourceVersionStore extends AppSourceVersionStore {
	constructor(
		private readonly archives: AppArchive,
		private readonly artifacts: AppArtifactService,
		private readonly versions: AppVersionRepository,
		private readonly apps: AppRepository,
		private readonly locks: DbLockService,
	) {
		super();
	}

	async createVersion(version: NewSourceVersion, files: AppFiles): Promise<void> {
		const artifact = await this.artifacts.upload(version.appId, await this.archives.pack(files));
		try {
			await this.locks.withLockContext(
				DbLock.APPS_STORAGE,
				async (ctx) => {
					if (!(await this.apps.findById(version.appId, ctx))) {
						throw new NotFoundError('App not found.');
					}
					await this.artifacts.completeUpload(artifact, ctx);
					await this.versions.insertVersion(
						{
							id: version.id,
							appId: version.appId,
							label: version.label,
							sourceArtifactId: artifact.id,
						},
						ctx,
					);
					if (
						!(await this.apps.advanceDraft(
							version.appId,
							version.expectedDraftVersionId,
							version.id,
							ctx,
						))
					) {
						throw new ConflictError('The app draft changed. Reload the source before saving.');
					}
				},
				{ subKey: appStorageLockSubKey(version.appId) },
			);
		} catch (error) {
			await this.artifacts.discard(artifact);
			throw error;
		}
	}

	async readSource(versionId: string): Promise<AppFiles> {
		return await this.archives.unpack(await this.readSourceArchive(versionId));
	}

	async listSourceFiles(versionId: string): Promise<string[]> {
		return await this.archives.listFiles(await this.readSourceArchive(versionId));
	}

	async readSourceFile(versionId: string, filePath: string): Promise<Buffer | null> {
		return await this.archives.readFile(await this.readSourceArchive(versionId), filePath);
	}

	private async readSourceArchive(versionId: string): Promise<Buffer> {
		const version = await this.versions.findVersionById(versionId);
		if (!version) throw new NotFoundError('App version not found.');
		return await this.artifacts.read(version.sourceArtifactId);
	}

	async removeVersions(versionIds: string[], ctx: OperationContext): Promise<void> {
		await this.versions.removeVersions(versionIds, ctx);
	}
}

@Service()
export class SnapshotAppBuildResultStore extends AppBuildResultStore {
	constructor(
		private readonly archives: AppArchive,
		private readonly artifacts: AppArtifactService,
		private readonly versions: AppVersionRepository,
		private readonly locks: DbLockService,
		private readonly config: AppsConfig,
	) {
		super();
	}

	async recordSuccess(
		appId: string,
		versionId: string,
		files: AppFiles,
		attempt: AppBuildAttempt,
	): Promise<void> {
		const artifact = await this.artifacts.upload(appId, await this.archives.pack(files, true));
		try {
			await this.locks.withLockContext(
				DbLock.APPS_STORAGE,
				async (ctx) => {
					const version = await this.versions.findVersionById(versionId, ctx);
					if (!version || version.appId !== appId)
						throw new NotFoundError('App version not found.');
					await this.artifacts.completeUpload(artifact, ctx);
					this.assertBuildNotTimedOut(attempt);
					if (
						!(await this.versions.attachBundle(versionId, artifact.id, attempt.attemptNumber, ctx))
					) {
						throw new ConflictError(
							'This app version cannot accept a bundle. Check its build status.',
						);
					}
					this.assertBuildNotTimedOut(attempt);
				},
				{ subKey: appStorageLockSubKey(appId) },
			);
		} catch (error) {
			await this.artifacts.discard(artifact);
			throw error;
		}
	}

	async readBundle(versionId: string): Promise<AppFiles> {
		const version = await this.versions.findVersionById(versionId);
		if (!version) throw new NotFoundError('App version not found.');
		if (version.bundleArtifactId === null) throw new NotFoundError('App bundle not found.');
		return await this.archives.unpack(await this.artifacts.read(version.bundleArtifactId), true);
	}

	async removeBundles(versionIds: string[], ctx: OperationContext): Promise<void> {
		await this.versions.clearBundles(versionIds, ctx);
	}

	private assertBuildNotTimedOut(attempt: AppBuildAttempt): void {
		if (Date.now() >= attempt.startedAt.getTime() + this.config.buildTimeoutMs) {
			throw new ConflictError('The app build timed out. Retry the build.');
		}
	}
}
