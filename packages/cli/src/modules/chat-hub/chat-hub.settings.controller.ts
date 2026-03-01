import { ModuleRegistry, Logger } from '@n8n/backend-common';
import { type AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Post, RestController, GlobalScope, Param } from '@n8n/decorators';

import { ChatHubSettingsService } from './chat-hub.settings.service';
import {
	ChatHubLLMProvider,
	chatHubLLMProviderSchema,
	UpdateChatSettingsRequest,
} from '@n8n/api-types';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

@RestController('/chat')
export class ChatHubSettingsController {
	constructor(
		private readonly settings: ChatHubSettingsService,
		private readonly logger: Logger,
		private readonly moduleRegistry: ModuleRegistry,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

	@Get('/settings')
	@GlobalScope('chatHub:manage')
	async getSettings(_req: AuthenticatedRequest, _res: Response) {
		const providers = await this.settings.getAllProviderSettings();
		return { providers };
	}

	@Get('/settings/:provider')
	@GlobalScope('chatHub:manage')
	async getProviderSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('provider') provider: ChatHubLLMProvider,
	) {
		if (!chatHubLLMProviderSchema.safeParse(provider).success) {
			throw new BadRequestError(`Invalid provider: ${provider}`);
		}

		const settings = await this.settings.getProviderSettings(provider);
		return { settings };
	}

	@Post('/settings')
	@GlobalScope('chatHub:manage')
	async updateSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body body: UpdateChatSettingsRequest,
	) {
		const { payload } = body;
		await this.settings.setProviderSettings(payload.provider, payload);
		try {
			await this.moduleRegistry.refreshModuleSettings('chat-hub');
		} catch (error) {
			this.logger.warn('Failed to sync chat settings to module registry', {
				cause: error instanceof Error ? error.message : String(error),
			});
		}

		return await this.settings.getProviderSettings(payload.provider);
	}
}
