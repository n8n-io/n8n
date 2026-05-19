import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

@BackendModule({ name: 'agents' })
export class AgentsModule implements ModuleInterface {
	async init() {
		await import('./agents.controller');
		await import('./builder/agents-builder-settings.controller');

		const { AgentsService } = await import('./agents.service');
		Container.get(AgentsService);

		const { AgentsBuilderSettingsService } = await import(
			'./builder/agents-builder-settings.service'
		);
		Container.get(AgentsBuilderSettingsService);

		const { AgentExecutionService } = await import('./agent-execution.service');
		Container.get(AgentExecutionService);

		const { AgentPublishedVersionRepository } = await import(
			'./repositories/agent-published-version.repository'
		);
		Container.get(AgentPublishedVersionRepository);

		// Register the sandboxed runtime service (lazy — the V8 isolate is only
		// created on first use, so this import has negligible startup cost).
		const { AgentSecureRuntime } = await import('./runtime/agent-secure-runtime');
		Container.get(AgentSecureRuntime);

		// Populate the integration registry with supported chat platforms.
		// Adding a new platform is adding one subclass + one register() call.
		const { ChatIntegrationRegistry } = await import('./integrations/agent-chat-integration');
		const { SlackIntegration } = await import('./integrations/platforms/slack-integration');
		const { TelegramIntegration } = await import('./integrations/platforms/telegram-integration');
		const { LinearIntegration } = await import('./integrations/platforms/linear-integration');
		const registry = Container.get(ChatIntegrationRegistry);
		registry.register(Container.get(SlackIntegration));
		registry.register(Container.get(TelegramIntegration));
		registry.register(Container.get(LinearIntegration));

		// Warm the node catalog so the agent runtime can attach search/execute tools
		// synchronously on each agent reconstruction. The underlying init is idempotent.
		const { NodeCatalogService } = await import('@/node-catalog');
		await Container.get(NodeCatalogService).initialize();

		// Register Chat and Schedule services. Importing the services here also
		// registers any @OnLeaderTakeover/@OnLeaderStepdown decorators with
		// MultiMainMetadata before start.ts:295 wires up the listeners.
		//
		// Chat integrations run on every main: webhook-driven platforms (Slack,
		// Linear, Telegram in webhook mode) need to be connected on every main
		// because inbound webhooks are load-balanced. Polling-driven integrations
		// (Telegram in polling mode) are filtered to leader-only inside the
		// service via `AgentChatIntegration.requiresLeader()`.
		//
		// Schedules remain leader-only by design — a cron firing on multiple
		// mains would run the agent twice for the same tick.
		const { AgentScheduleService } = await import('./integrations/agent-schedule.service');
		const { ChatIntegrationService } = await import('./integrations/chat-integration.service');
		const scheduleService = Container.get(AgentScheduleService);
		const chatService = Container.get(ChatIntegrationService);
		const logger = Container.get(Logger);
		const instanceSettings = Container.get(InstanceSettings);
		void chatService.reconnectAll().catch((error) => {
			logger.error('[Agents] Failed to reconnect integrations on startup', {
				error: error instanceof Error ? error.message : String(error),
			});
		});
		if (instanceSettings.isLeader) {
			void scheduleService.reconnectAll().catch((error) => {
				logger.error('[Agents] Failed to reconnect schedules on startup', {
					error: error instanceof Error ? error.message : String(error),
				});
			});
		} else {
			logger.debug('[Agents] Skipping schedule reconnect on startup — not leader');
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await -- module contract requires async
	async settings() {
		const config = Container.get(AgentsConfig);
		return {
			enabled: true,
			modules: [...config.modules],
		};
	}

	async entities() {
		const { Agent } = await import('./entities/agent.entity');
		const { AgentCheckpoint } = await import('./entities/agent-checkpoint.entity');
		const { AgentResourceEntity } = await import('./entities/agent-resource.entity');
		const { AgentThreadEntity } = await import('./entities/agent-thread.entity');
		const { AgentMessageEntity } = await import('./entities/agent-message.entity');
		const { AgentExecutionThread } = await import('./entities/agent-execution-thread.entity');
		const { AgentExecution } = await import('./entities/agent-execution.entity');
		const { AgentPublishedVersion } = await import('./entities/agent-published-version.entity');
		const { AgentObservationEntity } = await import('./entities/agent-observation.entity');
		const { AgentObservationCursorEntity } = await import(
			'./entities/agent-observation-cursor.entity'
		);
		const { AgentObservationLockEntity } = await import('./entities/agent-observation-lock.entity');

		return [
			Agent,
			AgentCheckpoint,
			AgentResourceEntity,
			AgentThreadEntity,
			AgentMessageEntity,
			AgentExecutionThread,
			AgentExecution,
			AgentPublishedVersion,
			AgentObservationEntity,
			AgentObservationCursorEntity,
			AgentObservationLockEntity,
		];
	}

	async context() {
		const { AgentsService } = await import('./agents.service');

		return { agentsService: Container.get(AgentsService) };
	}
}
