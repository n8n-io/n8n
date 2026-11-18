import type { ToolPolicy } from '@n8n/api-types';
import type { PreToolExecutionContext } from '@n8n/decorators';

import type { SourcedToolPolicy } from './tool-policy-engine';

/** Loads the tool policy of an agent. `undefined` when the agent has none. */
export type LoadAgentToolPolicy = (agentId: string) => Promise<ToolPolicy | undefined>;

/**
 * The policies that apply to a tool call: the policy of the calling agent, then the policy of
 * each agent that delegated to it, up to the root. Pass the result to `evaluateToolCall`,
 * which allows the call only if each policy allows it.
 *
 * The policies are not merged into one. One policy cannot hold several default actions, and
 * a tool ref names a tool of one agent only, so a merge would lose what each policy says.
 *
 * The parents come from `sessionHistory`, so this reads the history for a delegated run. An agent that delegates to itself, directly or further up, counts once.
 */
export async function collectToolPolicies(
	context: PreToolExecutionContext,
	ownPolicy: ToolPolicy | undefined,
	loadAgentPolicy: LoadAgentToolPolicy,
): Promise<SourcedToolPolicy[]> {
	const policies: SourcedToolPolicy[] = [];
	if (ownPolicy) {
		policies.push({ source: { kind: 'agent', agentId: context.agentId }, policy: ownPolicy });
	}

	// Only a run that another agent delegated has parents. Every other run skips the history.
	if (!context.delegated) return policies;

	const sessions = await context.sessionHistory();
	const seen = new Set<string>([context.agentId]);
	const parentIds: string[] = [];
	for (const session of sessions) {
		if (session.agentId === null || seen.has(session.agentId)) continue;
		seen.add(session.agentId);
		parentIds.push(session.agentId);
	}

	const loaded = await Promise.all(
		parentIds.map(async (agentId) => await loadAgentPolicy(agentId)),
	);
	parentIds.forEach((agentId, index) => {
		const policy = loaded[index];
		if (policy) policies.push({ source: { kind: 'agent', agentId }, policy });
	});
	return policies;
}
