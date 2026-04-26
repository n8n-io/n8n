import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_LLM_TOOL_NAME,
	ASK_QUESTION_TOOL_NAME,
	type AskCredentialResume,
	type AskLlmResume,
	type AskQuestionInput,
	type AskQuestionResume,
} from '@n8n/api-types';

/**
 * Build a one-line human-readable label for a resolved interactive tool call.
 * Used by `AgentChatToolSteps` to show the user's answer beside the tool name
 * (e.g. "→ ask_question · Slack") so resolved cards leave a compact trace in
 * scrollback instead of vanishing.
 *
 * Returns `undefined` for non-interactive tools or when the output isn't
 * shaped as expected — callers fall back to rendering just the tool name.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function summariseInteractiveOutput(
	toolName: string,
	output: unknown,
	input?: unknown,
): string | undefined {
	// Output comes off the wire as `unknown`; treat anything non-object-shaped
	// as malformed and bail. This prevents `in` / property access from
	// throwing when a malformed payload sneaks through.
	if (!isPlainObject(output)) return undefined;

	if (toolName === ASK_QUESTION_TOOL_NAME) {
		const resume = output as AskQuestionResume;
		if (!Array.isArray(resume.values) || resume.values.length === 0) return undefined;
		const opts = (input as AskQuestionInput | undefined)?.options ?? [];
		const labels = resume.values.map((v) => opts.find((o) => o.value === v)?.label ?? v);
		return labels.join(', ');
	}

	if (toolName === ASK_CREDENTIAL_TOOL_NAME) {
		const resume = output as AskCredentialResume;
		if ('skipped' in resume && resume.skipped) return 'Skipped';
		if ('credentialName' in resume && resume.credentialName) return resume.credentialName;
		return undefined;
	}

	if (toolName === ASK_LLM_TOOL_NAME) {
		const resume = output as AskLlmResume;
		if (!resume.provider || !resume.model) return undefined;
		const slug = `${resume.provider}/${resume.model}`;
		return resume.credentialName ? `${slug} · ${resume.credentialName}` : slug;
	}

	return undefined;
}
