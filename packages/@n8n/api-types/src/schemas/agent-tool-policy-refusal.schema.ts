import { z } from 'zod';

import { policyViolationSchema } from './policy-violation.schema';

export const AGENT_TOOL_POLICY_REFUSED_STATUS = 'policy_refused';

/**
 * The result an agent tool returns when a policy refuses the call. A result, not a thrown
 * error, so the violations reach the chat and the model reads the instruction.
 */
export const agentToolPolicyRefusalSchema = z.object({
	status: z.literal(AGENT_TOOL_POLICY_REFUSED_STATUS),
	error: z.string(),
	violations: policyViolationSchema.array().nonempty(),
	instruction: z.string(),
});

export type AgentToolPolicyRefusal = z.infer<typeof agentToolPolicyRefusalSchema>;
