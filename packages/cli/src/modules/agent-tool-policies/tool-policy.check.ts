import { Logger } from '@n8n/backend-common';
import type {
	PolicyCheckResult,
	PreToolExecutionContext,
	RegisteredPolicyCheck,
} from '@n8n/decorators';
import { PolicyCheck } from '@n8n/decorators';

import { collectToolPolicies } from './tool-policy-chain';
import { evaluateToolCall } from './tool-policy-engine';

/**
 * Applies tool policies to each tool call that an agent is about to run: the policy of the
 * agent itself and the policy of each agent that delegated to it. The call runs only if each
 * of them allows it.
 */
@PolicyCheck()
export class ToolPolicyCheck implements RegisteredPolicyCheck {
	readonly id = 'agent-tool-policy';

	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('policy');
	}

	async onPreToolExecution(context: PreToolExecutionContext): Promise<PolicyCheckResult> {
		const { agentId, toolCallId, tool } = context;
		const policies = await collectToolPolicies(
			context,
			context.toolPolicy ?? undefined,
			async (parentAgentId) => (await context.loadAgentToolPolicy(parentAgentId)) ?? undefined,
		);
		// The lines name the call only. The input of a tool call is not redacted.
		if (policies.length === 0) {
			this.logger.debug(`Agent tool policy: none for ${tool.name}`, { agentId, toolCallId });
			return { violations: [] };
		}

		const decision = await evaluateToolCall({ policies, context, checkId: this.id });
		this.logger.debug(`Agent tool policy: ${decision.action} ${tool.name}`, {
			agentId,
			toolCallId,
			policyAgentIds: policies.flatMap(({ source }) =>
				source.kind === 'agent' ? [source.agentId] : [],
			),
			ruleIds: decision.ruleIds,
		});

		return { violations: decision.violations };
	}
}
