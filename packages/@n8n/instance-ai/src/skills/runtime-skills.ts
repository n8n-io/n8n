import { loadRuntimeSkillSourceFromDirectory, type RuntimeSkillSource } from '@n8n/agents';
import type { InstanceAiBuildMode } from '@n8n/api-types';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { GROUPING_GUIDANCE } from '@n8n/workflow-sdk/prompts/sdk-reference';
import { TOP_LEVEL_ITEM_CEILING } from 'n8n-workflow';
import { resolve } from 'node:path';

import type { Logger } from '../logger';
import type { InstanceAiTraceContext } from '../types';
import {
	N8N_MCP_BUILDING_VARIANT,
	PROMPT_FRAGMENT_SKILLS,
	resolvePromptProfile,
	type PromptProfile,
} from '../prompts/prompt-profiles';
import { composeSkillVariants } from '../prompts/skill-variants';

export const INSTANCE_AI_SKILLS_DIR = resolve(__dirname, '..', '..', 'skills');

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

/**
 * Every bundled runtime skill. The sandbox image, the snapshot and each sandbox
 * store this set. Hide gated skills per run with `disabledInstanceAiSkillIds`.
 */
export function loadInstanceAiRuntimeSkillSource(): RuntimeSkillSource {
	cachedRuntimeSkillSource ??= loadRuntimeSkillSourceFromDirectory(INSTANCE_AI_SKILLS_DIR, {
		transformInstructions: substituteSkillPlaceholders,
	});
	return cachedRuntimeSkillSource;
}

export async function loadInstanceAiRuntimeSkillSourceForBuildMode(
	mode: InstanceAiBuildMode | undefined,
): Promise<RuntimeSkillSource> {
	return (await loadInstanceAiPromptSkills(resolvePromptProfile({ mode }).profile)).source;
}

/**
 * With `n8nMcpBuilding`, the MCP building variant replaces the profile variants,
 * because those variants build on the native pipeline that the MCP variant turns off.
 */
export async function loadInstanceAiPromptSkills(
	profile: PromptProfile,
	options: { n8nMcpBuilding?: boolean } = {},
) {
	const variants = options.n8nMcpBuilding ? [N8N_MCP_BUILDING_VARIANT] : profile.variants;
	const cacheKey = options.n8nMcpBuilding ? `${profile.version}+n8n-mcp` : profile.version;
	let pending = cachedProfiles.get(cacheKey);
	if (!pending) {
		pending = composeSkillVariants(
			loadInstanceAiRuntimeSkillSource(),
			variants,
			PROMPT_FRAGMENT_SKILLS,
		);
		cachedProfiles.set(cacheKey, pending);
	}
	return { ...(await pending), variantIds: variants.map((variant) => variant.id) };
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
