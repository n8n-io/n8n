import { UpdateOtelSettingsDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Patch, Post, RestController, GlobalScope } from '@n8n/decorators';

import { OtelSettingsService } from './otel-settings.service';

@RestController('/otel')
export class OtelSettingsController {
	constructor(private readonly otelSettingsService: OtelSettingsService) {}

	@Get('/settings')
	@GlobalScope('opentelemetry:manage')
	async getSettings(_req: AuthenticatedRequest) {
		return await this.otelSettingsService.getEffectiveSettings();
	}

	@Patch('/settings')
	@GlobalScope('opentelemetry:manage')
	async updateSettings(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Body dto: UpdateOtelSettingsDto,
	) {
		return await this.otelSettingsService.saveSettings(dto);
	}

	@Post('/test-trace')
	@GlobalScope('opentelemetry:manage')
	async sendTestTrace(_req: AuthenticatedRequest) {
		const settings = await this.otelSettingsService.getEffectiveSettings();
		return await this.otelSettingsService.sendTestTrace(settings);
	}
}
