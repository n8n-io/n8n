import type { ToolApprovalContext } from '@n8n/agents';

import type { InstanceAiContext } from '../types';

/**
 * The SDK approval context of a run, backed by the thread's "Always allow"
 * grants. Tools behind the SDK approval gate (MCP tools, for example) read
 * their grants from it, and an "Always allow" decision on their card is saved
 * as a thread grant. Without it, the SDK rejects an "Always allow" decision.
 * Returns `undefined` when the run has no grant storage.
 */
export function createThreadApprovalContext(
	context: Pick<InstanceAiContext, 'sessionApprovedToolKeys' | 'grantSessionToolApproval'>,
): ToolApprovalContext | undefined {
	const { sessionApprovedToolKeys, grantSessionToolApproval } = context;
	if (!sessionApprovedToolKeys || !grantSessionToolApproval) return undefined;
	return {
		// The run's grant set: a grant saved during the run applies to later calls.
		approvedKeys: sessionApprovedToolKeys,
		onDecision: async (grantKey, decision) => {
			if (decision.approved && decision.scope === 'session') {
				await grantSessionToolApproval(grantKey);
			}
		},
	};
}
