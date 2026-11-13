import { assertInstanceAiPromptVersion } from '../../src/prompts/prompt-profiles';
import type { WorkflowTestCase } from '../types';

/** A case pin takes precedence over `N8N_EVAL_PROMPT_VERSION`. Unset uses the backend assignment. */
export function resolveEvalPromptVersion(
	testCase: Pick<WorkflowTestCase, 'promptVersion'>,
): string | undefined {
	const promptVersion = testCase.promptVersion ?? process.env.N8N_EVAL_PROMPT_VERSION?.trim();
	if (!promptVersion) return undefined;
	assertInstanceAiPromptVersion(promptVersion);
	return promptVersion;
}
