import { UpdatePublicApiRateLimitSettingsDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { PublicApiRateLimitSettingsService } from '@/public-api/public-api-rate-limit-settings.service';

@RestController('/settings/policies/rate-limits')
export class PublicApiRateLimitSettingsController {
	constructor(private readonly rateLimitSettingsService: PublicApiRateLimitSettingsService) {}

	@Get('/')
	@GlobalScope('securitySettings:manage')
	async getSettings() {
		return await this.rateLimitSettingsService.getSettings();
	}

	@Put('/')
	@GlobalScope('securitySettings:manage')
	async updateSettings(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdatePublicApiRateLimitSettingsDto,
	) {
		return await this.rateLimitSettingsService.saveSettings(dto, req.user);
	}
}
