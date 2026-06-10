import type { BaseTextKey, useI18n } from '@n8n/i18n';
import { SUB_AGENT_TASK_DIFFICULTIES } from '@n8n/api-types';
import { z } from 'zod';

/**
 * Name of the SDK tool a parent agent calls to hand a task to a sub-agent.
 * Mirrors `DELEGATE_SUB_AGENT_TOOL_NAME` in `@n8n/agents` (not FE-importable),
 * so the chat can special-case the tool call and render it as an expandable
 * tool step.
 */
export const DELEGATE_SUB_AGENT_TOOL_NAME = 'delegate_subagent';
export const INLINE_SUB_AGENT_ID = 'inline';
/** Mirrors `DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE` in `@n8n/agents`. */
export const DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE =
	'agents.chat.delegate.childSuspendUnsupported';

// FE-local parsers for the fields the chat reads off a delegate_subagent call.
// The full input/output shapes live in `@n8n/agents` (not exported as
// api-types); we only parse what the tool step renders — the sub-agent it ran
// (input) and its answer (output). Extra keys are stripped.
const delegateInputSchema = z.object({
	subAgentId: z.string().min(1),
	taskName: z.string().optional(),
	difficulty: z.enum(SUB_AGENT_TASK_DIFFICULTIES).optional(),
});

const delegateOutputSchema = z.object({
	// A failed delegation still RESOLVES the tool call (the SDK never throws for
	// it), so the chat relies on `status`/`error` rather than the tool-call's
	// own error flag to render it as a failure.
	status: z.enum(['completed', 'failed', 'suspended']).optional(),
	answer: z.string().optional(),
	error: z.string().optional(),
	model: z.string().optional(),
});

export type DelegateInput = z.infer<typeof delegateInputSchema>;
export type DelegateOutput = z.infer<typeof delegateOutputSchema>;
export type DelegateDifficulty = NonNullable<DelegateInput['difficulty']>;

export const SUB_AGENT_DIFFICULTY_I18N_KEY: Record<DelegateDifficulty, BaseTextKey> = {
	low: 'agents.chat.difficulty.low',
	medium: 'agents.chat.difficulty.medium',
	high: 'agents.chat.difficulty.high',
};

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

export function getDelegateDifficulty(input: unknown): DelegateDifficulty | undefined {
	return parseDelegateInput(input)?.difficulty;
}

/** One-line localized difficulty label for a delegate tool call. */
export function getDelegateDifficultySummary(
	input: unknown,
	i18n: Pick<ReturnType<typeof useI18n>, 'baseText'>,
): string | undefined {
	const difficulty = getDelegateDifficulty(input);
	return difficulty ? i18n.baseText(SUB_AGENT_DIFFICULTY_I18N_KEY[difficulty]) : undefined;
}

/** Localize a delegate tool error when it is a known i18n key. */
export function formatDelegateError(
	error: string,
	i18n?: Pick<ReturnType<typeof useI18n>, 'baseText'>,
): string {
	if (i18n && error === DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE) {
		return i18n.baseText(DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE);
	}
	return error;
}

/**
 * True when a `delegate_subagent` call resolved with a failed result. Such a
 * call settles successfully at the tool layer, so its step must be flipped to an
 * error state explicitly (both live and on reload).
 */
export function isFailedDelegateOutput(toolName: string | undefined, output: unknown): boolean {
	if (!isDelegateSubAgentTool(toolName)) return false;
	return parseDelegateOutput(output)?.status === 'failed';
}

/** Humanize a snake/kebab task name, e.g. `research_api` → `Research api`. */
export function humanizeTaskName(taskName: string | undefined): string {
	const normalized = taskName?.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
	if (!normalized) return '';
	return normalized.charAt(0).toLocaleUpperCase() + normalized.slice(1);
}

/**
 * Resolve a delegate call's display name from its raw tool input: the configured
 * sub-agent's name when its id maps to one, else the humanized task name, else
 * `''`. Shared by the chat tool step and the session timeline so both label a
 * delegation identically.
 */
/** Friendly label for a raw sub-agent id (delegate hints, todo delegateHint, etc.). */
export function resolveSubAgentIdForDisplay(
	subAgentId: string,
	nameById: Map<string, string>,
): string {
	if (subAgentId === INLINE_SUB_AGENT_ID) {
		return humanizeTaskName('inline');
	}
	const resolved = nameById.get(subAgentId)?.trim();
	if (resolved) return resolved;
	return humanizeTaskName(subAgentId) || subAgentId;
}

export function resolveSubAgentName(input: unknown, nameById: Map<string, string>): string {
	const parsed = parseDelegateInput(input);
	// A blank/empty resolved name must fall through to the task name, so this is a
	// truthiness check (not nullish) on purpose.
	const resolved =
		parsed?.subAgentId && parsed.subAgentId !== INLINE_SUB_AGENT_ID
			? nameById.get(parsed.subAgentId)?.trim()
			: undefined;
	if (resolved) return resolved;
	return humanizeTaskName(parsed?.taskName);
}

/**
 * Format a delegate label: `Sub-agent · <name>` when a name resolved, otherwise
 * the bare `Sub-agent` fallback. Takes the i18n instance (rather than resolving
 * keys at the call site) so the chat, timeline row, and detail panel stay in
 * sync.
 */
export function delegateLabel(
	i18n: Pick<ReturnType<typeof useI18n>, 'baseText'>,
	name: string,
): string {
	return name
		? i18n.baseText('agents.chat.delegate.label', { interpolate: { name } })
		: i18n.baseText('agents.chat.delegate.labelFallback');
}
