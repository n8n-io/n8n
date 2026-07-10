import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

@BackendModule({ name: 'agents' })
export class AgentsModule implements ModuleInterface {
	async init() {
		await import('./agents-catalog.controller');
		await import('./agent-threads.controller');
		await import('./agents.controller');
		await import('./agents-config.controller');
		await import('./agents-skills.controller');
		await import('./agent-knowledge.controller');
		await import('./agent-publish.controller');
		await import('./agent-chat.controller');
		await import('./agent-builder.controller');
		await import('./agent-integrations.controller');
		await import('./agent-vector-stores.controller');
		await import('./agent-tasks.controller');
		await import('./agent-sandbox.controller');
		await import('./agents-list.controller');
		await import('./builder/agents-builder-settings.controller');

		const { AgentsService } = await import('./agents.service');
		Container.get(AgentsService);

		const { AgentsBuilderSettingsService } = await import(
			'./builder/agents-builder-settings.service'
		);
		Container.get(AgentsBuilderSettingsService);

		const { AgentExecutionService } = await import('./agent-execution.service');
		Container.get(AgentExecutionService);

		const { AgentRuntimeCacheService } = await import('./agent-runtime-cache.service');
		Container.get(AgentRuntimeCacheService);

		const { AgentHistoryRepository } = await import('./repositories/agent-history.repository');
		Container.get(AgentHistoryRepository);

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
		const { N8nChatIntegration } = await import('./integrations/platforms/n8n-chat-integration');
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
		const { ChatIntegrationService } = await import('./integrations/chat-integration.service');
		const { AgentTaskService } = await import('./agent-task.service');
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
		const { isAgentKnowledgeBaseEnabled } = await import('./agent-knowledge-gate');
		return {
			enabled: true,
			modules: [...config.modules],
			knowledgeBaseEnabled: isAgentKnowledgeBaseEnabled(config),
		};
	}

	async entities() {
		const { Agent } = await import('./entities/agent.entity');
		const { AgentFile } = await import('./entities/agent-file.entity');
		const { AgentChatSubscription } = await import('./entities/agent-chat-subscription.entity');
		const { AgentCheckpoint } = await import('./entities/agent-checkpoint.entity');
		const { AgentResourceEntity } = await import('./entities/agent-resource.entity');
		const { AgentThreadEntity } = await import('./entities/agent-thread.entity');
		const { AgentMessageEntity } = await import('./entities/agent-message.entity');
		const { AgentExecutionThread } = await import('./entities/agent-execution-thread.entity');
		const { AgentExecution } = await import('./entities/agent-execution.entity');
		const { AgentHistory } = await import('./entities/agent-history.entity');
		const { AgentTask } = await import('./entities/agent-task.entity');
		const { AgentTaskRunLock } = await import('./entities/agent-task-run-lock.entity');
		const { AgentTaskSnapshot } = await import('./entities/agent-task-snapshot.entity');
		const { AgentObservationEntity } = await import('./entities/agent-observation.entity');
		const { AgentObservationCursorEntity } = await import(
			'./entities/agent-observation-cursor.entity'
		);
		const { AgentObservationLockEntity } = await import('./entities/agent-observation-lock.entity');
		const { AgentMemoryEntryEntity } = await import('./entities/agent-memory-entry.entity');
		const { AgentMemoryEntryLockEntity } = await import(
			'./entities/agent-memory-entry-lock.entity'
		);
		const { AgentMemoryEntrySourceEntity } = await import(
			'./entities/agent-memory-entry-source.entity'
		);
		const { AgentMemoryEntryCursorEntity } = await import(
			'./entities/agent-memory-entry-cursor.entity'
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
		const { AgentsService } = await import('./agents.service');

		return { agentsService: Container.get(AgentsService) };
	}
}
