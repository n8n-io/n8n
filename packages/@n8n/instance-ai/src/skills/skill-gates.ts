// Per-user feature-flag gates for runtime skills. Apply the returned ids via
// `filterRuntimeSkillSource` (@n8n/agents) on the cached catalog — it returns a
// filtered copy, so the process-level catalog cache is preserved.

/** Skill folder id gated by the `088_config_evaluations` flag. */
export const CONFIG_EVALS_SKILL_ID = 'config-evals';

/** Skill folder id gated by the `105_instance_ai_one_off_tasks` flag. */
export const ONE_OFF_TASK_SKILL_ID = 'one-off-task';

/** Resolved feature flags that gate one or more runtime skills. */
export interface InstanceAiSkillFlags {
	configEvalsEnabled: boolean;
	oneOffTasksEnabled: boolean;
}

/** Skill ids to hide from a user's catalog given their resolved flags. */
export function disabledInstanceAiSkillIds(flags: InstanceAiSkillFlags): string[] {
	const disabled: string[] = [];
	if (!flags.configEvalsEnabled) disabled.push(CONFIG_EVALS_SKILL_ID);
	if (!flags.oneOffTasksEnabled) disabled.push(ONE_OFF_TASK_SKILL_ID);
	return disabled;
}
