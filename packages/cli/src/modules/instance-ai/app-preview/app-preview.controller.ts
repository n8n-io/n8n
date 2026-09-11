import { ApplyAppThemeDto, SaveAppDraftFileDto, type AppPreviewStatus } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Param, Post, ProjectScope, Put, RestController } from '@n8n/decorators';
import type { AppPublishResult } from '@n8n/instance-ai';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AppDraftService } from '@/modules/apps/app-draft.service';
import { AppPublishService } from '@/modules/apps/app-publish.service';
import { AppThemeService, deriveAppTheme } from '@/modules/apps/app-theme.service';
import { AppsService } from '@/modules/apps/apps.service';
import { AppVersionFileNotFoundError } from '@/modules/apps/errors/app-version-file-not-found.error';
import { pathSegments } from '@/modules/apps/serving/path-segments';
import { InstanceWriteAccessService } from '@/services/instance-write-access.service';

import { AppPreviewService } from './app-preview.service';
import { InstanceAiService } from '../instance-ai.service';
import { appSandboxKey } from '../sandbox';

/** One path segment: no `.`/`..`, separators or control characters. */
const SAFE_SEGMENT = /^(?!\.{1,2}$)[^/\\\0]+$/;

@RestController('/projects/:projectId/apps')
export class AppPreviewController {
	constructor(
		private readonly appPreviewService: AppPreviewService,
		private readonly appsService: AppsService,
		private readonly instanceAiService: InstanceAiService,
		private readonly appPublishService: AppPublishService,
		private readonly appThemeService: AppThemeService,
		private readonly appDraftService: AppDraftService,
		private readonly instanceWriteAccess: InstanceWriteAccessService,
	) {}

	private checkInstanceWriteAccess(): void {
		if (this.instanceWriteAccess.isReadOnly()) {
			throw new ForbiddenError(
				'Cannot modify apps on a protected instance. This instance is in read-only mode.',
			);
		}
	}

	private async getAppInProject(appId: string, projectId: string) {
		const app = await this.appsService.getApp(appId);
		if (app.projectId !== projectId) throw new NotFoundError('App not found');
		return app;
	}

	/**
	 * Starts (or confirms) the app's preview in the app's sandbox and returns
	 * its URL: a dev server where the sandbox service can route to it, a build
	 * served from the sandbox filesystem otherwise. An app whose sandbox does
	 * not exist yet gets it created and the newest stored source restored into
	 * it first. A request that follows the end of a turn answers only after the
	 * turn's source snapshot has landed, so the caller can read the app's
	 * publish state right after.
	 */
	@Post('/:appId/preview')
	@ProjectScope('app:read')
	async ensure(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
	): Promise<AppPreviewStatus> {
		const app = await this.getAppInProject(appId, req.params.projectId);

		const access = await this.instanceAiService.getAppPreviewSandbox(req.user);
		if (!access.enabled) return { status: 'unsupported', reason: 'provider' };

		await this.instanceAiService.awaitPendingSnapshot(app.id);
		return await this.appPreviewService.ensure({
			appId: app.id,
			projectId: app.projectId,
			namespace: app.namespace,
			userId: req.user.id,
			sandbox: access.n8nSandbox,
			hasActiveRun: () => this.instanceAiService.hasActiveRunForApp(app.id),
			getWorkspace: async () =>
				await this.instanceAiService.getOrCreateWorkspace(appSandboxKey(app.id), req.user),
			getSourceTarball: async () => await this.appsService.getSourceTarball(app.id),
		});
	}

	/**
	 * Builds the app's newest source in n8n's build sandbox and makes it the
	 * served version. The app sandbox's current draft is stored first, when
	 * there is one, so the publish carries the edits the user sees in the live
	 * preview. A failed build answers 200 with an `error` payload, like the
	 * agent's tool.
	 */
	@Post('/:appId/publish')
	@ProjectScope('app:update')
	async publish(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
	): Promise<AppPublishResult> {
		this.checkInstanceWriteAccess();
		const app = await this.getAppInProject(appId, req.params.projectId);
		return await this.appPublishService.publish(app.id, req.user, {
			draft: this.instanceAiService.getCachedWorkspace(appSandboxKey(app.id)),
		});
	}

	/**
	 * Persists the theme and writes it into the app's draft source: into the
	 * app's live sandbox when there is one (the dev server reloads it), else
	 * into a new snapshot of the newest stored source. Publishing stays explicit.
	 */
	@Post('/:appId/theme')
	@ProjectScope('app:update')
	async applyTheme(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Body dto: ApplyAppThemeDto,
	) {
		this.checkInstanceWriteAccess();
		const app = await this.getAppInProject(appId, req.params.projectId);
		const theme = deriveAppTheme(dto.settings);
		await this.appsService.updateApp(app.id, { theme });
		const result = await this.appThemeService.applyTheme(app.id, theme, req.user, {
			draft: this.instanceAiService.getCachedWorkspace(appSandboxKey(app.id)),
		});
		if ('error' in result) throw new BadRequestError(result.message);
		return await this.appsService.toResponse(await this.appsService.getApp(app.id));
	}

	/**
	 * Files of the app's draft: the newest stored source, after the app
	 * sandbox's current edits are stored when it has one. Read a file's content
	 * from `GET /:appId/versions/:versionId/files/*` with the returned id.
	 */
	@Get('/:appId/draft/files')
	@ProjectScope('app:read')
	async listDraftFiles(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
	): Promise<{ versionId: string; files: string[] } | null> {
		const app = await this.getAppInProject(appId, req.params.projectId);
		return await this.appDraftService.listFiles(
			app.id,
			req.user,
			this.instanceAiService.getCachedWorkspace(appSandboxKey(app.id)),
		);
	}

	/**
	 * Overwrites one existing file of the draft in the app's sandbox (the dev
	 * server reloads it), creating the sandbox and restoring the newest stored
	 * source into it first when needed. Nothing is built; publishing stays
	 * explicit.
	 */
	@Put('/:appId/draft/files{/*path}')
	@ProjectScope('app:update')
	async saveDraftFile(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Param('path') wildcardPath: unknown,
		@Body dto: SaveAppDraftFileDto,
	) {
		this.checkInstanceWriteAccess();
		const app = await this.getAppInProject(appId, req.params.projectId);
		const segments = pathSegments(wildcardPath);
		if (segments.length === 0) throw new BadRequestError('A file path is required');
		// The path is joined into sandbox and temp-dir paths as-is, so every
		// segment must be a plain file name; the file must also exist already.
		if (!segments.every((segment) => SAFE_SEGMENT.test(segment))) {
			throw new BadRequestError('Invalid file path');
		}
		const file = segments.join('/');
		const result = await this.appDraftService.write(
			app.id,
			req.user,
			async (read) => {
				if ((await read(file)) === undefined) throw new AppVersionFileNotFoundError(file);
				return { [file]: dto.content };
			},
			await this.instanceAiService.getOrCreateWorkspace(appSandboxKey(app.id), req.user),
			`Edited ${file}`,
		);
		if ('error' in result) throw new BadRequestError(result.message);
		return await this.appsService.toResponse(await this.appsService.getApp(app.id));
	}
}
