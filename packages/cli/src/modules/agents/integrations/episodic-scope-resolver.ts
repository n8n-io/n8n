import type { EpisodicScopeDecision } from '@n8n/agents';
import type { Logger } from 'n8n-workflow';

import type { AgentChatIntegration, EpisodicScopeContext } from './agent-chat-integration';

/**
 * Asks the channel who owns the episodic memories of an incoming chat turn.
 * A channel without a policy, or one that cannot resolve the required identity,
 * turns episodic memory off for the turn. The conversation continues.
 */
export async function resolveEpisodicScopeDecision(
	integration: Pick<AgentChatIntegration, 'resolveEpisodicScope'> | undefined,
	context: EpisodicScopeContext,
	logger: Logger,
): Promise<EpisodicScopeDecision> {
	const diagnostic = {
		agentId: context.agentId,
		integrationType: context.integrationType,
		threadId: context.threadId,
	};
	try {
		const scope = await integration?.resolveEpisodicScope(context);
		if (scope) return scope;
		logger.warn(
			'Episodic memory is off for this turn: the channel did not resolve ownership',
			diagnostic,
		);
	} catch (error) {
		logger.warn('Episodic memory is off for this turn: the channel failed to resolve ownership', {
			...diagnostic,
			error: error instanceof Error ? error.message : String(error),
		});
	}
	return { disabled: true };
}
