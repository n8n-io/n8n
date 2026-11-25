import { AiPreferenceSettingsRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, GlobalScope, Patch, RestController } from '@n8n/decorators';
import { ForbiddenError } from '@n8n/errors';
import type { Response } from 'express';

import { AiPreferenceSettingsService } from '@/services/ai-preference-settings.service';

@RestController('/ai-preference-settings')
export class AiPreferenceSettingsController {
	constructor(private readonly aiPreferenceSettingsService: AiPreferenceSettingsService) {}

	@GlobalScope('aiPreference:manage')
	@Patch('/')
	async updateSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: AiPreferenceSettingsRequestDto,
	) {
		if (this.aiPreferenceSettingsService.isManagedByEnv) {
			throw new ForbiddenError('Preferences are managed via environment variables');
		}
		await this.aiPreferenceSettingsService.setEnabled(payload.enabled);
		return { enabled: this.aiPreferenceSettingsService.isSwitchOn };
	}
}
