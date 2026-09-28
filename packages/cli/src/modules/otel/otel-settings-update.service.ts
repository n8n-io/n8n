import { ModuleRegistry } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { OtelSettingsService, type OtelSettingsResponse } from './otel-settings.service';
import type { OtelConfig } from './otel.config';
import { OtelService } from './otel.service';

import { Publisher } from '@/scaling/pubsub/publisher.service';

@Service()
export class OtelSettingsUpdateService {
	constructor(
		private readonly settingsService: OtelSettingsService,
		private readonly otelService: OtelService,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly publisher: Publisher,
	) {}

	async getSettings(): Promise<OtelSettingsResponse> {
		await this.settingsService.loadSettings();
		return this.settingsService.getSettings();
	}

	async updateSettings(settings: OtelConfig): Promise<OtelSettingsResponse> {
		await this.settingsService.saveSettings(settings);
		await this.otelService.restart();
		await this.moduleRegistry.refreshModuleSettings('otel');
		void this.publisher.publishCommand({ command: 'reload-otel-config' });
		return this.settingsService.getSettings();
	}
}
