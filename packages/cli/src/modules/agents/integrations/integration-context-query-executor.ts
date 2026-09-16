import { Service } from '@n8n/di';

import { ChatIntegrationRegistry } from './agent-chat-integration';
import { ChatIntegrationService } from './chat-integration.service';
import { INTEGRATION_ERROR_CODES } from './integration-error-codes';
import { connectionUnavailable, integrationError, rateLimitExceeded } from './integration-helpers';
import type {
	IntegrationContextQuery,
	IntegrationContextQueryExecutor,
	IntegrationToolConnectionDescriptor,
} from './integration-tools';
import { ChannelRateLimitGuard } from './channel-rate-limit.guard';
import { caughtIntegrationError, channelRateLimitMessage } from './channel-rate-limit';

/**
 * Thin dispatcher that resolves the platform integration for a descriptor and
 * delegates the context query to its {@link AgentChatIntegration.executeContextQuery}
 * implementation. The actual per-platform logic lives in `platforms/*-operations.ts`.
 */
@Service()
export class ChatIntegrationContextQueryExecutor implements IntegrationContextQueryExecutor {
	constructor(
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly integrationRegistry: ChatIntegrationRegistry,
		private readonly channelRateLimitGuard: ChannelRateLimitGuard,
	) {}

	async execute(params: {
		descriptor: IntegrationToolConnectionDescriptor;
		query: IntegrationContextQuery;
		input: Record<string, unknown>;
		persistence?: { threadId: string; resourceId: string };
	}): Promise<unknown> {
		if (!params.descriptor.agentId) return connectionUnavailable();

		if (this.channelRateLimitGuard.isBlocked(params.descriptor.integrationConnectionId)) {
			return rateLimitExceeded(channelRateLimitMessage(params.descriptor.integration.type));
		}

		const integrationDef = this.integrationRegistry.get(params.descriptor.integration.type);
		if (integrationDef && !integrationDef.requiresChatInstance) {
			if (!integrationDef.executeContextQuery) {
				return integrationError(
					INTEGRATION_ERROR_CODES.UNSUPPORTED_QUERY,
					`The ${params.descriptor.integration.type} integration does not support context queries.`,
				);
			}
			try {
				return await integrationDef.executeContextQuery({
					chat: undefined,
					descriptor: params.descriptor,
					query: params.query,
					input: params.input,
				});
			} catch (error) {
				return caughtIntegrationError(error, {
					connectionId: params.descriptor.integrationConnectionId,
					platform: params.descriptor.integration.type,
					guard: this.channelRateLimitGuard,
					failedCode: INTEGRATION_ERROR_CODES.CONTEXT_QUERY_FAILED,
				});
			}
		}

		const { credentialId } = params.descriptor.integration;
		if (!credentialId) return connectionUnavailable();

		let chat = this.chatIntegrationService.getChatInstance(params.descriptor.agentId, {
			type: params.descriptor.integration.type,
			credentialId,
		});
		chat ??= await this.chatIntegrationService.getChatInstanceForTools(
			params.descriptor.agentId,
			params.descriptor.integration,
		);
		if (!chat) return connectionUnavailable();

		if (!integrationDef?.executeContextQuery) {
			return integrationError(
				INTEGRATION_ERROR_CODES.UNSUPPORTED_QUERY,
				`The ${params.descriptor.integration.type} integration does not support context queries.`,
			);
		}

		try {
			return await integrationDef.executeContextQuery({
				chat,
				descriptor: params.descriptor,
				query: params.query,
				input: params.input,
			});
		} catch (error) {
			return caughtIntegrationError(error, {
				connectionId: params.descriptor.integrationConnectionId,
				platform: params.descriptor.integration.type,
				guard: this.channelRateLimitGuard,
				failedCode: INTEGRATION_ERROR_CODES.CONTEXT_QUERY_FAILED,
			});
		}
	}
}

// Re-export the Linear normalizers used by tests / action executor message-context
// construction. Tests reference these via this module path.
export { normalizeLinearComment, normalizeLinearIssue } from './platforms/linear-operations';
