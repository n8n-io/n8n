import { Logger } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'agents' })
export class AgentsModule implements ModuleInterface {
	async init() {
		await import('./agents.controller');

		const { AgentsService } = await import('./agents.service');
		Container.get(AgentsService);

		const { AgentPublishedVersionRepository } = await import(
			'./repositories/agent-published-version.repository'
		);
		Container.get(AgentPublishedVersionRepository);

		// Register the sandboxed runtime service (lazy — the V8 isolate is only
		// created on first use, so this import has negligible startup cost).
		const { AgentSecureRuntime } = await import('./runtime/agent-secure-runtime');
		Container.get(AgentSecureRuntime);

		// Register Chat integration service and reconnect active integrations
		const { ChatIntegrationService } = await import('./integrations/chat-integration.service');
		const chatService = Container.get(ChatIntegrationService);
		const logger = Container.get(Logger);
		void chatService.reconnectAll().catch((error) => {
			logger.error('[Agents] Failed to reconnect integrations on startup', {
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}

	async settings() {
		return {
			enabled: true,
		};
	}

	async entities() {
		const { Agent } = await import('./entities/agent.entity');
		const { AgentCheckpoint } = await import('./entities/agent-checkpoint.entity');
		const { AgentResourceEntity } = await import('./entities/agent-resource.entity');
		const { AgentThreadEntity } = await import('./entities/agent-thread.entity');
		const { AgentMessageEntity } = await import('./entities/agent-message.entity');
		const { AgentPublishedVersion } = await import('./entities/agent-published-version.entity');

		return [
			Agent,
			AgentCheckpoint,
			AgentResourceEntity,
			AgentThreadEntity,
			AgentMessageEntity,
			AgentPublishedVersion,
		];
	}

	async context() {
		const { AgentsService } = await import('./agents.service');

		return { agentsService: Container.get(AgentsService) };
	}
}
