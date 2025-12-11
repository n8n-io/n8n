import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'chat-hub' })
export class ChatHubModule implements ModuleInterface {
	async init() {
		await import('./chat-hub.controller');
		await import('./chat-hub.settings.controller');
	}

	async settings() {
		const { ChatHubSettingsService } = await import('./chat-hub.settings.service');
		const enabled = await Container.get(ChatHubSettingsService).getEnabled();
		const providers = await Container.get(ChatHubSettingsService).getAllProviderSettings();

		return { enabled, providers };
	}

	async entities() {
		const { ChatHubSession } = await import('./chat-hub-session.entity');
		const { ChatHubMessage } = await import('./chat-hub-message.entity');
		const { ChatHubAgent } = await import('./chat-hub-agent.entity');

		return [ChatHubSession, ChatHubMessage, ChatHubAgent];
	}

	@OnShutdown()
	async shutdown() {}
}
