import { principalFromUser, type User } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';

/**
 * The security context of a published agent run (runtime identity). The agent's
 * service account is the subject, so its access is what counts. The person who
 * started the run, when n8n knows them, is the actor. They go along with the
 * run, but they do not change what the agent can use.
 */
export function agentRunSecurityContext(account: User, person?: User): SecurityContext {
	return {
		subject: principalFromUser(account),
		...(person ? { actor: principalFromUser(person) } : {}),
		authMethod: 'agent-run',
	};
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
