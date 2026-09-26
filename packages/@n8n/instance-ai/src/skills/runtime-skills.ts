import {
	createRuntimeSkillSource,
	loadRuntimeSkillSourceFromDirectory,
	type RuntimeSkill,
	type RuntimeSkillSource,
} from '@n8n/agents';
import type { InstanceAiBuildMode } from '@n8n/api-types';
import { GROUPING_GUIDANCE } from '@n8n/workflow-sdk/prompts/sdk-reference';
import { TOP_LEVEL_ITEM_CEILING } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

import { isAgentFeatureEnabled } from '@/utils/agent-feature-enabled';

import {
	PROMPT_FRAGMENT_SKILLS,
	resolvePromptProfile,
	type PromptProfile,
} from '../prompts/prompt-profiles';
import { composeSkillVariants } from '../prompts/skill-variants';

export const INSTANCE_AI_SKILLS_DIR = resolve(__dirname, '..', '..', 'skills');
const AGENTS_MODULE_RUNTIME_SKILLS = new Set(['agent-builder']);

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

/**
 * Add skills that the host supplies at runtime (e.g. the Agent Builder guidance
 * from the agents module) to a bundled source. A host skill replaces a bundled
 * skill with the same id. Host skills have no linked files.
 */
export function withHostRuntimeSkills(
	source: RuntimeSkillSource,
	skills: RuntimeSkill[],
): RuntimeSkillSource {
	if (skills.length === 0) return source;
	// The registry drops a skill whose parent is not in the same set, and a host
	// skill's parent (e.g. `agent-builder`) is bundled. Register the host skills
	// without parents, then restore each parent that the merged catalog has.
	const parentsById = new Map(skills.map((skill) => [skill.id, skill.parents]));
	const host = createRuntimeSkillSource(skills.map(({ parents: _parents, ...skill }) => skill));
	const hostIds = new Set(host.registry.skills.map((skill) => skill.id));
	const catalogIds = new Set([...source.registry.skills.map((skill) => skill.id), ...hostIds]);
	const hostEntries = host.registry.skills.map((entry) => {
		const parents = parentsById.get(entry.id)?.filter((id) => catalogIds.has(id));
		return parents?.length ? { ...entry, parents } : entry;
	});
	const { loadFile } = source;

	return {
		...source,
		registry: {
			...source.registry,
			skillsHash: createHash('sha256')
				.update(`${source.registry.skillsHash}:${host.registry.skillsHash}`)
				.digest('hex')
				.slice(0, 12),
			skills: [...source.registry.skills.filter((skill) => !hostIds.has(skill.id)), ...hostEntries],
		},
		loadSkill: async (skillId, anchor) =>
			hostIds.has(skillId)
				? await host.loadSkill(skillId, anchor)
				: await source.loadSkill(skillId, anchor),
		...(loadFile
			? {
					loadFile: async (skillId: string, filePath: string) =>
						hostIds.has(skillId) ? null : await loadFile(skillId, filePath),
				}
			: {}),
	};
}

export function hasRuntimeSkills(
	source: RuntimeSkillSource | undefined,
): source is RuntimeSkillSource {
	return (source?.registry.skills.length ?? 0) > 0;
}
