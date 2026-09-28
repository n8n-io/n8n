import {
	OtelSettingsPublicDto,
	UpdateOtelSettingsPublicDto,
	UpdateOtelSettingsQueryPublicDto,
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
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { OtelSettingsUpdateService } from '@/modules/otel/otel-settings-update.service';

import { toOtelSettingsResponse } from '../shared/otel.mapper';

@PublicApiController('/settings/otel')
export class OtelPublicController {
	constructor(private readonly settingsUpdateService: OtelSettingsUpdateService) {}

	@Put('/')
	@ApiKeyScope('otel:manage')
	@ApiSummary('Set the OpenTelemetry configuration')
	@ApiDescription(
		'Set the OpenTelemetry configuration. This is a full replacement: every field must be provided, and a partial body is rejected. The one exception is `exporterProtocol`, which defaults to `http/protobuf` when omitted. The update takes effect exactly as it would from the UI, using the same validation, and is applied to the running instance immediately. Fields managed declaratively via environment variables are read-only: attempting to change one is rejected with 409, while re-submitting its current value (as returned by GET) is accepted. Requires the `otel:manage` scope.',
	)
	@ApiTags(['SettingsOtel'])
	@ApiResponse(200, OtelSettingsPublicDto)
	@ApiErrorResponse(409)
	async updateOtelSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body body: UpdateOtelSettingsPublicDto,
		@Query _query: UpdateOtelSettingsQueryPublicDto,
	): Promise<OtelSettingsPublicDto> {
		const current = await this.settingsUpdateService.getSettings();
		const conflicts = current.envManagedFields.filter((key) => body[key] !== current[key]);
		if (conflicts.length > 0) {
			throw new ConflictError(
				`The following field(s) are managed by environment variables and cannot be changed through the API: ${conflicts.join(', ')}`,
			);
		}

		return toOtelSettingsResponse(await this.settingsUpdateService.updateSettings(body));
	}
}
