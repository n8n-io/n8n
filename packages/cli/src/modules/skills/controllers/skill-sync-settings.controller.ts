import { SkillSyncSettingsDto } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { Publisher } from '@n8n/backend-services';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, GlobalScope, OnPubSubEvent, Put, RestController } from '@n8n/decorators';
import { ForbiddenError } from '@n8n/errors';
import type { Response } from 'express';

import { SkillSyncSettingsService } from '../services/skill-sync-settings.service';

@RestController('/skill-sync/settings')
export class SkillSyncSettingsController {
	constructor(
		private readonly skillSyncSettings: SkillSyncSettingsService,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly publisher: Publisher,
		private readonly logger: Logger,
	) {}

	@Put('/')
	@GlobalScope('skill:manage')
	async updateSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body settings: SkillSyncSettingsDto,
	): Promise<SkillSyncSettingsDto> {
		if (this.skillSyncSettings.isManagedByEnv) {
			throw new ForbiddenError('Skill Sync is managed by environment variables');
		}
		await this.skillSyncSettings.setEnabled(settings.enabled);
		await this.moduleRegistry.refreshModuleSettings('skills');
		try {
			await this.publisher.publishCommand({ command: 'reload-skill-sync-settings' });
		} catch (error) {
			this.logger.warn('Failed to notify other main processes of the Skill Sync setting', {
				error,
			});
		}
		return { enabled: this.skillSyncSettings.isEnabled() };
	}

	@OnPubSubEvent('reload-skill-sync-settings', { instanceType: 'main' })
	async reloadSettings(): Promise<void> {
		await this.skillSyncSettings.load();
		await this.moduleRegistry.refreshModuleSettings('skills');
	}
}
