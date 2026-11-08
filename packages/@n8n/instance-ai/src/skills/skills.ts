import { loadRuntimeSkillSourceFromDirectory, type RuntimeSkillSource } from '@n8n/agents';
import { GROUPING_GUIDANCE } from '@n8n/workflow-sdk/prompts/sdk-reference';
import { TOP_LEVEL_ITEM_CEILING } from 'n8n-workflow';
import { resolve } from 'node:path';

import { applySkillGotchas, parseAblatedGotchas } from './skill-gotchas';
import { composeSkillVariants } from './skill-variants';
import { PROMPT_FRAGMENT_SKILLS, type PromptProfile } from '../prompts/prompt-profiles';

export const INSTANCE_AI_SKILLS_DIR = resolve(__dirname, '..', '..', 'skills');

let cachedSkills: RuntimeSkillSource | undefined;
const cachedProfiles = new Map<string, ReturnType<typeof composeSkillVariants>>();

const SKILL_PLACEHOLDER_TEXT: Record<string, string> = {
	GROUPING_GUIDANCE_PLACEHOLDER: GROUPING_GUIDANCE,
	TOP_LEVEL_ITEM_CEILING_PLACEHOLDER: String(TOP_LEVEL_ITEM_CEILING),
};

// Eval-only: removes the named gotcha lines so a run shows whether each one still matters.
const ABLATED_GOTCHAS = parseAblatedGotchas(process.env.N8N_INSTANCE_AI_SKILL_ABLATE);

function substituteSkillPlaceholders(instructions: string): string {
	const substituted = Object.entries(SKILL_PLACEHOLDER_TEXT).reduce(
		(content, [placeholder, text]) => content.replaceAll(`{{${placeholder}}}`, text),
		instructions,
	);
	return applySkillGotchas(substituted, ABLATED_GOTCHAS);
}

/** Bundled Assistant skills, including the fragments that prompt profiles append. */
export function loadInstanceAiSkills(): RuntimeSkillSource {
	cachedSkills ??= loadRuntimeSkillSourceFromDirectory(INSTANCE_AI_SKILLS_DIR, {
		transformInstructions: substituteSkillPlaceholders,
	});
	return cachedSkills;
}

/** The skills of a prompt profile, and the tools that the profile turns off. */
export async function loadInstanceAiPromptSkills(profile: PromptProfile) {
	let pending = cachedProfiles.get(profile.version);
	if (!pending) {
		pending = composeSkillVariants(
			loadInstanceAiSkills(),
			profile.variants,
			PROMPT_FRAGMENT_SKILLS,
		);
		cachedProfiles.set(profile.version, pending);
	}
	return await pending;
}
