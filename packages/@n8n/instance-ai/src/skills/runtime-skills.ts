import { loadRuntimeSkillSourceFromDirectory, type RuntimeSkillSource } from '@n8n/agents';
import type { InstanceAiBuildMode } from '@n8n/api-types';
import { UnexpectedError } from 'n8n-workflow';
import { resolve } from 'node:path';

import { isAgentFeatureEnabled } from '@/utils/agent-feature-enabled';

export const INSTANCE_AI_SKILLS_DIR = resolve(__dirname, '..', '..', 'skills');
const AGENTS_MODULE_RUNTIME_SKILLS = new Set(['agent-builder', 'intent-recognition']);

let cachedRuntimeSkillSource: RuntimeSkillSource | undefined;

export function loadInstanceAiRuntimeSkillSource(): RuntimeSkillSource {
	cachedRuntimeSkillSource ??= loadRuntimeSkillSourceFromDirectory(INSTANCE_AI_SKILLS_DIR, {
		exclude: isAgentFeatureEnabled() ? [] : [...AGENTS_MODULE_RUNTIME_SKILLS],
	});
	return cachedRuntimeSkillSource;
}

export async function getProgressiveBuildingInstructions(
	mode: InstanceAiBuildMode | undefined,
): Promise<string | undefined> {
	if (mode !== 'progressive') return undefined;
	const skill = await loadInstanceAiRuntimeSkillSource().loadSkill('progressive-building');
	if (!skill) throw new UnexpectedError('Progressive building instructions are missing');
	return skill.instructions;
}

export function hasRuntimeSkills(
	source: RuntimeSkillSource | undefined,
): source is RuntimeSkillSource {
	return (source?.registry.skills.length ?? 0) > 0;
}
