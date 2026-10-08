import { agentToolPolicyRefusalSchema, type AgentToolPolicyRefusal } from '@n8n/api-types';

/** The refusal a tool returns when a policy blocks the call, if `output` is one. */
export function parseToolPolicyRefusal(output: unknown): AgentToolPolicyRefusal | undefined {
	const parsed = agentToolPolicyRefusalSchema.safeParse(output);
	return parsed.success ? parsed.data : undefined;
}

export function isPolicyRefusedToolOutput(output: unknown): boolean {
	return parseToolPolicyRefusal(output) !== undefined;
}
