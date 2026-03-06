import { ModuleRegistry, Logger } from '@n8n/backend-common';
import { type AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Post,
	Query,
	RestController,
	GlobalScope,
	Param,
} from '@n8n/decorators';

import { ChatHubSettingsService } from './chat-hub.settings.service';
import {
	ChatHubLLMProvider,
	chatHubLLMProviderSchema,
	ChatMemoryClearRequest,
	UpdateChatSettingsRequest,
	type ChatMemorySizeResult,
} from '@n8n/api-types';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ChatMemorySessionRepository } from '@/modules/chat-memory/chat-memory-session.repository';
import { ChatMemorySizeValidator } from '@/modules/chat-memory/chat-memory-size-validator.service';
import { ChatMemoryRepository } from '@/modules/chat-memory/chat-memory.repository';

@RestController('/chat')
export class ChatHubSettingsController {
	constructor(
		private readonly settings: ChatHubSettingsService,
		private readonly logger: Logger,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly sizeValidator: ChatMemorySizeValidator,
		private readonly memoryRepository: ChatMemoryRepository,
		private readonly memorySessionRepository: ChatMemorySessionRepository,
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

	@Get('/memory/storage')
	@GlobalScope('chatHub:manage')
	async getMemoryStorageUsage(): Promise<ChatMemorySizeResult> {
		const fetchSizeFn = async () => await this.memoryRepository.findChatMemorySize();
		const sizeData = await this.sizeValidator.getCachedSizeData(fetchSizeFn);
		const quotaStatus = this.sizeValidator.sizeToState(sizeData.totalBytes);

		return {
			totalBytes: sizeData.totalBytes,
			quotaStatus,
		};
	}

	@Delete('/memory')
	@GlobalScope('chatHub:manage')
	async clearMemory(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ChatMemoryClearRequest,
	): Promise<{ deletedEntries: number }> {
		let deletedEntries: number;

		if (query.olderThanHours !== undefined) {
			const cutoff = new Date(Date.now() - query.olderThanHours * 60 * 60 * 1000);
			deletedEntries = await this.memoryRepository.deleteOlderThan(cutoff);
		} else {
			deletedEntries = await this.memoryRepository.deleteAll();
		}

		await this.memorySessionRepository.deleteOrphanedSessions();
		this.sizeValidator.reset();

		return { deletedEntries };
	}
}
