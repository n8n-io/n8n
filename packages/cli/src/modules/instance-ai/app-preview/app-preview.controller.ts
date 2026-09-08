import { EnsureAppPreviewDto, type AppPreviewStatus } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AppsService } from '@/modules/apps/apps.service';

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
	) {}

	/** Starts (or confirms) the app's dev server in the thread's sandbox and returns its preview URL. */
	@Post('/:appId/preview')
	@ProjectScope('app:read')
	async ensure(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Body dto: EnsureAppPreviewDto,
	): Promise<AppPreviewStatus> {
		const app = await this.appsService.getApp(appId);
		if (app.projectId !== req.params.projectId) throw new NotFoundError('App not found');
		// A thread that is not the caller's is reported as missing, not as forbidden.
		const ownership = await this.memoryService.checkThreadOwnership(req.user.id, dto.threadId);
		if (ownership !== 'owned') throw new NotFoundError('Thread not found');

		const sandbox = await this.instanceAiService.getN8nSandboxConfig(req.user);
		if (!sandbox) return { status: 'unsupported', reason: 'provider' };

		return await this.appPreviewService.ensure({
			threadId: dto.threadId,
			appId: app.id,
			projectId: app.projectId,
			namespace: app.namespace,
			userId: req.user.id,
			sandbox,
		});
	}
}
