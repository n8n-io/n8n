import { loadRuntimeSkillSourceFromDirectory, type RuntimeSkillSource } from '@n8n/agents';
import { resolve } from 'node:path';

export const INSTANCE_AI_SKILLS_DIR = resolve(__dirname, '..', '..', 'skills');
const AGENTS_MODULE_NAME = 'agents';
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
	const enabledModules = new Set(
		(process.env.N8N_ENABLED_MODULES ?? '')
			.split(',')
			.map((moduleName) => moduleName.trim())
			.filter((moduleName) => moduleName.length > 0),
	);

	if (enabledModules.has(AGENTS_MODULE_NAME)) return [];
	return [...AGENTS_MODULE_RUNTIME_SKILLS];
}
