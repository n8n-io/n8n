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
		"Retrieve the Public API rate-limit settings. `envManagedFields` lists the fields that are set by environment variables and can't be changed through the API. Requires the `securitySettings:manage` scope. Requests to this route count against the rate limits.",
	)
	@ApiTags(tags)
	@ApiResponse(200, RateLimitSettingsPublicDto)
	async getRateLimitSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query _query: RateLimitSettingsQueryPublicDto,
	): Promise<RateLimitSettingsPublicDto> {
		const settings = await this.settingsService.getSettings();
		return toRateLimitSettingsResponse(settings);
	}

	@Put('/')
	@ApiKeyScope('securitySettings:manage')
	@GlobalScope('securitySettings:manage')
	@ApiSummary('Set the Public API rate-limit settings')
	@ApiDescription(
		"Set the Public API rate-limit settings. You can send a GET response back as the body, and `envManagedFields` is ignored. When rate limiting is enabled, at least one limit must be greater than `0`. Fields set by environment variables can't be changed: a different value is rejected with 409, but sending the current value is accepted. Requires the `securitySettings:manage` scope. Requests to this route count against the rate limits.",
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

		const saved = await this.settingsService.saveSettings(body, req.user);
		return toRateLimitSettingsResponse(saved);
	}
}
