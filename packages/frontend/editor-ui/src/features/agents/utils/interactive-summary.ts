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
export function summariseInteractiveOutput(
	toolName: string,
	output: unknown,
	input?: unknown,
): string | undefined {
	if (output === undefined || output === null) return undefined;

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
