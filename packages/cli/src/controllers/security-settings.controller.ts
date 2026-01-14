import { type AuthenticatedRequest } from '@n8n/db';
import { Body, Post, Get, RestController, GlobalScope } from '@n8n/decorators';
import type { Response } from 'express';

import { UpdateSecuritySettingsDto } from '@/dto/security-settings.dto';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { SecuritySettingsService } from '@/services/security-settings.service';

@RestController('/settings/security')
export class SecuritySettingsController {
	constructor(private readonly securitySettingsService: SecuritySettingsService) {}

	@GlobalScope('securitySettings:manage')
	@Get('/')
	async getSecuritySettings(_req: AuthenticatedRequest, _res: Response) {
		// TODO: always return true for both properties if feature not enabled
		const personalSpacePublishing =
			await this.securitySettingsService.isPersonalSpacePublishingEnabled();
		const personalSpaceSharing = await this.securitySettingsService.isPersonalSpaceSharingEnabled();

		return { personalSpacePublishing, personalSpaceSharing };
	}

	@GlobalScope('securitySettings:manage')
	@Post('/')
	async updateSecuritySettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateSecuritySettingsDto,
	) {
		// TODO: throw forbidden error if feature not enabled
		if (dto.personalSpacePublishing === undefined && dto.personalSpaceSharing === undefined) {
			throw new BadRequestError('At least one setting must be provided');
		}

		if (dto.personalSpacePublishing !== undefined) {
			await this.securitySettingsService.setPersonalSpacePublishing(dto.personalSpacePublishing);
		}
		if (dto.personalSpaceSharing !== undefined) {
			await this.securitySettingsService.setPersonalSpaceSharing(dto.personalSpaceSharing);
		}

		return {
			personalSpacePublishing:
				await this.securitySettingsService.isPersonalSpacePublishingEnabled(),
			personalSpaceSharing: await this.securitySettingsService.isPersonalSpaceSharingEnabled(),
		};
	}
}
