import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'chat-memory' })
export class ChatMemoryModule implements ModuleInterface {
	async init() {
		const { ChatMemoryCleanupService } = await import('./chat-memory-cleanup.service');
		Container.get(ChatMemoryCleanupService).startCleanup();
	}

	async entities() {
		const { ChatMemorySession } = await import('./chat-memory-session.entity');
		const { ChatMemory } = await import('./chat-memory.entity');
		return [ChatMemorySession, ChatMemory];
	}

	async context() {
		const { ChatMemoryProxyService } = await import('./chat-memory-proxy.service');
		return { chatMemoryProxyProvider: Container.get(ChatMemoryProxyService) };
	}

	@OnShutdown()
	async shutdown() {
		const { ChatMemoryCleanupService } = await import('./chat-memory-cleanup.service');
		Container.get(ChatMemoryCleanupService).stopCleanup();
	}
}
