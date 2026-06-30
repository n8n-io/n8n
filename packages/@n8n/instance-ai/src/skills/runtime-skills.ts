import { loadRuntimeSkillSourceFromDirectory, type RuntimeSkillSource } from '@n8n/agents';
import { resolve } from 'node:path';

import { isAgentFeatureEnabled } from '@/utils/agent-feature-enabled';

export const INSTANCE_AI_SKILLS_DIR = resolve(__dirname, '..', '..', 'skills');
const AGENTS_MODULE_RUNTIME_SKILLS = new Set(['intent-recognition']);

let cachedRuntimeSkillSource: RuntimeSkillSource | undefined;

export function loadInstanceAiRuntimeSkillSource(): RuntimeSkillSource {
	cachedRuntimeSkillSource ??= filterRuntimeSkillSource(
		loadRuntimeSkillSourceFromDirectory(INSTANCE_AI_SKILLS_DIR),
	);
	return cachedRuntimeSkillSource;
}

export function hasRuntimeSkills(
	source: RuntimeSkillSource | undefined,
): source is RuntimeSkillSource {
	return (source?.registry.skills.length ?? 0) > 0;
}

function filterRuntimeSkillSource(source: RuntimeSkillSource): RuntimeSkillSource {
	if (isAgentFeatureEnabled()) return source;
	const { loadFile } = source;

	return {
		...source,
		registry: {
			...source.registry,
			skills: source.registry.skills.filter((skill) => !AGENTS_MODULE_RUNTIME_SKILLS.has(skill.id)),
		},
		loadSkill: async (skillId) =>
			AGENTS_MODULE_RUNTIME_SKILLS.has(skillId) ? null : await source.loadSkill(skillId),
		loadFile: loadFile
			? async (skillId, filePath) =>
					AGENTS_MODULE_RUNTIME_SKILLS.has(skillId) ? null : await loadFile(skillId, filePath)
			: undefined,
	};
}
