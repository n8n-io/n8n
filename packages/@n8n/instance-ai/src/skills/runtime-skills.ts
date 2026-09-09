import {
	createRuntimeSkillSource,
	filterRuntimeSkillSource,
	loadRuntimeSkillSourceFromDirectory,
	type RuntimeSkillSource,
} from '@n8n/agents';
import type { InstanceAiBuildMode } from '@n8n/api-types';
import { UnexpectedError } from 'n8n-workflow';
import { resolve } from 'node:path';

import { isAgentFeatureEnabled } from '@/utils/agent-feature-enabled';

export const INSTANCE_AI_SKILLS_DIR = resolve(__dirname, '..', '..', 'skills');
const AGENTS_MODULE_RUNTIME_SKILLS = new Set(['agent-builder', 'intent-recognition']);

let cachedRuntimeSkillSource: RuntimeSkillSource | undefined;
let cachedProgressiveSkillSource: Promise<RuntimeSkillSource> | undefined;

export function loadInstanceAiRuntimeSkillSource(): RuntimeSkillSource {
	cachedRuntimeSkillSource ??= loadRuntimeSkillSourceFromDirectory(INSTANCE_AI_SKILLS_DIR, {
		exclude: isAgentFeatureEnabled() ? [] : [...AGENTS_MODULE_RUNTIME_SKILLS],
	});
	return cachedRuntimeSkillSource;
}

export async function loadInstanceAiRuntimeSkillSourceForBuildMode(
	mode: InstanceAiBuildMode | undefined,
): Promise<RuntimeSkillSource> {
	const source = loadInstanceAiRuntimeSkillSource();
	if (mode !== 'progressive') return source;
	cachedProgressiveSkillSource ??= createProgressiveSkillSource(source);
	return await cachedProgressiveSkillSource;
}

async function createProgressiveSkillSource(
	source: RuntimeSkillSource,
): Promise<RuntimeSkillSource> {
	const policy = await source.loadSkill('progressive-building');
	if (!policy) throw new UnexpectedError('Progressive building instructions are missing');
	const skills = await Promise.all(
		source.registry.skills.map(async ({ id }) => {
			const skill = await source.loadSkill(id);
			if (!skill) throw new UnexpectedError(`Runtime skill "${id}" is missing`);
			if (id !== 'workflow-builder' && id !== 'post-build-flow') return skill;
			return {
				...skill,
				description: id === 'workflow-builder' ? policy.description : skill.description,
				instructions: `${skill.instructions}\n\n${policy.instructions}`,
			};
		}),
	);
	// Recompute content hashes so workspace bundles contain the selected variants.
	return filterRuntimeSkillSource({ ...source, ...createRuntimeSkillSource(skills) }, ['planning']);
}

export function hasRuntimeSkills(
	source: RuntimeSkillSource | undefined,
): source is RuntimeSkillSource {
	return (source?.registry.skills.length ?? 0) > 0;
}
