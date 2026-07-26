import { Service } from '@n8n/di';

import { ChatIntegrationRegistry } from './agent-chat-integration';
import { ChatIntegrationService } from './chat-integration.service';
import { INTEGRATION_ERROR_CODES } from './integration-error-codes';
import { connectionUnavailable, integrationError } from './integration-helpers';
import type {
	IntegrationContextQuery,
	IntegrationContextQueryExecutor,
	IntegrationToolConnectionDescriptor,
} from './integration-tools';

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
	) {}

	async execute(params: {
		descriptor: IntegrationToolConnectionDescriptor;
		query: IntegrationContextQuery;
		input: Record<string, unknown>;
		persistence?: { threadId: string; resourceId: string };
	}): Promise<unknown> {
		if (!params.descriptor.agentId) return connectionUnavailable();

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
				return integrationError(
					INTEGRATION_ERROR_CODES.CONTEXT_QUERY_FAILED,
					error instanceof Error ? error.message : String(error),
				);
			}
		}

		const { credentialId } = params.descriptor.integration;
		if (!credentialId) return connectionUnavailable();

		const chat = this.chatIntegrationService.getChatInstance(params.descriptor.agentId, {
			type: params.descriptor.integration.type,
			credentialId,
		});
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
			return integrationError(
				INTEGRATION_ERROR_CODES.CONTEXT_QUERY_FAILED,
				error instanceof Error ? error.message : String(error),
			);
		}
	}
}

// Re-export the Linear normalizers used by tests / action executor message-context
// construction. Tests reference these via this module path.
export { normalizeLinearComment, normalizeLinearIssue } from './platforms/linear-operations';
