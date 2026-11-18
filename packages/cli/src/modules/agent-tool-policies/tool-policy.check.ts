import { Logger } from '@n8n/backend-common';
import type {
	PolicyCheckResult,
	PreToolExecutionContext,
	RegisteredPolicyCheck,
} from '@n8n/decorators';
import { PolicyCheck } from '@n8n/decorators';

import { evaluateToolCall } from './tool-policy-engine';

/**
 * Applies the tool policy of an agent to each tool call that the agent is about to run. The
 * policy is the one in the config of the agent that runs. A parent's policy does not apply
 * to a sub-agent with a config of its own.
 */
@PolicyCheck()
export class ToolPolicyCheck implements RegisteredPolicyCheck {
	readonly id = 'agent-tool-policy';

	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('policy');
	}

	async onPreToolExecution(context: PreToolExecutionContext): Promise<PolicyCheckResult> {
		const { agentId, toolCallId, tool, toolPolicy } = context;
		// The lines name the call only. The input of a tool call is not redacted.
		if (toolPolicy === null) {
			this.logger.debug(`Agent tool policy: none for ${tool.name}`, { agentId, toolCallId });
			return { violations: [] };
		}

		const decision = await evaluateToolCall({ policy: toolPolicy, context, checkId: this.id });
		this.logger.debug(`Agent tool policy: ${decision.action} ${tool.name}`, {
			agentId,
			toolCallId,
			ruleIds: decision.ruleIds,
		});

		return { violations: decision.violations };
	}
}
