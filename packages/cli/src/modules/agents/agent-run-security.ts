import { principalFromUser, type User } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';

/**
 * The security context of a published agent run (runtime identity). The agent
 * acts as itself: its service account is the subject, so its access counts.
 * There is no actor. A person who chats with the agent does not delegate
 * anything, so they stay in the run attribution (`RelatedAgentRun.userId`),
 * not in the security context. On behalf of a person is a later step.
 */
export function agentRunSecurityContext(account: User): SecurityContext {
	return { subject: principalFromUser(account), authMethod: 'agent-run' };
}

/**
 * The context of one run. The run is the sub-identity of the service account,
 * like a login, so each action can be traced to the run that did it.
 */
export function forAgentRun(security: SecurityContext, runId: string): SecurityContext {
	return { ...security, subIdentityId: runId };
}

/**
 * A sub-agent acts on behalf of its parent: the parent stays the subject, so
 * the sub-agent gets the access of the parent, and the sub-agent is the actor.
 */
export function onBehalfOfParent(parent: SecurityContext, subAgent: User): SecurityContext {
	return { ...parent, actor: principalFromUser(subAgent) };
}

/** Whether the run acts as an agent's service account. */
export function isAgentRun(security: SecurityContext | undefined): security is SecurityContext {
	return security?.authMethod === 'agent-run';
}
