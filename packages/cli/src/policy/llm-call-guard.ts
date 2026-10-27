import { setLlmCallGuard, type LlmGuardedCall } from '@n8n/ai-utilities/llm-usage';
import type { LlmCallPolicyContext } from '@n8n/decorators';

import type { PolicyEnforcementService } from './policy-enforcement.service';

/** The policy view of a guarded call. A check can fill the accountable user when the run has none. */
export function llmCallPolicyContext({
	context,
	credential,
	provider,
	model,
}: LlmGuardedCall): LlmCallPolicyContext {
	return {
		callerType: context.callerType,
		workflowId: context.workflowId ?? null,
		agentId: context.agentId ?? null,
		projectId: context.projectId ?? null,
		accountableUserId: context.userId ?? null,
		credential: credential ?? context.credential ?? null,
		provider: provider ?? null,
		model: model ?? null,
	};
}

/**
 * Sends every LLM call that a capture site guards through the `llmCall` point. A run is a system
 * actor, as at `workflowStart`. Capture sites cannot import cli, so they call this guard.
 */
export function installLlmCallGuard(enforcement: PolicyEnforcementService) {
	setLlmCallGuard(async (call) => {
		if (!enforcement.hasChecksFor('llmCall')) return;
		await enforcement.enforceLlmCall(llmCallPolicyContext(call), {
			kind: 'system',
			reason: 'execution',
			executionId: call.context.executionId,
		});
	});
}
