import { SecurityPolicyPublicDto, UpdateSecurityPolicyDto } from '@n8n/api-types';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Get,
	Licensed,
	PublicApiController,
	Put,
} from '@n8n/decorators';
import type { Response } from 'express';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import type { SecurityPolicyReadResult } from '@/services/security-settings.service';
import { SecuritySettingsService } from '@/services/security-settings.service';

const tags = ['SecurityPolicy'];

const toSecurityPolicyPublicDto = (
	settings: SecurityPolicyReadResult,
): SecurityPolicyPublicDto => ({
	personalSpacePublishing: settings.personalSpacePublishing,
	personalSpaceSharing: settings.personalSpaceSharing,
	publishedPersonalWorkflowsCount: settings.publishedPersonalWorkflowsCount,
	sharedPersonalWorkflowsCount: settings.sharedPersonalWorkflowsCount,
	sharedPersonalCredentialsCount: settings.sharedPersonalCredentialsCount,
	redactionEnforcement: { floor: settings.redactionEnforcement.floor },
});

@PublicApiController('/settings/security-policy')
export class SecurityPolicyPublicController {
	constructor(
		private readonly securitySettingsService: SecuritySettingsService,
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
	) {}

	@Get('/')
	@ApiKeyScope('securitySettings:manage')
	@Licensed(LICENSE_FEATURES.PERSONAL_SPACE_POLICY)
	@ApiSummary('Retrieve the security policy')
	@ApiDescription(
		'Retrieve the instance security policy: personal-space publishing and sharing, the execution-data redaction enforcement floor, and the read-only usage counts shown in the UI. Requires the `securitySettings:manage` scope and the Personal Space Policy feature to be licensed.',
	)
	@ApiTags(tags)
	@ApiResponse(200, SecurityPolicyPublicDto)
	async getSecurityPolicy(): Promise<SecurityPolicyPublicDto> {
		const settings = await this.securitySettingsService.getSecuritySettings();
		return toSecurityPolicyPublicDto(settings);
	}

	@Put('/')
	@ApiKeyScope('securitySettings:manage')
	@Licensed(LICENSE_FEATURES.PERSONAL_SPACE_POLICY)
	@ApiSummary('Set the security policy')
	@ApiDescription(
		'Replace the instance security policy with the provided full object. Every writable field must be sent. Read-only usage counts from GET are ignored if included, so a GET response can be sent back as a PUT body. The update takes effect exactly as it would from the UI, using the same validation. Requires the `securitySettings:manage` scope and the Personal Space Policy feature to be licensed. When the group is managed via environment variables, the write is rejected with 409 and no changes are made; a read still returns the current values.',
	)
	@ApiTags(tags)
	@ApiResponse(200, SecurityPolicyPublicDto)
	@ApiErrorResponse(409)
	async updateSecurityPolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: UpdateSecurityPolicyDto,
	): Promise<SecurityPolicyPublicDto> {
		if (this.instanceSettingsLoaderConfig.securityPolicyManagedByEnv) {
			throw new ConflictError(
				'These settings are managed via environment variables and cannot be modified through the API',
			);
		}

		const { personalSpacePublishing, personalSpaceSharing, redactionEnforcement } = body;
		await this.securitySettingsService.updateSecuritySettings(
			{ personalSpacePublishing, personalSpaceSharing, redactionEnforcement },
			req.user,
		);
		const settings = await this.securitySettingsService.getSecuritySettings();

		return toSecurityPolicyPublicDto(settings);
	}
}
