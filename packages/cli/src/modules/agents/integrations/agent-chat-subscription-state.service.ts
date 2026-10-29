import type { AgentIntegrationConfig } from '@n8n/api-types';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { StateAdapter } from 'chat';

import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';

import { AgentChatSubscriptionStateAdapter } from './agent-chat-subscription-state.adapter';
import { AgentChangePublisher } from '../agent-change-publisher.service';
import { AgentChatSubscriptionRepository } from '../repositories/agent-chat-subscription.repository';
import { agentChannelKey, agentChannelRef } from '../utils/agent-channel';

interface CreateStateAdapterOptions {
	agentId: string;
	integration: AgentIntegrationConfig;
	delegate: StateAdapter;
}

@Service()
export class AgentChatSubscriptionStateService {
	private readonly activeStates = new Map<string, AgentChatSubscriptionStateAdapter>();

	constructor(
		private readonly repository: AgentChatSubscriptionRepository,
		private readonly changePublisher: AgentChangePublisher,
	) {}

	createStateAdapter(options: CreateStateAdapterOptions): StateAdapter {
		const scope = agentChannelRef(options.agentId, options.integration);
		const state = new AgentChatSubscriptionStateAdapter(
			scope,
			options.integration,
			options.delegate,
			this.repository,
			async (integration, threadId, action) =>
				await this.changePublisher.publish({
					command: 'agent-chat-subscription-changed',
					payload: { agentId: options.agentId, integration, threadId, action },
				}),
			(disconnectedState) => this.unregister(disconnectedState),
		);
		this.activeStates.set(state.key, state);
		return state;
	}

	async deleteSubscriptionsForIntegration(
		agentId: string,
		integration: AgentIntegrationConfig,
	): Promise<void> {
		await this.repository.deleteForConnection(agentChannelRef(agentId, integration));
	}

	@OnPubSubEvent('agent-chat-subscription-changed', { instanceType: 'main' })
	async handleSubscriptionChanged(
		payload: PubSubCommandMap['agent-chat-subscription-changed'],
	): Promise<void> {
		const state = this.activeStates.get(
			agentChannelKey(agentChannelRef(payload.agentId, payload.integration)),
		);
		await state?.applyRemoteChange(payload.threadId, payload.action);
	}

	private unregister(state: AgentChatSubscriptionStateAdapter): void {
		if (this.activeStates.get(state.key) === state) {
			this.activeStates.delete(state.key);
		}
	}
}
