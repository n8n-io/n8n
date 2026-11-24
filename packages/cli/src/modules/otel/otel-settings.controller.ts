import { TestOtelTraceDto, UpdateOtelSettingsDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Post, Put, RestController } from '@n8n/decorators';

import { OtelSettingsService } from './otel-settings.service';
import { OtelService } from './otel.service';

@RestController('/otel')
export class OtelSettingsController {
	constructor(
		private readonly otelSettingsService: OtelSettingsService,
		private readonly otelService: OtelService,
	) {}

	@Get('/settings')
	@GlobalScope('otel:manage')
	getSettings(_req: AuthenticatedRequest) {
		return this.otelSettingsService.getSettings();
	}

	@Put('/settings')
	@GlobalScope('otel:manage')
	async updateSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateOtelSettingsDto,
	) {
		await this.otelSettingsService.saveSettings(dto);
		await this.otelService.applyAfterSave();
		return this.otelSettingsService.getSettings();
	}

	@Post('/test-trace')
	@GlobalScope('otel:manage')
	async testTrace(_req: AuthenticatedRequest, _res: Response, @Body dto: TestOtelTraceDto) {
		const connection = this.otelSettingsService.resolveTestConnection(dto);
		return await this.otelService.sendTestTrace(connection);
	}
}
