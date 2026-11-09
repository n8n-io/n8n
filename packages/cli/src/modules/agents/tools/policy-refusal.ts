import type { NonEmptyViolations } from '@/policy/policy-violation.error';

const POLICY_REFUSAL_INSTRUCTION =
	'An administrator policy refused this tool call. Do not retry it or work around it. ' +
	'Tell the user which action you could not do and why, then continue with the rest of the request.';

/** Same fields as a serialized `PolicyViolationError`, so existing refusal readers apply. */
export interface ToolPolicyRefusalResult {
	isPolicyRefusal: true;
	message: string;
	violations: NonEmptyViolations;
	instruction: string;
}

export function toPolicyRefusalResult(
	message: string,
	violations: NonEmptyViolations,
): ToolPolicyRefusalResult {
	return { isPolicyRefusal: true, message, violations, instruction: POLICY_REFUSAL_INSTRUCTION };
}
