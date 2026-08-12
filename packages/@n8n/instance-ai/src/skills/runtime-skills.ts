import { loadRuntimeSkillSourceFromDirectory, type RuntimeSkillSource } from '@n8n/agents';
import { resolve } from 'node:path';

import { isOneOffTaskEnabled, ONE_OFF_TASK_SKILL_ID } from '@/one-off-task/is-one-off-task-enabled';
import { isAgentFeatureEnabled } from '@/utils/agent-feature-enabled';

export const INSTANCE_AI_SKILLS_DIR = resolve(__dirname, '..', '..', 'skills');
const AGENTS_MODULE_RUNTIME_SKILLS = new Set(['agent-builder', 'intent-recognition']);

let cachedRuntimeSkillSource: RuntimeSkillSource | undefined;

export function loadInstanceAiRuntimeSkillSource(): RuntimeSkillSource {
	cachedRuntimeSkillSource ??= loadRuntimeSkillSourceFromDirectory(INSTANCE_AI_SKILLS_DIR, {
		exclude: [
			...(isAgentFeatureEnabled() ? [] : AGENTS_MODULE_RUNTIME_SKILLS),
			...(isOneOffTaskEnabled() ? [] : [ONE_OFF_TASK_SKILL_ID]),
		],
	});
	return cachedRuntimeSkillSource;
}

export function hasRuntimeSkills(
	source: RuntimeSkillSource | undefined,
): source is RuntimeSkillSource {
	return (source?.registry.skills.length ?? 0) > 0;
}
