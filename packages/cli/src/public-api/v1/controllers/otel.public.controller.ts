import {
	OtelSettingsPublicDto,
	OtelSettingsQueryPublicDto,
	OtelTestTraceRequestPublicDto,
	OtelTestTraceResultPublicDto,
	UpdateOtelSettingsPublicDto,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
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
	Post,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import { ConflictError } from '@n8n/errors';
import type { Response } from 'express';

import { OtelSettingsService } from '@/modules/otel/otel-settings.service';
import { OtelService } from '@/modules/otel/otel.service';
import { toOtelSettingsResponse } from '@/public-api/v1/shared/otel.mapper';
import { Publisher } from '@/scaling/pubsub/publisher.service';

const tags = ['SettingsOtel'];

@PublicApiController('/settings/otel')
export class OtelPublicController {
	constructor(
		private readonly settingsService: OtelSettingsService,
		private readonly otelService: OtelService,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly publisher: Publisher,
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
		const settings = this.settingsService.getSettings();

		return toOtelSettingsResponse(settings);
	}

	@Put('/')
	@ApiKeyScope('otel:manage')
	@ApiSummary('Set the OpenTelemetry configuration')
	@ApiDescription(
		'Set the OpenTelemetry configuration. This is a full replacement: every field must be provided, and a partial body is rejected. The exceptions are `exporterProtocol`, which defaults to `http/protobuf` when omitted, and `emitWorkflowStartSpan` and `emitNodeStartSpan`, which default to `false` when omitted. The update takes effect exactly as it would from the UI, using the same validation, and is applied to the running instance immediately. Fields managed declaratively via environment variables are read-only: attempting to change one is rejected with 409, while re-submitting its current value (as returned by GET) is accepted. Requires the `otel:manage` scope.',
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

		await this.settingsService.saveSettings(body);
		await this.otelService.restart();
		await this.moduleRegistry.refreshModuleSettings('otel');
		void this.publisher.publishCommand({ command: 'reload-otel-config' });

		const updated = this.settingsService.getSettings();

		return toOtelSettingsResponse(updated);
	}

	@Post('/test-trace')
	@ApiKeyScope('otel:manage')
	@ApiSummary('Test the connection to an OTLP collector')
	@ApiDescription(
		'Send a single test span to the given OTLP collector and report whether it was accepted. This tests the supplied connection details without changing the stored configuration. Fields managed declaratively via environment variables are overridden with their effective value before the test is sent. Requires the `otel:manage` scope.',
	)
	@ApiTags(tags)
	@ApiResponse(200, OtelTestTraceResultPublicDto)
	async testOtelTrace(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body body: OtelTestTraceRequestPublicDto,
		@Query _query: OtelSettingsQueryPublicDto,
	): Promise<OtelTestTraceResultPublicDto> {
		const connection = this.settingsService.resolveTestConnection(body);

		return await this.otelService.sendTestTrace(connection);
	}
}
