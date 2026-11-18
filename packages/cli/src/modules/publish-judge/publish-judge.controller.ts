import { PutPublishJudgeDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Post, ProjectScope, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { PublishJudgeReviewService } from './publish-judge-review.service';
import { PublishJudgeSettingsService } from './publish-judge-settings.service';

const SUMMARY_DAYS = 7;

/**
 * An instance admin sets every judge, the instance one and the one of each project, so a
 * project cannot remove the review that applies to it. Prototype: this reuses the node type
 * policy scope until the feature has a scope of its own.
 */
@RestController('/publish-judge')
export class PublishJudgeInstanceController {
	constructor(
		private readonly settings: PublishJudgeSettingsService,
		private readonly reviews: PublishJudgeReviewService,
	) {}

	@Get('/')
	@GlobalScope('nodeTypePolicy:manage')
	async get() {
		return await this.settings.get(null);
	}

	@Put('/')
	@GlobalScope('nodeTypePolicy:manage')
	async put(req: AuthenticatedRequest, _res: Response, @Body dto: PutPublishJudgeDto) {
		return await this.settings.set(null, dto, req.user);
	}

	@Get('/projects')
	@GlobalScope('nodeTypePolicy:manage')
	async listProjectJudges() {
		return await this.settings.listProjectJudges();
	}

	@Get('/reviews')
	@GlobalScope('nodeTypePolicy:manage')
	async listReviews() {
		return await this.reviews.list();
	}

	@Get('/reviews/summary')
	@GlobalScope('nodeTypePolicy:manage')
	async summarizeReviews() {
		return await this.reviews.summary(SUMMARY_DAYS);
	}

	@Get('/library')
	@GlobalScope('nodeTypePolicy:manage')
	async getLibrary() {
		return { projectId: await this.settings.getLibraryProjectId() };
	}

	@Post('/library')
	@GlobalScope('nodeTypePolicy:manage')
	async createLibrary(req: AuthenticatedRequest) {
		return { projectId: await this.settings.ensureLibraryProject(req.user) };
	}
}

@RestController('/projects/:projectId/publish-judge')
export class PublishJudgeProjectController {
	constructor(private readonly settings: PublishJudgeSettingsService) {}

	/** Open to the project, so its members can see which judge reviews their publishes. */
	@Get('/')
	@ProjectScope('project:read')
	async get(req: AuthenticatedRequest<{ projectId: string }>) {
		return await this.settings.get(req.params.projectId);
	}

	@Put('/')
	@GlobalScope('nodeTypePolicy:manage')
	async put(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body dto: PutPublishJudgeDto,
	) {
		return await this.settings.set(req.params.projectId, dto, req.user);
	}
}
