import type { AgentGenerateChannelKeyResponse, AgentIntegrationConfig } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { randomBytes } from 'node:crypto';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { OpenAiCompatibleChannelType } from './openai-compatible-chat-integration';
import { OpenAiCompatibleChatService } from './openai-compatible-chat.service';
import { AgentIntegrationManagementService } from '../../agent-integration-management.service';
import type { Agent } from '../../entities/agent.entity';
import { AgentRepository } from '../../repositories/agent.repository';

/**
 * Connects an OpenWebUI/LibreChat channel to an agent. The channel stores no
 * secret and has no credential (see agent-connection-channels.md 5.5): setup
 * generates a random connection id, persists the integration entry keyed by it,
 * and returns the derived bearer token for one-time display. The token is
 * HMAC-derived from `(agentId, connectionId)` — see
 * `OpenAiCompatibleChatService.deriveToken` — so nothing sensitive is stored and
 * a failed connect leaves nothing to clean up.
 */
@Service()
export class OpenAiCompatibleSetupService {
	constructor(
		private readonly integrationManagementService: AgentIntegrationManagementService,
		private readonly agentRepository: AgentRepository,
		private readonly chatService: OpenAiCompatibleChatService,
	) {}

	async generateKey(options: {
		agentId: string;
		projectId: string;
		type: OpenAiCompatibleChannelType;
		user: User;
	}): Promise<AgentGenerateChannelKeyResponse> {
		const agent = await this.getAgent(options.agentId, options.projectId);
		const connectionId = this.generateConnectionId();

		const integration = {
			type: options.type,
			credentialId: connectionId,
			settings: {},
		} satisfies AgentIntegrationConfig;

		await this.integrationManagementService.connect({
			agent,
			user: options.user,
			integration,
		});

		return {
			connectionId,
			apiKey: this.chatService.deriveToken(options.agentId, connectionId),
		};
	}

	async regenerateKey(options: {
		agentId: string;
		projectId: string;
		type: OpenAiCompatibleChannelType;
		user: User;
	}): Promise<AgentGenerateChannelKeyResponse> {
		const agent = await this.getAgent(options.agentId, options.projectId);
		const current = (agent.integrations ?? []).find((entry) => entry.type === options.type);
		if (!current) {
			throw new NotFoundError(
				`Agent "${options.agentId}" has no connected ${options.type} channel`,
			);
		}

		// Disconnect first so the new connection id (and thus the new derived
		// token) replaces the old one; the old token stops validating the moment
		// its entry is gone.
		await this.integrationManagementService.disconnect({
			agent,
			user: options.user,
			type: options.type,
			credentialId: current.credentialId,
		});

		return await this.generateKey(options);
	}

	private async getAgent(agentId: string, projectId: string): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		return agent;
	}

	/** Random, opaque connection id; the integration entry's `credentialId`. */
	private generateConnectionId(): string {
		return randomBytes(16).toString('hex');
	}
}
