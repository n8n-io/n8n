import { appSchema, appVersionSchema } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';
import { v7 as uuidv7 } from 'uuid';

import { AppRetentionService } from './app-retention.service';
import type { AppVersion } from './app-version.entity';
import { AppVersionRepository } from './app-version.repository';
import { AppRepository } from './app.repository';
import {
	AppSourceVersionStore,
	AppBuildResultStore,
	type AppFiles,
} from './storage/app-version-stores';

@Service()
export class AppVersionService {
	constructor(
		private readonly apps: AppRepository,
		private readonly versions: AppVersionRepository,
		private readonly sourceVersions: AppSourceVersionStore,
		private readonly buildResults: AppBuildResultStore,
		private readonly retention: AppRetentionService,
		private readonly logger: Logger,
	) {}

	async saveSource(
		projectId: string,
		appId: string,
		expectedDraftVersionId: string | null,
		files: AppFiles,
		label: string | null = null,
	): Promise<AppVersion> {
		const app = await this.requireApp(projectId, appId);
		this.checkDraft(app.draftVersionId, expectedDraftVersionId);
		this.checkLabel(label);
		const versionId = uuidv7();
		await this.sourceVersions.createVersion(
			{ id: versionId, appId, expectedDraftVersionId, label },
			files,
		);
		const version = await this.requireVersion(versionId);
		await this.prune(appId);
		return version;
	}

	async attachBundle(
		projectId: string,
		appId: string,
		versionId: string,
		files: AppFiles,
	): Promise<AppVersion> {
		const target = await this.getVersion(projectId, appId, versionId);
		if (target.buildStatus !== 'queued' && target.buildStatus !== 'running') {
			throw new ConflictError('This app version cannot accept a bundle. Check its build status.');
		}
		await this.buildResults.recordSuccess(appId, versionId, files);
		const version = await this.requireVersion(versionId);
		await this.prune(appId);
		return version;
	}

	async listVersions(projectId: string, appId: string): Promise<AppVersion[]> {
		await this.requireApp(projectId, appId);
		return await this.versions.listForApp(appId);
	}

	async getVersion(
		projectId: string,
		appId: string,
		versionId: string,
		ctx: OperationContext = {},
	): Promise<AppVersion> {
		await this.requireApp(projectId, appId, ctx);
		const version = await this.requireVersion(versionId, ctx);
		if (version.appId !== appId) throw new NotFoundError('App version not found.');
		return version;
	}

	async readSource(projectId: string, appId: string, versionId: string): Promise<AppFiles> {
		const version = await this.getVersion(projectId, appId, versionId);
		return await this.sourceVersions.readSource(version.id);
	}

	async readBundle(projectId: string, appId: string, versionId: string): Promise<AppFiles> {
		const version = await this.getVersion(projectId, appId, versionId);
		return await this.buildResults.readBundle(version.id);
	}

	async restoreSource(
		projectId: string,
		appId: string,
		versionId: string,
		expectedDraftVersionId: string | null,
	): Promise<AppVersion> {
		const version = await this.getVersion(projectId, appId, versionId);
		const files = await this.sourceVersions.readSource(version.id);
		return await this.saveSource(projectId, appId, expectedDraftVersionId, files, version.label);
	}

	async setLabel(
		projectId: string,
		appId: string,
		versionId: string,
		label: string | null,
	): Promise<AppVersion> {
		this.checkLabel(label);
		await this.getVersion(projectId, appId, versionId);
		const version = await this.versions.setLabel(versionId, label);
		if (!version) throw new NotFoundError('App version not found.');
		return version;
	}

	private async requireApp(projectId: string, appId: string, ctx: OperationContext = {}) {
		if (!appSchema.shape.id.safeParse(appId).success) throw new NotFoundError('App not found.');
		const app = await this.apps.findInProject(projectId, appId, ctx);
		if (!app) throw new NotFoundError('App not found.');
		return app;
	}

	private async requireVersion(versionId: string, ctx: OperationContext = {}): Promise<AppVersion> {
		this.checkVersionId(versionId);
		const version = await this.versions.findVersionById(versionId, ctx);
		if (!version) throw new NotFoundError('App version not found.');
		return version;
	}

	private checkVersionId(versionId: string) {
		if (!appVersionSchema.shape.id.safeParse(versionId).success)
			throw new NotFoundError('App version not found.');
	}

	private checkDraft(actual: string | null, expected: string | null) {
		if (actual !== expected)
			throw new ConflictError('The app draft changed. Reload the source before saving.');
	}

	private checkLabel(label: string | null) {
		if (!appVersionSchema.shape.label.safeParse(label).success)
			throw new BadRequestError('App version labels must contain at most 255 characters.');
	}

	private async prune(appId: string) {
		try {
			await this.retention.prune(appId);
		} catch (error) {
			// A cleanup failure must not turn an accepted save into a failed request.
			this.logger.warn('Could not prune app history.', { appId, error });
		}
	}
}
