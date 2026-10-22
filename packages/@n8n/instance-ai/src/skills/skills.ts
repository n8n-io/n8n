import { loadRuntimeSkillSourceFromDirectory, type RuntimeSkillSource } from '@n8n/agents';
import { GROUPING_GUIDANCE } from '@n8n/workflow-sdk/prompts/sdk-reference';
import { TOP_LEVEL_ITEM_CEILING } from 'n8n-workflow';
import { resolve } from 'node:path';

import { composeSkillVariants } from './skill-variants';
import { PROMPT_FRAGMENT_SKILLS, type PromptProfile } from '../prompts/prompt-profiles';

export const INSTANCE_AI_SKILLS_DIR = resolve(__dirname, '..', '..', 'skills');

let cachedSkills: RuntimeSkillSource | undefined;
const cachedProfiles = new Map<string, ReturnType<typeof composeSkillVariants>>();

const SKILL_PLACEHOLDER_TEXT: Record<string, string> = {
	GROUPING_GUIDANCE_PLACEHOLDER: GROUPING_GUIDANCE,
	TOP_LEVEL_ITEM_CEILING_PLACEHOLDER: String(TOP_LEVEL_ITEM_CEILING),
};

function substituteSkillPlaceholders(instructions: string): string {
	return Object.entries(SKILL_PLACEHOLDER_TEXT).reduce(
		(content, [placeholder, text]) => content.replaceAll(`{{${placeholder}}}`, text),
		instructions,
	);
}

/** Persisted threads can still name skills by these retired ids. */
export const LEGACY_SKILL_IDS: Readonly<Record<string, string>> = {
	'suggest-automations': 'automation-suggester',
	'debugging-executions': 'execution-debugger',
	'progressive-building': 'incremental-builder',
	'instance-awareness': 'instance-explorer',
	'intent-recognition': 'intent-classifier',
	'planned-task-runtime': 'planned-task-runner',
	planning: 'task-planner',
};

/** Bundled Assistant skills, including the fragments that prompt profiles append. */
export function loadInstanceAiSkills(): RuntimeSkillSource {
	cachedSkills ??= {
		...loadRuntimeSkillSourceFromDirectory(INSTANCE_AI_SKILLS_DIR, {
			transformInstructions: substituteSkillPlaceholders,
		}),
		legacySkillIds: LEGACY_SKILL_IDS,
	};
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
