import { OtelTestTraceRequestPublicDto, OtelTestTraceResultPublicDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Post,
	PublicApiController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { OtelSettingsService } from '@/modules/otel/otel-settings.service';
import { OtelService } from '@/modules/otel/otel.service';

@PublicApiController('/settings/otel')
export class OtelPublicController {
	constructor(
		private readonly otelSettingsService: OtelSettingsService,
		private readonly otelService: OtelService,
	) {}

	@Post('/test-trace')
	@ApiKeyScope('otel:manage')
	@ApiSummary('Test the connection to an OTLP collector')
	@ApiDescription(
		'Send a single test span to the given OTLP collector and report whether it was accepted. This tests the supplied connection details without changing the stored configuration. Fields managed declaratively via environment variables are overridden with their effective value before the test is sent. Requires the `otel:manage` scope.',
	)
	@ApiTags(['SettingsOtel'])
	@ApiResponse(200, OtelTestTraceResultPublicDto)
	async testOtelTrace(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body body: OtelTestTraceRequestPublicDto,
	): Promise<OtelTestTraceResultPublicDto> {
		const connection = this.otelSettingsService.resolveTestConnection(body);
		return await this.otelService.sendTestTrace(connection);
	}
}
