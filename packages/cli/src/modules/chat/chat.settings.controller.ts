import { ModuleRegistry, Logger } from '@n8n/backend-common';
import { type AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Patch, RestController, GlobalScope } from '@n8n/decorators';

import { ChatSettingsService } from './chat.settings.service';
import { UpdateChatSettingsDto } from './dto/update-chat-settings.dto';

@RestController('/chat')
export class ChatSettingsController {
	constructor(
		private readonly chatSettingsService: ChatSettingsService,
		private readonly logger: Logger,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	@Get('/settings')
	async getSettings() {
		const chatAccessEnabled = await this.chatSettingsService.getEnabled();
		return { chatAccessEnabled };
	}

	@Patch('/settings')
	@GlobalScope('chat:manage')
	async updateSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateChatSettingsDto,
	) {
		const enabled = dto.chatAccessEnabled;
		await this.chatSettingsService.setEnabled(enabled);
		try {
			await this.moduleRegistry.refreshModuleSettings('chat');
		} catch (error) {
			this.logger.warn('Failed to sync chat settings to module registry', {
				cause: error instanceof Error ? error.message : String(error),
			});
		}
		return { chatAccessEnabled: enabled };
	}
}
