import {
	type PublicApiRateLimitSettingsResponse,
	RateLimitSettingsPublicDto,
	RateLimitSettingsQueryPublicDto,
	UpdateRateLimitSettingsPublicDto,
} from '@n8n/api-types';
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
	GlobalScope,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import { ConflictError } from '@n8n/errors';
import type { Response } from 'express';

import { PublicApiRateLimitSettingsService } from '@/public-api/public-api-rate-limit-settings.service';

const tags = ['SettingsRateLimits'];

const toRateLimitSettingsResponse = (
	settings: PublicApiRateLimitSettingsResponse,
): RateLimitSettingsPublicDto => ({
	enabled: settings.enabled,
	globalReadLimit: settings.globalReadLimit,
	globalReadWindowSeconds: settings.globalReadWindowSeconds,
	globalWriteLimit: settings.globalWriteLimit,
	globalWriteWindowSeconds: settings.globalWriteWindowSeconds,
	endpointReadLimit: settings.endpointReadLimit,
	endpointReadWindowSeconds: settings.endpointReadWindowSeconds,
	endpointWriteLimit: settings.endpointWriteLimit,
	endpointWriteWindowSeconds: settings.endpointWriteWindowSeconds,
	envManagedFields: settings.envManagedFields,
});

@PublicApiController('/settings/rate-limits')
export class RateLimitsPublicController {
	constructor(private readonly settingsService: PublicApiRateLimitSettingsService) {}

	@Get('/')
	@ApiKeyScope('securitySettings:manage')
	@GlobalScope('securitySettings:manage')
	@ApiSummary('Retrieve the Public API rate-limit settings')
	@ApiDescription(
		'Retrieve the configured Public API rate limits and windows, including fields controlled by environment variables. Requires the `securitySettings:manage` scope. API-key requests to this route count against the rate limits. Session requests are not limited.',
	)
	@ApiTags(tags)
	@ApiResponse(200, RateLimitSettingsPublicDto)
	async getRateLimitSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query _query: RateLimitSettingsQueryPublicDto,
	): Promise<RateLimitSettingsPublicDto> {
		return toRateLimitSettingsResponse(await this.settingsService.getSettings());
	}

	@Put('/')
	@ApiKeyScope('securitySettings:manage')
	@GlobalScope('securitySettings:manage')
	@ApiSummary('Set the Public API rate-limit settings')
	@ApiDescription(
		'Replace the stored Public API rate-limit settings. Send every writable field. Set a limit to 0 for no limit. When rate limiting is enabled, at least one limit must be greater than 0. Changing a field controlled by an environment variable returns 409 without saving any changes. Repeating its current value is accepted. The read-only `envManagedFields` array is ignored on writes, so a GET response can be sent back as a PUT body. Requires the `securitySettings:manage` scope. API-key requests to this route count against the rate limits. If a limit blocks access, use a session request or change the environment variables and restart the instance.',
	)
	@ApiTags(tags)
	@ApiResponse(200, RateLimitSettingsPublicDto)
	@ApiErrorResponse(409)
	async updateRateLimitSettings(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: UpdateRateLimitSettingsPublicDto,
		@Query _query: RateLimitSettingsQueryPublicDto,
	): Promise<RateLimitSettingsPublicDto> {
		const current = await this.settingsService.getSettings();
		const conflicts = current.envManagedFields.filter((field) => body[field] !== current[field]);
		if (conflicts.length > 0) {
			throw new ConflictError(
				`Environment variables control these fields: ${conflicts.join(', ')}. Keep their current values or change the environment variables.`,
			);
		}

		return toRateLimitSettingsResponse(await this.settingsService.saveSettings(body, req.user));
	}
}
