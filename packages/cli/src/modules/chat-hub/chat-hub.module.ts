import { ExecutionsConfig } from '@n8n/config';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

@BackendModule({ name: 'chat-hub' })
export class ChatHubModule implements ModuleInterface {
	async init() {
		await import('./chat-hub.controller');
		await import('./chat-hub.settings.controller');

		// In queue mode, only workers process Chat hub execution lifecycle events.
		// Skip initializing the watcher on main instance to avoid unnecessary event subscriptions.
		const isQueueMode = Container.get(ExecutionsConfig).mode === 'queue';
		const isWorker = Container.get(InstanceSettings).isWorker;
		if (!isQueueMode || isWorker) {
			await import('./chat-hub-execution-watcher.service');
		}
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
		const { ChatHubTool } = await import('./chat-hub-tool.entity');

		return [ChatHubSession, ChatHubMessage, ChatHubAgent, ChatHubTool];
	}

	@OnShutdown()
	async shutdown() {}
}
