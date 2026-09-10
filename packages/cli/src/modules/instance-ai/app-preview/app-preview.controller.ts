import { ApplyAppThemeDto, type AppPreviewStatus } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { AppPublishResult } from '@n8n/instance-ai';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AppPublishService } from '@/modules/apps/app-publish.service';
import { AppThemeService } from '@/modules/apps/app-theme.service';
import { AppsService } from '@/modules/apps/apps.service';
import { InstanceWriteAccessService } from '@/services/instance-write-access.service';

import { AppPreviewService } from './app-preview.service';
import { InstanceAiService } from '../instance-ai.service';
import { appSandboxKey } from '../sandbox';

@RestController('/projects/:projectId/apps')
export class AppPreviewController {
	constructor(
		private readonly appPreviewService: AppPreviewService,
		private readonly appsService: AppsService,
		private readonly instanceAiService: InstanceAiService,
		private readonly appPublishService: AppPublishService,
		private readonly appThemeService: AppThemeService,
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
		await this.appsService.updateApp(app.id, { theme: dto.theme });
		const result = await this.appThemeService.applyTheme(app.id, dto.theme, req.user, {
			draft: this.instanceAiService.getCachedWorkspace(appSandboxKey(app.id)),
		});
		if ('error' in result) throw new BadRequestError(result.message);
		return await this.appsService.toResponse(await this.appsService.getApp(app.id));
	}
}
