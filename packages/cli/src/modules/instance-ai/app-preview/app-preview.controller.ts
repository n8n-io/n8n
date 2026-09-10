import {
	ApplyAppThemeDto,
	EnsureAppPreviewDto,
	PublishAppDto,
	type AppPreviewStatus,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { AppPublishResult } from '@n8n/instance-ai';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AppPublishService, type AppPublishDraft } from '@/modules/apps/app-publish.service';
import { AppThemeService } from '@/modules/apps/app-theme.service';
import { AppsService } from '@/modules/apps/apps.service';
import { InstanceWriteAccessService } from '@/services/instance-write-access.service';

import { AppPreviewService } from './app-preview.service';
import { InstanceAiMemoryService } from '../instance-ai-memory.service';
import { InstanceAiService } from '../instance-ai.service';

@RestController('/projects/:projectId/apps')
export class AppPreviewController {
	constructor(
		private readonly appPreviewService: AppPreviewService,
		private readonly appsService: AppsService,
		private readonly instanceAiService: InstanceAiService,
		private readonly memoryService: InstanceAiMemoryService,
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

	/** A thread that is not the caller's is reported as missing, not as forbidden. */
	private async assertThreadOwned(userId: string, threadId: string) {
		const ownership = await this.memoryService.checkThreadOwnership(userId, threadId);
		if (ownership !== 'owned') throw new NotFoundError('Thread not found');
	}

	/**
	 * Starts (or confirms) the app's preview in the thread's sandbox and returns
	 * its URL: a dev server where the sandbox service can route to it, a build
	 * served from the sandbox filesystem otherwise. A thread that has not held
	 * the app yet gets its sandbox created and the app's newest stored source
	 * restored into it first.
	 */
	@Post('/:appId/preview')
	@ProjectScope('app:read')
	async ensure(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Body dto: EnsureAppPreviewDto,
	): Promise<AppPreviewStatus> {
		const app = await this.getAppInProject(appId, req.params.projectId);
		await this.assertThreadOwned(req.user.id, dto.threadId);

		const access = await this.instanceAiService.getAppPreviewSandbox(req.user);
		if (!access.enabled) return { status: 'unsupported', reason: 'provider' };

		return await this.appPreviewService.ensure({
			threadId: dto.threadId,
			appId: app.id,
			projectId: app.projectId,
			namespace: app.namespace,
			userId: req.user.id,
			sandbox: access.n8nSandbox,
			hasActiveRun: () => this.instanceAiService.hasActiveRun(dto.threadId),
			getWorkspace: async () =>
				await this.instanceAiService.getOrCreateWorkspace(dto.threadId, req.user),
			getSourceTarball: async () => await this.appsService.getSourceTarball(app.id),
		});
	}

	/**
	 * Builds the app's newest source in n8n's build sandbox and makes it the
	 * served version. With a `threadId`, the thread's current draft is stored
	 * first so the publish carries the edits the user sees in the live preview.
	 * A failed build answers 200 with an `error` payload, like the agent's tool.
	 */
	@Post('/:appId/publish')
	@ProjectScope('app:update')
	async publish(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Body dto: PublishAppDto,
	): Promise<AppPublishResult> {
		this.checkInstanceWriteAccess();
		const app = await this.getAppInProject(appId, req.params.projectId);
		const draft = dto.threadId ? await this.resolveDraft(req.user.id, dto.threadId) : undefined;
		return await this.appPublishService.publish(app.id, req.user, { draft });
	}

	/**
	 * Persists the theme and writes it into the app's draft source: into the
	 * thread's live sandbox when there is one (the dev server reloads it), else
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
		const draft = dto.threadId ? await this.resolveDraft(req.user.id, dto.threadId) : undefined;
		await this.appsService.updateApp(app.id, { theme: dto.theme });
		const result = await this.appThemeService.applyTheme(app.id, dto.theme, req.user, { draft });
		if ('error' in result) throw new BadRequestError(result.message);
		return await this.appsService.toResponse(await this.appsService.getApp(app.id));
	}

	/** The thread's live sandbox, when the caller owns the thread and a run already created it. */
	private async resolveDraft(
		userId: string,
		threadId: string,
	): Promise<AppPublishDraft | undefined> {
		await this.assertThreadOwned(userId, threadId);
		const workspace = this.instanceAiService.getCachedWorkspace(threadId);
		return workspace ? { threadId, workspace } : undefined;
	}
}
