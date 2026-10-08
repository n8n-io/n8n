import { AGENT_TOOL_POLICY_REFUSED_STATUS, type AgentToolPolicyRefusal } from '@n8n/api-types';

import type { NonEmptyViolations } from '@/policy/policy-violation.error';

const POLICY_REFUSAL_INSTRUCTION =
	'An administrator policy refused this tool call. Do not retry it or work around it. ' +
	'Tell the user which action you could not do and why, then continue with the rest of the request.';

export function toPolicyRefusalResult(
	error: string,
	violations: NonEmptyViolations,
): AgentToolPolicyRefusal {
	return {
		status: AGENT_TOOL_POLICY_REFUSED_STATUS,
		error,
		violations,
		instruction: POLICY_REFUSAL_INSTRUCTION,
	};
}
