import {
	OtelSettingsPublicDto,
	OtelSettingsQueryPublicDto,
	UpdateOtelSettingsPublicDto,
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
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import { ConflictError } from '@n8n/errors';
import type { Response } from 'express';

import { OtelSettingsUpdateService } from '@/modules/otel/otel-settings-update.service';
import { OtelSettingsService } from '@/modules/otel/otel-settings.service';
import { toOtelSettingsResponse } from '@/public-api/v1/shared/otel.mapper';

const tags = ['SettingsOtel'];

@PublicApiController('/settings/otel')
export class OtelPublicController {
	constructor(
		private readonly settingsService: OtelSettingsService,
		private readonly settingsUpdateService: OtelSettingsUpdateService,
	) {}

	@Get('/')
	@ApiKeyScope('otel:manage')
	@ApiSummary('Retrieve the OpenTelemetry configuration')
	@ApiDescription(
		'Retrieve the current OpenTelemetry configuration, including every field exposed in the UI. Requires the `otel:manage` scope.',
	)
	@ApiTags(tags)
	@ApiResponse(200, OtelSettingsPublicDto)
	async getOtelSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query _query: OtelSettingsQueryPublicDto,
	): Promise<OtelSettingsPublicDto> {
		await this.settingsService.loadSettings();
		return toOtelSettingsResponse(this.settingsService.getSettings());
	}

	@Put('/')
	@ApiKeyScope('otel:manage')
	@ApiSummary('Set the OpenTelemetry configuration')
	@ApiDescription(
		'Set the OpenTelemetry configuration. This is a full replacement: every field must be provided, and a partial body is rejected. The one exception is `exporterProtocol`, which defaults to `http/protobuf` when omitted. The update takes effect exactly as it would from the UI, using the same validation, and is applied to the running instance immediately. Fields managed declaratively via environment variables are read-only: attempting to change one is rejected with 409, while re-submitting its current value (as returned by GET) is accepted. Requires the `otel:manage` scope.',
	)
	@ApiTags(tags)
	@ApiResponse(200, OtelSettingsPublicDto)
	@ApiErrorResponse(409)
	async updateOtelSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body body: UpdateOtelSettingsPublicDto,
		@Query _query: OtelSettingsQueryPublicDto,
	): Promise<OtelSettingsPublicDto> {
		await this.settingsService.loadSettings();
		const current = this.settingsService.getSettings();
		const conflicts = current.envManagedFields.filter((key) => body[key] !== current[key]);
		if (conflicts.length > 0) {
			throw new ConflictError(
				`The following field(s) are managed by environment variables and cannot be changed through the API: ${conflicts.join(', ')}`,
			);
		}

		return toOtelSettingsResponse(await this.settingsUpdateService.updateSettings(body));
	}
}
