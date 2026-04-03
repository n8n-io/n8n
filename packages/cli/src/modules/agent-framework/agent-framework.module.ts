import { Logger } from '@n8n/backend-common';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'agent-framework' })
export class AgentFrameworkModule implements ModuleInterface {
	async init() {
		await import('./agent-framework.controller');

		const { AgentFrameworkService } = await import('./agent-framework.service');
		Container.get(AgentFrameworkService);

		// Register the sandboxed runtime service (lazy — the V8 isolate is only
		// created on first use, so this import has negligible startup cost).
		const { AgentSecureRuntime } = await import('./agent-secure-runtime');
		Container.get(AgentSecureRuntime);

		// Register Chat integration service and reconnect active integrations
		const { ChatIntegrationService } = await import('./integrations/chat-integration.service');
		const chatService = Container.get(ChatIntegrationService);
		const logger = Container.get(Logger);
		void chatService.reconnectAll().catch((error) => {
			logger.error('[AgentFramework] Failed to reconnect integrations on startup', {
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
		const { SdkAgent } = await import('./entities/sdk-agent.entity');
		const { AgentCheckpoint } = await import('./entities/agent-checkpoint.entity');

		return [SdkAgent, AgentCheckpoint];
	}

	async context() {
		const { AgentFrameworkService } = await import('./agent-framework.service');

		return { agentsService: Container.get(AgentFrameworkService) };
	}
}
