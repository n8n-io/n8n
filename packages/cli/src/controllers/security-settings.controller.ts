import { UpdateSecuritySettingsDto } from '@n8n/api-types';
import { type AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Post, RestController } from '@n8n/decorators';
import {
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';
import type { Response } from 'express';

import { SecuritySettingsService } from '@/services/security-settings.service';

@RestController('/settings/security')
export class SecuritySettingsController {
	constructor(private readonly securitySettingsService: SecuritySettingsService) {}

	@GlobalScope('securitySettings:manage')
	@Get('/')
	async getSecuritySettings(_req: AuthenticatedRequest, _res: Response) {
		return await this.securitySettingsService.arePersonalSpaceSettingsEnabled();
	}

	@GlobalScope('securitySettings:manage')
	@Post('/')
	async updateSecuritySettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateSecuritySettingsDto,
	) {
		const updatedSettings: Record<string, boolean> = {};
		if (dto.personalSpacePublishing !== undefined) {
			await this.securitySettingsService.setPersonalSpaceSetting(
				PERSONAL_SPACE_PUBLISHING_SETTING,
				dto.personalSpacePublishing,
			);
			updatedSettings.personalSpacePublishing = dto.personalSpacePublishing;
		}
		if (dto.personalSpaceSharing !== undefined) {
			await this.securitySettingsService.setPersonalSpaceSetting(
				PERSONAL_SPACE_SHARING_SETTING,
				dto.personalSpaceSharing,
			);
			updatedSettings.personalSpaceSharing = dto.personalSpaceSharing;
		}

		return updatedSettings;
	}
}
