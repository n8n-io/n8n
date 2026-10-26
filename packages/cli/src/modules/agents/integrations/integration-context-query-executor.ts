import { raceWithAbort } from '@n8n/agents';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';

import { ChatIntegrationRegistry } from './agent-chat-integration';
import { ChatIntegrationService, type ChatInstance } from './chat-integration.service';
import { INTEGRATION_ERROR_CODES } from './integration-error-codes';
import { connectionUnavailable, integrationError, rateLimitExceeded } from './integration-helpers';
import type {
	IntegrationContextQueryExecutor,
	IntegrationContextQueryParams,
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
	static readonly QUERY_TIMEOUT_MS = 30_000;

	constructor(
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly integrationRegistry: ChatIntegrationRegistry,
		private readonly channelRateLimitGuard: ChannelRateLimitGuard,
	) {}

	async execute(params: IntegrationContextQueryParams): Promise<unknown> {
		params.abortSignal?.throwIfAborted();
		const deadline = new AbortController();
		const signal = params.abortSignal
			? AbortSignal.any([params.abortSignal, deadline.signal])
			: deadline.signal;
		const timer = setTimeout(() => {
			deadline.abort(new OperationalError('The integration context query timed out.'));
		}, ChatIntegrationContextQueryExecutor.QUERY_TIMEOUT_MS);
		try {
			return await raceWithAbort(
				async () => await this.executeQuery({ ...params, abortSignal: signal }),
				signal,
			);
		} catch (error) {
			params.abortSignal?.throwIfAborted();
			if (deadline.signal.aborted) {
				const timeoutSeconds = ChatIntegrationContextQueryExecutor.QUERY_TIMEOUT_MS / 1000;
				const lookupHint =
					params.query === 'get_user' || params.query === 'search_users'
						? ' For a user lookup, use a known ID or an exact email address, or ask the user for a mention.'
						: '';
				return integrationError(
					INTEGRATION_ERROR_CODES.CONTEXT_QUERY_TIMEOUT,
					`The ${params.descriptor.integration.type} ${params.query} query took longer than ${timeoutSeconds} seconds. The query did not finish.${lookupHint}`,
				);
			}
			return caughtIntegrationError(error, {
				connectionId: params.descriptor.integrationConnectionId,
				platform: params.descriptor.integration.type,
				guard: this.channelRateLimitGuard,
				failedCode: INTEGRATION_ERROR_CODES.CONTEXT_QUERY_FAILED,
			});
		} finally {
			clearTimeout(timer);
		}
	}

	private async executeQuery(params: IntegrationContextQueryParams): Promise<unknown> {
		if (!params.descriptor.agentId) return connectionUnavailable();
		if (this.channelRateLimitGuard.isBlocked(params.descriptor.integrationConnectionId)) {
			return rateLimitExceeded(channelRateLimitMessage(params.descriptor.integration.type));
		}

		const integrationDef = this.integrationRegistry.get(params.descriptor.integration.type);
		if (!integrationDef?.executeContextQuery) {
			return integrationError(
				INTEGRATION_ERROR_CODES.UNSUPPORTED_QUERY,
				`The ${params.descriptor.integration.type} integration does not support context queries.`,
			);
		}

		let chat: ChatInstance | undefined;
		if (integrationDef.requiresChatInstance) {
			if (!params.descriptor.integration.credentialId) return connectionUnavailable();
			chat = await this.chatIntegrationService.getChatInstanceForTools(
				params.descriptor.agentId,
				params.descriptor.integration,
			);
			if (!chat) return connectionUnavailable();
		}
		params.abortSignal?.throwIfAborted();
		return await integrationDef.executeContextQuery({
			chat,
			descriptor: params.descriptor,
			query: params.query,
			input: params.input,
			abortSignal: params.abortSignal,
		});
	}
}

// Re-export the Linear normalizers used by tests / action executor message-context
// construction. Tests reference these via this module path.
export { normalizeLinearComment, normalizeLinearIssue } from './platforms/linear/linear-operations';
