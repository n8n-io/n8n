import { type AuthenticatedRequest } from '@n8n/db';
import { Body, Post, Get, RestController, GlobalScope } from '@n8n/decorators';
import type { Response } from 'express';

import { UpdateSecuritySettingsDto } from '@/dto/security-settings.dto';
import { SecuritySettingsService } from '@/services/security-settings.service';

@RestController('/settings/security')
export class SecuritySettingsController {
	constructor(private readonly securitySettingsService: SecuritySettingsService) {}

	@GlobalScope('securitySettings:manage')
	@Get('/')
	async getSecuritySettings(_req: AuthenticatedRequest, _res: Response) {
		const personalSpacePublishing =
			await this.securitySettingsService.isPersonalSpacePublishingEnabled();

		return { personalSpacePublishing };
	}

	@GlobalScope('securitySettings:manage')
	@Post('/')
	async updateSecuritySettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateSecuritySettingsDto,
	) {
		await this.securitySettingsService.setPersonalSpacePublishing(dto.personalSpacePublishing);

		return { personalSpacePublishing: dto.personalSpacePublishing };
	}
}
