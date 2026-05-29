import { z } from 'zod';

/**
 * Name of the SDK tool a parent agent calls to hand a task to a sub-agent.
 * Mirrors `DELEGATE_SUB_AGENT_TOOL_NAME` in `@n8n/agents` (not FE-importable),
 * so the chat can special-case the tool call and render it as an expandable
 * tool step.
 */
export const DELEGATE_SUB_AGENT_TOOL_NAME = 'delegate_subagent';

// FE-local parsers for the fields the chat reads off a delegate_subagent call.
// The full input/output shapes live in `@n8n/agents` (not exported as
// api-types); we only parse what the tool step renders — the sub-agent it ran
// (input) and its answer (output). Extra keys are stripped.
const delegateInputSchema = z.object({
	subAgentId: z.string().optional(),
	taskName: z.string().optional(),
});

const delegateOutputSchema = z.object({
	answer: z.string().optional(),
});

export type DelegateInput = z.infer<typeof delegateInputSchema>;
export type DelegateOutput = z.infer<typeof delegateOutputSchema>;

export function isDelegateSubAgentTool(toolName: string | undefined): boolean {
	return toolName === DELEGATE_SUB_AGENT_TOOL_NAME;
}

/** Parse a delegate tool-call input; returns `undefined` when it isn't an object. */
export function parseDelegateInput(input: unknown): DelegateInput | undefined {
	const result = delegateInputSchema.safeParse(input);
	return result.success ? result.data : undefined;
}

/**
 * Parse a delegate tool-call output; returns `undefined` when it isn't an object
 * (e.g. a rejected tool call whose output is the raw error string).
 */
export function parseDelegateOutput(output: unknown): DelegateOutput | undefined {
	const result = delegateOutputSchema.safeParse(output);
	return result.success ? result.data : undefined;
}

/** Humanize a snake/kebab task name, e.g. `research_api` → `Research api`. */
export function humanizeTaskName(taskName: string | undefined): string {
	const normalized = taskName?.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
	if (!normalized) return '';
	return normalized.charAt(0).toLocaleUpperCase() + normalized.slice(1);
}
