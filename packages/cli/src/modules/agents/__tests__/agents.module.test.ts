import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { AiService } from '@/services/ai.service';
import { ExecutionDataJsonStore } from '@/executions/execution-data/execution-data-json-store';
import { FavoriteResourceResolverRegistry } from '@/modules/favorites/favorite-resource-resolver.registry';
import { SandboxSettingsService } from '@/services/sandbox-settings.service';
import { AgentUsageProviderProxy } from '@/modules/workflow-index/agent-usage-provider-proxy.service';

import { AgentsModule } from '../agents.module';
import { AgentDependencyIndexListener } from '../agent-dependency-index.listener';
import { AgentExecutionService } from '../agent-execution.service';
import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentTaskService } from '../agent-task.service';
import { AgentsService } from '../agents.service';
import { AgentKnowledgeFileStore } from '../agent-knowledge-file-store';
import { AgentChannelReconciler } from '../integrations/agent-channel-reconciler.service';
import { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import { DiscordIntegration } from '../integrations/platforms/discord-integration';
import { LinearIntegration } from '../integrations/platforms/linear-integration';
import { N8nChatIntegration } from '../integrations/platforms/n8n-chat-integration';
import { SlackIntegration } from '../integrations/platforms/slack/slack-integration';
import { TelegramIntegration } from '../integrations/platforms/telegram-integration';
import { WhatsAppIntegration } from '../integrations/platforms/whatsapp-integration';
import { AgentExecutionLogStore } from '../execution-log/agent-execution-log-store';
import { AgentHistoryRepository } from '../repositories/agent-history.repository';
import { AgentCredentialDependencyRepository } from '../repositories/agent-credential-dependency.repository';
import { AgentWorkflowDependencyRepository } from '../repositories/agent-workflow-dependency.repository';
import { AgentRepository } from '../repositories/agent.repository';
import { AgentSecureRuntime } from '../runtime/agent-secure-runtime';

/**
 * Stubs every dependency `AgentsModule.init()` resolves via `Container.get`,
 * so the real `init()` can run end to end. `instanceType: 'worker'` and
 * `isLeader: false` keep the leader-only / main-only branches (interrupted-
 * execution sweeper, channel reconciler start, task reconnect, durable
 * scheduler) from running, which keeps the mocking surface to what always
 * executes.
 */
function setUpContainerForInit() {
	Container.set(SandboxSettingsService, mock<SandboxSettingsService>());
	Container.set(AgentsService, mock<AgentsService>());
	Container.set(AgentDependencyIndexListener, mock<AgentDependencyIndexListener>());
	Container.set(AgentExecutionService, mock<AgentExecutionService>());
	Container.set(AgentExecutionLogStore, mock<AgentExecutionLogStore>());
	Container.set(AgentKnowledgeFileStore, mock<AgentKnowledgeFileStore>());
	Container.set(ExecutionDataJsonStore, mock<ExecutionDataJsonStore>());
	Container.set(AgentRuntimeCacheService, mock<AgentRuntimeCacheService>());
	Container.set(AgentHistoryRepository, mock<AgentHistoryRepository>());
	Container.set(AgentSecureRuntime, mock<AgentSecureRuntime>());

	Container.set(AgentRepository, mock<AgentRepository>());
	Container.set(FavoriteResourceResolverRegistry, mock<FavoriteResourceResolverRegistry>());
	Container.set(AgentCredentialDependencyRepository, mock<AgentCredentialDependencyRepository>());
	Container.set(AgentWorkflowDependencyRepository, mock<AgentWorkflowDependencyRepository>());
	Container.set(AgentUsageProviderProxy, mock<AgentUsageProviderProxy>());

	// The real registry — this is what the test asserts against.
	const registry = new ChatIntegrationRegistry();
	Container.set(ChatIntegrationRegistry, registry);

	const slackIntegration = mock<SlackIntegration>({ type: 'slack' });
	const telegramIntegration = mock<TelegramIntegration>({ type: 'telegram' });
	const linearIntegration = mock<LinearIntegration>({ type: 'linear' });
	const discordIntegration = mock<DiscordIntegration>({ type: 'discord' });
	const whatsAppIntegration = mock<WhatsAppIntegration>({ type: 'whatsapp' });
	const n8nChatIntegration = mock<N8nChatIntegration>({ type: N8N_CHAT_INTEGRATION_TYPE });
	Container.set(SlackIntegration, slackIntegration);
	Container.set(TelegramIntegration, telegramIntegration);
	Container.set(LinearIntegration, linearIntegration);
	Container.set(DiscordIntegration, discordIntegration);
	Container.set(WhatsAppIntegration, whatsAppIntegration);
	Container.set(N8nChatIntegration, n8nChatIntegration);

	Container.set(AgentChannelReconciler, mock<AgentChannelReconciler>());
	Container.set(AgentTaskService, mock<AgentTaskService>());
	Container.set(Logger, mock<Logger>());
	Container.set(
		InstanceSettings,
		mock<InstanceSettings>({ instanceType: 'worker', isLeader: false }),
	);

	return {
		registry,
		slackIntegration,
		telegramIntegration,
		linearIntegration,
		discordIntegration,
		whatsAppIntegration,
		n8nChatIntegration,
	};
}

describe('AgentsModule', () => {
	let module: AgentsModule;

	beforeEach(() => {
		Container.reset();
		module = new AgentsModule();
	});

	describe('settings()', () => {
		it.each([
			{ sandboxEnabled: true, proxyEnabled: false },
			{ sandboxEnabled: false, proxyEnabled: true },
		])(
			'keeps knowledge base ($sandboxEnabled) and proxy ($proxyEnabled) availability independent',
			async ({ sandboxEnabled, proxyEnabled }) => {
				Container.set(AgentsConfig, mock<AgentsConfig>({ modules: [] }));
				Container.set(
					SandboxSettingsService,
					mock<SandboxSettingsService>({ isAgentSandboxEnabled: () => sandboxEnabled }),
				);
				Container.set(AiService, mock<AiService>({ isProxyEnabled: () => proxyEnabled }));

				const settings = await module.settings();

				expect(settings.knowledgeBaseEnabled).toBe(sandboxEnabled);
				expect(settings.proxyEnabled).toBe(proxyEnabled);
			},
		);
	});

	describe('init()', () => {
		it('registers WhatsApp in the chat integration registry, alongside every other platform', async () => {
			const {
				registry,
				slackIntegration,
				telegramIntegration,
				linearIntegration,
				discordIntegration,
				whatsAppIntegration,
				n8nChatIntegration,
			} = setUpContainerForInit();

			await module.init();

			expect(registry.get('whatsapp')).toBe(whatsAppIntegration);
			// WhatsApp is wired in the same call, the same way, as its siblings —
			// not as a special case.
			expect(registry.get('slack')).toBe(slackIntegration);
			expect(registry.get('telegram')).toBe(telegramIntegration);
			expect(registry.get('linear')).toBe(linearIntegration);
			expect(registry.get('discord')).toBe(discordIntegration);
			expect(registry.get(N8N_CHAT_INTEGRATION_TYPE)).toBe(n8nChatIntegration);
		});
	});
});
