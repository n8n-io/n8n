import type { AgentIntegrationConfig } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { StateAdapter } from 'chat';

import { Publisher } from '@/scaling/pubsub/publisher.service';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';

import {
	AgentChatSubscriptionStateAdapter,
	scopeKey,
	type SubscriptionAction,
} from './agent-chat-subscription-state.adapter';
import {
	AgentChatSubscriptionRepository,
	type AgentChatSubscriptionScope,
} from '../repositories/agent-chat-subscription.repository';

interface CreateStateAdapterOptions {
	agentId: string;
	integration: AgentIntegrationConfig;
	delegate: StateAdapter;
}

function toScope(agentId: string, integration: AgentIntegrationConfig): AgentChatSubscriptionScope {
	return {
		agentId,
		integrationType: integration.type,
		credentialId: integration.credentialId,
	};
}

@Service()
export class AgentChatSubscriptionStateService {
	private readonly activeStates = new Map<string, AgentChatSubscriptionStateAdapter>();

	constructor(
		private readonly logger: Logger,
		private readonly repository: AgentChatSubscriptionRepository,
		private readonly publisher: Publisher,
		private readonly globalConfig: GlobalConfig,
	) {}

	createStateAdapter(options: CreateStateAdapterOptions): StateAdapter {
		const scope = toScope(options.agentId, options.integration);
		const state = new AgentChatSubscriptionStateAdapter(
			scope,
			options.integration,
			options.delegate,
			this.repository,
			async (integration, threadId, action) =>
				await this.publishSubscriptionChanged(options.agentId, integration, threadId, action),
			(disconnectedState) => this.unregister(disconnectedState),
		);
		this.activeStates.set(state.key, state);
		return state;
	}

	async deleteSubscriptionsForIntegration(
		agentId: string,
		integration: AgentIntegrationConfig,
	): Promise<void> {
		await this.repository.deleteForConnection(toScope(agentId, integration));
	}

	@OnPubSubEvent('agent-chat-subscription-changed', { instanceType: 'main' })
	async handleSubscriptionChanged(
		payload: PubSubCommandMap['agent-chat-subscription-changed'],
	): Promise<void> {
		const state = this.activeStates.get(scopeKey(toScope(payload.agentId, payload.integration)));
		await state?.applyRemoteChange(payload.threadId, payload.action);
	}

	private unregister(state: AgentChatSubscriptionStateAdapter): void {
		if (this.activeStates.get(state.key) === state) {
			this.activeStates.delete(state.key);
		}
	}

	private async publishSubscriptionChanged(
		agentId: string,
		integration: AgentIntegrationConfig,
		threadId: string,
		action: SubscriptionAction,
	): Promise<void> {
		if (!this.globalConfig.multiMainSetup.enabled) return;
		try {
			await this.publisher.publishCommand({
				command: 'agent-chat-subscription-changed',
				payload: { agentId, integration, threadId, action },
			});
		} catch (error) {
			this.logger.warn(
				'[AgentChatSubscriptionStateService] Failed to publish subscription change',
				{
					agentId,
					integrationType: integration.type,
					credentialId: integration.credentialId,
					threadId,
					action,
					error: error instanceof Error ? error.message : String(error),
				},
			);
		}
	}
}
