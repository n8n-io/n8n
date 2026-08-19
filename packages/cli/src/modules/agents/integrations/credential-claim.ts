import { ConflictError } from '@/errors/response-errors/conflict.error';

import type { AgentChannelPreconditionContext } from './agent-chat-integration';
import type { AgentRepository } from '../repositories/agent.repository';

/**
 * Reject a channel whose credential another agent already claims.
 *
 * A bot credential delivers events to exactly one destination, so a second
 * agent connecting the same one takes the first agent's channel over silently.
 * Every platform that owns its credential this way shares this check, and
 * shares one message: it names the agent holding the credential and what to do
 * about it, because the only fix is a decision the user has to make.
 */
export async function assertCredentialNotClaimed(
	agentRepository: AgentRepository,
	displayLabel: string,
	type: string,
	ctx: AgentChannelPreconditionContext,
): Promise<void> {
	const others = await agentRepository.findByIntegrationCredential(
		type,
		ctx.credentialId,
		ctx.projectId,
		ctx.agentId,
	);
	if (others.length === 0) return;

	throw new ConflictError(
		`This ${displayLabel} credential is already connected to agent "${others[0].name}". ` +
			`Disconnect the channel there, or connect this agent with a different ${displayLabel} credential.`,
	);
}
