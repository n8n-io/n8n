import type { EpisodicScopeDecision, ResolvedEpisodicScope } from '@n8n/agents';
import { Service } from '@n8n/di';
import type { Logger } from 'n8n-workflow';

import type { AgentChatIntegration, EpisodicScopeContext } from './agent-chat-integration';
import { AgentMessageRepository } from '../repositories/agent-message.repository';
import {
	defaultEpisodicMemoryReadScopeIds,
	EPISODIC_MEMORY_MAX_THREAD_SCOPES,
	episodicMemoryWriteScopeId,
	isIntegrationMemoryResourceId,
} from '../utils/agent-memory-scope';

/**
 * Applies an integration's own episodic ownership policy to an incoming chat
 * turn. Returns `undefined` when the integration has none, so the shared
 * default applies. A policy that cannot resolve identity turns episodic memory
 * off for the turn. It never falls back to the default.
 */
export function resolveEpisodicScopeOverride(
	integration: Pick<AgentChatIntegration, 'resolveEpisodicScope'> | undefined,
	context: EpisodicScopeContext,
	logger: Logger,
): EpisodicScopeDecision | undefined {
	if (!integration?.resolveEpisodicScope) return undefined;
	const scope = integration.resolveEpisodicScope(context);
	if (scope) return scope;
	logger.warn('Episodic memory is off for this turn: the integration could not resolve ownership', {
		agentId: context.agentId,
		integrationType: context.integrationType,
		threadId: context.threadId,
	});
	return { disabled: true };
}

/** The shared default policy: thread-scoped writes, recall from the user's participated threads. */
@Service()
export class EpisodicScopeResolver {
	constructor(private readonly messageRepository: AgentMessageRepository) {}

	async resolveDefault(
		agentId: string,
		scope: { resourceId: string; threadId: string },
	): Promise<ResolvedEpisodicScope> {
		const participatedThreadIds = isIntegrationMemoryResourceId(scope.resourceId)
			? await this.messageRepository.findRecentThreadIdsByResourceId(
					agentId,
					scope.resourceId,
					EPISODIC_MEMORY_MAX_THREAD_SCOPES,
				)
			: [];
		return {
			writeScopeId: episodicMemoryWriteScopeId(scope),
			readScopeIds: defaultEpisodicMemoryReadScopeIds(scope, participatedThreadIds),
		};
	}
}
