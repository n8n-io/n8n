import type { InstanceAiBuildMode } from '@n8n/api-types';

import {
	assertInstanceAiPromptVersion,
	resolvePromptProfile,
} from '../../src/prompts/prompt-profiles';
import type { WorkflowTestCase } from '../types';

export function resolveEvalPromptSettings(
	testCase: Pick<WorkflowTestCase, 'buildMode' | 'promptVersion'>,
) {
	const promptVersion =
		testCase.promptVersion ??
		(testCase.buildMode === undefined ? process.env.N8N_EVAL_PROMPT_VERSION?.trim() : undefined);
	if (promptVersion) {
		assertInstanceAiPromptVersion(promptVersion);
		return {
			promptVersion,
			buildMode: resolvePromptProfile({ version: promptVersion }).profile.mode,
		};
	}
	return { promptVersion: undefined, buildMode: resolveEvalBuildMode(testCase.buildMode) };
}

/** Case overrides take precedence. Validate the environment only when it is used. */
export function resolveEvalBuildMode(
	buildMode: WorkflowTestCase['buildMode'],
): InstanceAiBuildMode {
	const mode = buildMode ?? process.env.N8N_EVAL_BUILD_MODE?.trim();
	if (!mode || mode === 'default') return 'default';
	if (mode === 'progressive') return mode;
	throw new Error('N8N_EVAL_BUILD_MODE must be "progressive" or "default", or unset');
}
