import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

@BackendModule({ name: 'agents' })
export class AgentsModule implements ModuleInterface {
	async init() {
		await import('./agents-catalog.controller.js');
		await import('./agent-threads.controller.js');
		await import('./agents.controller.js');
		await import('./agents-config.controller.js');
		await import('./agents-skills.controller.js');
		await import('./agent-knowledge.controller.js');
		await import('./agent-publish.controller.js');
		await import('./agent-chat.controller.js');
		await import('./agent-integrations.controller.js');
		await import('./agent-vector-stores.controller.js');
		await import('./agent-tasks.controller.js');
		await import('./agent-sandbox.controller.js');
		await import('./agents-list.controller.js');
		await import('./builder/agents-builder-settings.controller.js');

		const { AgentsService } = await import('./agents.service.js');
		Container.get(AgentsService);

		const { AgentsBuilderSettingsService } = await import(
			'./builder/agents-builder-settings.service.js'
		);
		Container.get(AgentsBuilderSettingsService);

		const { AgentExecutionService } = await import('./agent-execution.service.js');
		Container.get(AgentExecutionService);

		const { AgentRuntimeCacheService } = await import('./agent-runtime-cache.service.js');
		Container.get(AgentRuntimeCacheService);

		const { AgentHistoryRepository } = await import('./repositories/agent-history.repository.js');
		Container.get(AgentHistoryRepository);

		// Register the sandboxed runtime service (lazy — the V8 isolate is only
		// created on first use, so this import has negligible startup cost).
		const { AgentSecureRuntime } = await import('./runtime/agent-secure-runtime.js');
		Container.get(AgentSecureRuntime);

		// Populate the integration registry with supported chat platforms.
		// Adding a new platform is adding one subclass + one register() call.
		const { ChatIntegrationRegistry } = await import('./integrations/agent-chat-integration.js');
		const { SlackIntegration } = await import('./integrations/platforms/slack-integration.js');
		const { TelegramIntegration } = await import(
			'./integrations/platforms/telegram-integration.js'
		);
		const { LinearIntegration } = await import('./integrations/platforms/linear-integration.js');
		const { N8nChatIntegration } = await import('./integrations/platforms/n8n-chat-integration.js');
		const registry = Container.get(ChatIntegrationRegistry);
		registry.register(Container.get(SlackIntegration));
		registry.register(Container.get(TelegramIntegration));
		registry.register(Container.get(LinearIntegration));
		registry.register(Container.get(N8nChatIntegration));

		// Reconnect Chat and Task services on startup so this main resumes its
		// integrations and tasks for the role it currently holds.
		//
		// Chat integrations run on every main: webhook-driven platforms (Slack,
		// Linear, Telegram in webhook mode) need to be connected on every main
		// because inbound webhooks are load-balanced. Polling-driven integrations
		// (Telegram in polling mode) are filtered to leader-only inside the
		// service via `AgentChatIntegration.requiresLeader()`.
		//
		// Tasks remain leader-only by design — a cron firing on multiple
		// mains would run the agent twice for the same tick.
		const { ChatIntegrationService } = await import('./integrations/chat-integration.service.js');
		const { AgentTaskService } = await import('./agent-task.service.js');
		const chatService = Container.get(ChatIntegrationService);
		const taskService = Container.get(AgentTaskService);
		const logger = Container.get(Logger);
		const instanceSettings = Container.get(InstanceSettings);
		void chatService.reconnectAll().catch((error) => {
			logger.error('[Agents] Failed to reconnect integrations on startup', {
				error: error instanceof Error ? error.message : String(error),
			});
		});
		if (instanceSettings.isLeader) {
			void taskService.reconnectAll().catch((error) => {
				logger.error('[Agents] Failed to reconnect tasks on startup', {
					error: error instanceof Error ? error.message : String(error),
				});
			});
		} else {
			logger.debug('[Agents] Skipping task reconnect on startup — not leader');
		}
	}

	async settings() {
		const config = Container.get(AgentsConfig);
		const { isAgentKnowledgeBaseEnabled } = await import('./agent-knowledge-gate.js');
		const { AiService } = await import('@/services/ai.service.js');
		const aiService = Container.get(AiService);
		const proxyEnabled = aiService.isProxyEnabled();
		return {
			enabled: true,
			modules: [...config.modules],
			knowledgeBaseEnabled: isAgentKnowledgeBaseEnabled(config, proxyEnabled),
			proxyEnabled,
		};
	}

	async entities() {
		const { Agent } = await import('./entities/agent.entity.js');
		const { AgentFile } = await import('./entities/agent-file.entity.js');
		const { AgentChatSubscription } = await import('./entities/agent-chat-subscription.entity.js');
		const { AgentCheckpoint } = await import('./entities/agent-checkpoint.entity.js');
		const { AgentResourceEntity } = await import('./entities/agent-resource.entity.js');
		const { AgentThreadEntity } = await import('./entities/agent-thread.entity.js');
		const { AgentMessageEntity } = await import('./entities/agent-message.entity.js');
		const { AgentExecutionThread } = await import('./entities/agent-execution-thread.entity.js');
		const { AgentExecution } = await import('./entities/agent-execution.entity.js');
		const { AgentHistory } = await import('./entities/agent-history.entity.js');
		const { AgentTask } = await import('./entities/agent-task.entity.js');
		const { AgentTaskRunLock } = await import('./entities/agent-task-run-lock.entity.js');
		const { AgentTaskSnapshot } = await import('./entities/agent-task-snapshot.entity.js');
		const { AgentObservationEntity } = await import('./entities/agent-observation.entity.js');
		const { AgentObservationCursorEntity } = await import(
			'./entities/agent-observation-cursor.entity.js'
		);
		const { AgentObservationLockEntity } = await import(
			'./entities/agent-observation-lock.entity.js'
		);
		const { AgentMemoryEntryEntity } = await import('./entities/agent-memory-entry.entity.js');
		const { AgentMemoryEntryLockEntity } = await import(
			'./entities/agent-memory-entry-lock.entity.js'
		);
		const { AgentMemoryEntrySourceEntity } = await import(
			'./entities/agent-memory-entry-source.entity.js'
		);
		const { AgentMemoryEntryCursorEntity } = await import(
			'./entities/agent-memory-entry-cursor.entity.js'
		);

		return [
			Agent,
			AgentFile,
			AgentChatSubscription,
			AgentCheckpoint,
			AgentResourceEntity,
			AgentThreadEntity,
			AgentMessageEntity,
			AgentExecutionThread,
			AgentExecution,
			AgentHistory,
			AgentTask,
			AgentTaskRunLock,
			AgentTaskSnapshot,
			AgentObservationEntity,
			AgentObservationCursorEntity,
			AgentObservationLockEntity,
			AgentMemoryEntryEntity,
			AgentMemoryEntryLockEntity,
			AgentMemoryEntrySourceEntity,
			AgentMemoryEntryCursorEntity,
		];
	}

	async context() {
		const { AgentsService } = await import('./agents.service.js');

		return { agentsService: Container.get(AgentsService) };
	}
}
