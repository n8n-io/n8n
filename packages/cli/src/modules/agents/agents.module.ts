import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

@BackendModule({ name: 'agents' })
export class AgentsModule implements ModuleInterface {
	private interruptedExecutionSweepTimer?: NodeJS.Timeout;

	async init() {
		const { SandboxSettingsService } = await import('@/services/sandbox-settings.service.js');
		Container.get(SandboxSettingsService).registerCredentialUses();

		// Imported for its `@OnLifecycleEvent` registration, which happens at
		// class-decoration time — nothing else references this service.
		await import('./agent-workflow-tool-resume.service.js');

		await import('./agents-catalog.controller.js');
		await import('./agent-threads.controller.js');
		await import('./agents.controller.js');
		await import('./agents-config.controller.js');
		await import('./agents-skills.controller.js');
		await import('./agent-knowledge.controller.js');
		await import('./agent-publish.controller.js');
		await import('./agent-chat.controller.js');
		await import('./agent-integrations.controller.js');
		await import('./agent-slack-integrations.controller.js');
		await import('./agent-vector-stores.controller.js');
		await import('./agent-tasks.controller.js');
		await import('./agent-sandbox.controller.js');
		await import('./agents-list.controller.js');
		await import('./agent-mcp-access.controller.js');
		const { AgentsService } = await import('./agents.service.js');
		Container.get(AgentsService);

		const { AgentDependencyIndexListener } = await import('./agent-dependency-index.listener.js');
		Container.get(AgentDependencyIndexListener).init();

		const { AgentExecutionService } = await import('./agent-execution.service.js');
		Container.get(AgentExecutionService);

		// Register blob backends for agent execution logs and knowledge files.
		// The fs backend is always available; s3/az reuse the clients base-command
		// already initialized (initBinaryDataService runs before module init in
		// all commands), which exits the process when the configured execution
		// data backend cannot be reached — so a live process in s3/az mode always
		// has that location registered here.
		const { AgentExecutionLogStore } = await import('./execution-log/agent-execution-log-store.js');
		const { AgentKnowledgeFileStore } = await import('./agent-knowledge-file-store.js');
		const { ExecutionDataJsonStore } = await import(
			'@/executions/execution-data/execution-data-json-store.js'
		);
		const { registerAgentBlobByteStores } = await import('./register-blob-byte-stores.js');
		await registerAgentBlobByteStores({
			executionDataJsonStore: Container.get(ExecutionDataJsonStore),
			agentExecutionLogStore: Container.get(AgentExecutionLogStore),
			agentKnowledgeFileStore: Container.get(AgentKnowledgeFileStore),
		});

		const { registerFavoriteResolver } = await import('./register-favorite-resolver.js');
		registerFavoriteResolver();

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
		const { SlackIntegration } = await import(
			'./integrations/platforms/slack/slack-integration.js'
		);
		const { TelegramIntegration } = await import(
			'./integrations/platforms/telegram-integration.js'
		);
		const { LinearIntegration } = await import('./integrations/platforms/linear-integration.js');
		const { DiscordIntegration } = await import('./integrations/platforms/discord-integration.js');
		const { N8nChatIntegration } = await import('./integrations/platforms/n8n-chat-integration.js');
		const registry = Container.get(ChatIntegrationRegistry);
		registry.register(Container.get(SlackIntegration));
		registry.register(Container.get(TelegramIntegration));
		registry.register(Container.get(LinearIntegration));
		registry.register(Container.get(DiscordIntegration));
		registry.register(Container.get(N8nChatIntegration));

		// Resume Chat and Task services on startup so this main runs what its
		// current role calls for.
		//
		// Chat channels are reconciled on a loop rather than reconnected once:
		// startup is only the first pass, and every later pass is what lets a
		// channel that failed to start recover without a republish. Webhook-driven
		// platforms (Slack, Linear, Telegram in webhook mode) run on every main
		// because inbound webhooks are load-balanced; polling-driven ones
		// (Telegram in polling mode) are filtered to the leader via
		// `AgentChatIntegration.requiresLeader()`.
		//
		// Tasks remain leader-only by design — a cron firing on multiple
		// mains would run the agent twice for the same tick.
		const { AgentChannelReconciler } = await import(
			'./integrations/agent-channel-reconciler.service.js'
		);
		const { AgentTaskService } = await import('./agent-task.service.js');
		const channelReconciler = Container.get(AgentChannelReconciler);
		const taskService = Container.get(AgentTaskService);
		const logger = Container.get(Logger);
		const instanceSettings = Container.get(InstanceSettings);
		if (instanceSettings.instanceType === 'main') {
			// Loaded for its pubsub decorator
			await import('./background/agent-background-job.service.js');

			const { AgentInterruptedExecutionSweeper } = await import(
				'./agent-interrupted-execution-sweeper.js'
			);
			const sweep = () => {
				void Container.get(AgentInterruptedExecutionSweeper)
					.sweep()
					.catch((error: unknown) => {
						logger.error('[Agents] Interrupted execution sweep failed', { error });
					});
			};
			sweep();
			this.interruptedExecutionSweepTimer = setInterval(
				sweep,
				AgentInterruptedExecutionSweeper.LIVENESS_GRACE_MS,
			);
			this.interruptedExecutionSweepTimer.unref();
		}

		// Workers never receive inbound platform events: no webhook route, no polling
		// loop. Holding channels there would connect adapters nothing reads and, now
		// that startups are reported, publish status rows for a process that cannot
		// serve the channel either way. Webhook instances do serve the agent webhook
		// route, so they keep their channels.
		if (instanceSettings.instanceType !== 'worker') {
			channelReconciler.init();
		}

		// Tasks are leader-only: only the leader should run the cron and reconnect tasks on startup.
		// TODO: migrate to the durable scheduler
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

	@OnShutdown()
	async shutdown() {
		if (this.interruptedExecutionSweepTimer) {
			clearInterval(this.interruptedExecutionSweepTimer);
		}
	}

	async settings() {
		const config = Container.get(AgentsConfig);
		const { AiService } = await import('@/services/ai.service.js');
		const { SandboxSettingsService } = await import('@/services/sandbox-settings.service.js');
		const aiService = Container.get(AiService);
		const proxyEnabled = aiService.isProxyEnabled();
		return {
			enabled: true,
			modules: [...config.modules],
			knowledgeBaseEnabled: Container.get(SandboxSettingsService).isAgentSandboxEnabled(),
			proxyEnabled,
		};
	}

	async entities() {
		const { Agent } = await import('./entities/agent.entity.js');
		const { AgentFile } = await import('./entities/agent-file.entity.js');
		const { AgentChatAttachment } = await import('./entities/agent-chat-attachment.entity.js');
		const { AgentChatSubscription } = await import('./entities/agent-chat-subscription.entity.js');
		const { AgentChannelStatus } = await import('./entities/agent-channel-status.entity.js');
		const { AgentCheckpoint } = await import('./entities/agent-checkpoint.entity.js');
		const { AgentResourceEntity } = await import('./entities/agent-resource.entity.js');
		const { AgentThreadEntity } = await import('./entities/agent-thread.entity.js');
		const { AgentMessageEntity } = await import('./entities/agent-message.entity.js');
		const { AgentExecutionThread } = await import('./entities/agent-execution-thread.entity.js');
		const { AgentExecution } = await import('./entities/agent-execution.entity.js');
		const { AgentBackgroundJob } = await import('./entities/agent-background-job.entity.js');
		const { AgentHistory } = await import('./entities/agent-history.entity.js');
		const { AgentCredentialDependency } = await import(
			'./entities/agent-credential-dependency.entity.js'
		);
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
			AgentChatAttachment,
			AgentChatSubscription,
			AgentChannelStatus,
			AgentCheckpoint,
			AgentResourceEntity,
			AgentThreadEntity,
			AgentMessageEntity,
			AgentExecutionThread,
			AgentExecution,
			AgentBackgroundJob,
			AgentHistory,
			AgentCredentialDependency,
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
