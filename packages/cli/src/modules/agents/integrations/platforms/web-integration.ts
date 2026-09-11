import type { AgentIntegrationConfig } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { randomUUID } from 'node:crypto';
import { UnexpectedError } from 'n8n-workflow';

import {
	AgentChatIntegration,
	type CredentialRequirement,
} from '../agent-chat-integration';

/**
 * Browser channel for a published agent.
 *
 * Unlike the platform channels, this one has no external service to connect to:
 * visitors reach the agent through n8n's own endpoints, so there is no
 * credential to store and no adapter for the reconciler to start. It exists in
 * the registry so the channel appears in the catalog and takes part in the same
 * connect/disconnect and status flows as every other channel.
 */
@Service()
export class WebIntegration extends AgentChatIntegration {
	readonly type = 'web';

	readonly credentialTypes: string[] = [];

	readonly displayLabel = 'Web';

	readonly displayIcon = 'globe';

	readonly requiresChatInstance = false;

	override connectionId(config: AgentIntegrationConfig): string {
		if (config.type === 'web') return config.integrationId;
		throw new UnexpectedError('The web integration received an incompatible config.');
	}

	override credentialRequirements(config: AgentIntegrationConfig): CredentialRequirement[] {
		if (
			config.type !== 'web' ||
			config.settings.accessMode !== 'basicAuth' ||
			!config.settings.basicAuthCredentialId
		) {
			return [];
		}
		return [
			{
				credentialId: config.settings.basicAuthCredentialId,
				acceptedCredentialTypes: ['httpBasicAuth'],
				path: 'settings.basicAuthCredentialId',
				role: 'access',
			},
		];
	}

	override adapterRuntimeConfig(): undefined {
		return undefined;
	}

	override withDefaultConnectionId(config: Record<string, unknown>): Record<string, unknown> {
		return typeof config.integrationId === 'string' && config.integrationId.length > 0
			? config
			: { ...config, integrationId: randomUUID() };
	}

	async createAdapter(): Promise<unknown> {
		throw new UnexpectedError('The web channel has no platform adapter.');
	}
}
