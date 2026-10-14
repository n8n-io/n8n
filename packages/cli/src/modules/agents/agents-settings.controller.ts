import { AgentsSettingsDto } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, OnPubSubEvent, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentsSettingsService } from './agents-settings.service';

@RestController('/agents/settings')
export class AgentsSettingsController {
	constructor(
		private readonly settingsService: AgentsSettingsService,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly publisher: Publisher,
		private readonly logger: Logger,
	) {}

	@Get('/')
	@GlobalScope('agent:manage')
	async getSettings(): Promise<AgentsSettingsDto> {
		return { enabled: await this.settingsService.getEnabled() };
	}

	@Put('/')
	@GlobalScope('agent:manage')
	async updateSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body settings: AgentsSettingsDto,
	): Promise<AgentsSettingsDto> {
		await this.settingsService.setEnabled(settings.enabled);
		try {
			await this.reloadSettings();
		} catch (error) {
			this.logger.error('Failed to refresh the local Agents setting', { error });
		}
		try {
			await this.publisher.publishCommand({ command: 'reload-agents-settings' });
		} catch (error) {
			this.logger.error('Failed to notify other main processes of the Agents setting', { error });
		}
		return settings;
	}

	@OnPubSubEvent('reload-agents-settings', { instanceType: 'main' })
	async reloadSettings(): Promise<void> {
		await this.moduleRegistry.refreshModuleSettings('agents');
	}
}
