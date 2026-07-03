/**
 * SDK delegate tool, registered under the model-facing name `agent` (see
 * `docs/subagents.md`). ALL delegations — including `subAgentId: "inline"` —
 * route through {@link runInstanceAiSubAgent}, which runs them via the
 * existing `runSyncSubAgent` machinery. The SDK's own inline child runner is
 * never invoked.
 */
import { createDelegateSubAgentTool, type BuiltTool } from '@n8n/agents';

import { listAvailableSubAgents } from '../../subagents/registry';
import { runInstanceAiSubAgent } from '../../subagents/runner';
import type { OrchestrationContext } from '../../types';

/** Conservative v1 fan-out limit for concurrent child delegations. */
const MAX_CONCURRENT_DELEGATIONS = 3;

export function createAgentDelegateTool(context: OrchestrationContext): BuiltTool {
	return createDelegateSubAgentTool({
		name: 'agent',
		availableSubAgents: listAvailableSubAgents(),
		policy: { maxChildren: MAX_CONCURRENT_DELEGATIONS },
		runSubAgent: async (request) => await runInstanceAiSubAgent(request, context),
	});
}
