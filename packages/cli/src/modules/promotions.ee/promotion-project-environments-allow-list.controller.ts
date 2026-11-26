import {
	ListPromotionProjectEnvironmentsAllowListQueryDto,
	UpdatePromotionProjectEnvironmentsAllowListDto,
	type PromotionProjectEnvironmentsAllowList,
	type PromotionProjectEnvironmentsAllowListResponse,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Get,
	GlobalScope,
	Licensed,
	Param,
	Patch,
	Query,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { PromotionProjectSettingsService } from './promotion-project-settings.service';

@RestController('/promotions/settings/project-environments/projects')
export class PromotionProjectEnvironmentsAllowListController {
	constructor(private readonly projectSettings: PromotionProjectSettingsService) {}

	@Get('/')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@GlobalScope('promotions:manageEnvironments')
	async list(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListPromotionProjectEnvironmentsAllowListQueryDto,
	): Promise<PromotionProjectEnvironmentsAllowList> {
		return await this.projectSettings.listEnvironmentsAllowList(query, req.ctx);
	}

	// Global scope on purpose: a project role must never set this value.
	@Patch('/:projectId')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@GlobalScope('promotions:manageEnvironments')
	async update(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Body dto: UpdatePromotionProjectEnvironmentsAllowListDto,
	): Promise<PromotionProjectEnvironmentsAllowListResponse> {
		return await this.projectSettings.setAllowEnvironments(req.user, projectId, dto, req.ctx);
	}
}
