import { loadRuntimeSkillSourceFromDirectory, type RuntimeSkillSource } from '@n8n/agents';
import type { InstanceAiBuildMode } from '@n8n/api-types';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { GROUPING_GUIDANCE } from '@n8n/workflow-sdk/prompts/sdk-reference';
import { TOP_LEVEL_ITEM_CEILING } from 'n8n-workflow';
import { resolve } from 'node:path';

import { isAgentFeatureEnabled } from '@/utils/agent-feature-enabled';

import type { Logger } from '../logger';
import type { InstanceAiTraceContext } from '../types';
import {
	PROMPT_FRAGMENT_SKILLS,
	resolvePromptProfile,
	type PromptProfile,
} from '../prompts/prompt-profiles';
import { composeSkillVariants } from '../prompts/skill-variants';

export const INSTANCE_AI_SKILLS_DIR = resolve(__dirname, '..', '..', 'skills');
const AGENTS_MODULE_RUNTIME_SKILLS = new Set(['agent-builder', 'intent-recognition']);

let cachedRuntimeSkillSource: RuntimeSkillSource | undefined;
const cachedProfiles = new Map<string, ReturnType<typeof composeSkillVariants>>();

const SKILL_PLACEHOLDER_TEXT: Record<string, string> = {
	GROUPING_GUIDANCE_PLACEHOLDER: GROUPING_GUIDANCE,
	TOP_LEVEL_ITEM_CEILING_PLACEHOLDER: String(TOP_LEVEL_ITEM_CEILING),
};

export function substituteSkillPlaceholders(instructions: string): string {
	return Object.entries(SKILL_PLACEHOLDER_TEXT).reduce(
		(content, [placeholder, text]) => content.replaceAll(`{{${placeholder}}}`, text),
		instructions,
	);
}

export function loadInstanceAiRuntimeSkillSource(): RuntimeSkillSource {
	cachedRuntimeSkillSource ??= loadRuntimeSkillSourceFromDirectory(INSTANCE_AI_SKILLS_DIR, {
		exclude: isAgentFeatureEnabled() ? [] : [...AGENTS_MODULE_RUNTIME_SKILLS],
		transformInstructions: substituteSkillPlaceholders,
	});
	return cachedRuntimeSkillSource;
}

export async function loadInstanceAiRuntimeSkillSourceForBuildMode(
	mode: InstanceAiBuildMode | undefined,
): Promise<RuntimeSkillSource> {
	return (await loadInstanceAiPromptSkills(resolvePromptProfile({ mode }).profile)).source;
}

export async function loadInstanceAiPromptSkills(profile: PromptProfile) {
	let pending = cachedProfiles.get(profile.version);
	if (!pending) {
		pending = composeSkillVariants(
			loadInstanceAiRuntimeSkillSource(),
			profile.variants,
			PROMPT_FRAGMENT_SKILLS,
		);
		cachedProfiles.set(profile.version, pending);
	}
	return await pending;
}

export function hasRuntimeSkills(
	source: RuntimeSkillSource | undefined,
): source is RuntimeSkillSource {
	return (source?.registry.skills.length ?? 0) > 0;
}

/**
 * Prepare the skill source in the background so it overlaps with the first model
 * call. load_skill awaits the same promise and retries if this one fails. It runs
 * in the actor span, and keeps the trace open until it settles, so the sandbox
 * spans stay in the chat trace even when the reply finishes first.
 */
export function warmRuntimeSkills(
	source: RuntimeSkillSource,
	options: { logger?: Logger; tracing?: InstanceAiTraceContext } = {},
): void {
	const { prepare } = source;
	if (!prepare) return;
	const { logger, tracing } = options;
	const preparation = tracing
		? tracing.withActiveSpan(tracing.actorRun, async () => await prepare.call(source))
		: prepare.call(source);
	tracing?.keepOpenUntilSettled?.(preparation);
	preparation.catch((error: unknown) => {
		logger?.warn('Failed to warm runtime skills in the background', {
			error: getErrorMessage(error),
		});
	});
}
