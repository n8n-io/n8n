import { loadRuntimeSkillSourceFromDirectory, type RuntimeSkillSource } from '@n8n/agents';
import type { InstanceAiBuildMode } from '@n8n/api-types';
import { GROUPING_GUIDANCE } from '@n8n/workflow-sdk/prompts/sdk-reference';
import { TOP_LEVEL_ITEM_CEILING } from 'n8n-workflow';
import { resolve } from 'node:path';

import { isAgentFeatureEnabled } from '@/utils/agent-feature-enabled';

import {
	PROMPT_FRAGMENT_SKILLS,
	resolvePromptProfile,
	type PromptProfile,
} from '../prompts/prompt-profiles';
import { composeSkillVariants } from '../prompts/skill-variants';

export const INSTANCE_AI_SKILLS_DIR = resolve(__dirname, '..', '..', 'skills');
const AGENTS_MODULE_RUNTIME_SKILLS = new Set(['agent-builder', 'intent-recognition']);
// The Webpage node loads only when this flag is on. Without the flag, hide its skill so that
// the model does not build with a node that does not exist.
const WEBPAGE_RUNTIME_SKILL = 'webpage-builder';

function isWebpageNodeEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_WEBPAGE_NODE === 'true';
}

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
		exclude: [
			...(isAgentFeatureEnabled() ? [] : AGENTS_MODULE_RUNTIME_SKILLS),
			...(isWebpageNodeEnabled() ? [] : [WEBPAGE_RUNTIME_SKILL]),
		],
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
