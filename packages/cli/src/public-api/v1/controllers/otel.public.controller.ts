import {
	OtelSettingsPublicDto,
	OtelSettingsQueryPublicDto,
	OtelTestTraceResultPublicDto,
	TestOtelTracePublicDto,
	UpdateOtelSettingsPublicDto,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
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
import type { Request, Response } from 'express';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { OtelLifecycleHandler } from '@/modules/otel/otel-lifecycle-handler';
import type { OtelSettingsResponse } from '@/modules/otel/otel-settings.service';
import { OtelSettingsService } from '@/modules/otel/otel-settings.service';
import { OtelService } from '@/modules/otel/otel.service';
import { Publisher } from '@/scaling/pubsub/publisher.service';

const tags = ['SettingsOtel'];

function toOtelSettingsPublicDto(config: OtelSettingsResponse): OtelSettingsPublicDto {
	return {
		enabled: config.enabled,
		exporterProtocol: config.exporterProtocol,
		exporterEndpoint: config.exporterEndpoint,
		exporterTracingPath: config.exporterTracingPath,
		exporterServiceName: config.exporterServiceName,
		exporterHeaders: config.exporterHeaders,
		tracesSampleRate: config.tracesSampleRate,
		startupConnectivityTimeoutMs: config.startupConnectivityTimeoutMs,
		includeNodeSpans: config.includeNodeSpans,
		injectOutbound: config.injectOutbound,
		productionExecutionsOnly: config.productionExecutionsOnly,
	};
}

@PublicApiController('/settings/otel')
export class OtelPublicController {
	constructor(
		private readonly settingsService: OtelSettingsService,
		private readonly otelService: OtelService,
		private readonly lifecycleHandler: OtelLifecycleHandler,
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
		_req: Request,
		_res: Response,
		@Query _query: OtelSettingsQueryPublicDto,
	): Promise<OtelSettingsPublicDto> {
		await this.settingsService.loadSettings();
		return toOtelSettingsPublicDto(this.settingsService.getSettings());
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
		_req: Request,
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
		await this.lifecycleHandler.onReloadOtelConfig();
		await this.moduleRegistry.refreshModuleSettings('otel');
		void this.publisher.publishCommand({ command: 'reload-otel-config' });

		return toOtelSettingsPublicDto(this.settingsService.getSettings());
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
		_req: Request,
		_res: Response,
		@Body body: TestOtelTracePublicDto,
		@Query _query: OtelSettingsQueryPublicDto,
	): Promise<OtelTestTraceResultPublicDto> {
		const connection = this.settingsService.resolveTestConnection(body);
		return await this.otelService.sendTestTrace(connection);
	}
}
