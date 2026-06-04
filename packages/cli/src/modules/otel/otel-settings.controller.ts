import { UpdateOtelSettingsDto } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Put, RestController } from '@n8n/decorators';

import { Publisher } from '@/scaling/pubsub/publisher.service';

import { OtelLifecycleHandler } from './otel-lifecycle-handler';
import { OtelSettingsService } from './otel-settings.service';

@RestController('/otel')
export class OtelSettingsController {
	constructor(
		private readonly otelSettingsService: OtelSettingsService,
		private readonly otelLifecycleHandler: OtelLifecycleHandler,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly publisher: Publisher,
	) {}

	@Get('/settings')
	@GlobalScope('otel:manage')
	getSettings(_req: AuthenticatedRequest) {
		return this.otelSettingsService.currentSettings;
	}

	@Put('/settings')
	@GlobalScope('otel:manage')
	async updateSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateOtelSettingsDto,
	) {
		await this.otelSettingsService.saveSettings(dto);
		await this.otelLifecycleHandler.onReloadOtelConfig();
		await this.moduleRegistry.refreshModuleSettings('otel');
		void this.publisher.publishCommand({ command: 'reload-otel-config' });
		return this.otelSettingsService.currentSettings;
	}
}
