import { isAgentFeatureEnabled } from '@/utils/agent-feature-enabled';
import { loadRuntimeSkillSourceFromDirectory, type RuntimeSkillSource } from '@n8n/agents';
import { resolve } from 'node:path';

export const INSTANCE_AI_SKILLS_DIR = resolve(__dirname, '..', '..', 'skills');
const AGENTS_MODULE_RUNTIME_SKILLS = new Set(['intent-recognition']);

let cachedRuntimeSkillSource: RuntimeSkillSource | undefined;

export function loadInstanceAiRuntimeSkillSource(): RuntimeSkillSource {
	cachedRuntimeSkillSource ??= loadRuntimeSkillSourceFromDirectory(INSTANCE_AI_SKILLS_DIR, {
		exclude: runtimeSkillExclusions(),
	});
	return cachedRuntimeSkillSource;
}

export function hasRuntimeSkills(
	source: RuntimeSkillSource | undefined,
): source is RuntimeSkillSource {
	return (source?.registry.skills.length ?? 0) > 0;
}

function runtimeSkillExclusions(): string[] {
	if (isAgentFeatureEnabled()) return [];
	return [...AGENTS_MODULE_RUNTIME_SKILLS];
}
