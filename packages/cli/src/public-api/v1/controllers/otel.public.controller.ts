import { GetOtelSettingsQueryPublicDto, OtelSettingsPublicDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Get,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { OtelSettingsService } from '@/modules/otel/otel-settings.service';
import { toOtelSettingsResponse } from '@/public-api/v1/shared/otel.mapper';

@PublicApiController('/settings/otel')
export class OtelPublicController {
	constructor(private readonly settingsService: OtelSettingsService) {}

	@Get('/')
	@ApiKeyScope('otel:manage')
	@ApiSummary('Retrieve the OpenTelemetry configuration')
	@ApiDescription(
		'Retrieve the current OpenTelemetry configuration, including every field exposed in the UI. Requires the `otel:manage` scope.',
	)
	@ApiTags(['SettingsOtel'])
	@ApiResponse(200, OtelSettingsPublicDto)
	async getOtelSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query _query: GetOtelSettingsQueryPublicDto,
	): Promise<OtelSettingsPublicDto> {
		await this.settingsService.loadSettings();
		const settings = this.settingsService.getSettings();

		return toOtelSettingsResponse(settings);
	}
}
