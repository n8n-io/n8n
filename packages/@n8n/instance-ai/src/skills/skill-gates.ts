// Per-user feature-flag gates for runtime skills. Apply the returned ids via
// `filterRuntimeSkillSource` (@n8n/agents) on the cached catalog — it returns a
// filtered copy, so the process-level catalog cache is preserved.

/** Skill folder id gated by the `088_config_evaluations` flag. */
export const CONFIG_EVALS_SKILL_ID = 'config-evals';

/** Skill folder id gated by the thread's progressive build mode. */
export const PROGRESSIVE_BUILDING_SKILL_ID = 'progressive-building';

/** Skill folder id hidden while progressive building is active: planned tasks
 *  batch every artifact into one approved graph, bypassing the execution gate. */
export const PLANNING_SKILL_ID = 'planning';

/** Resolved feature flags that gate one or more runtime skills. */
export interface InstanceAiSkillFlags {
	configEvalsEnabled: boolean;
	progressiveBuildingEnabled: boolean;
}

/** Skill ids to hide from a user's catalog given their resolved flags. */
export function disabledInstanceAiSkillIds(flags: InstanceAiSkillFlags): string[] {
	const disabled: string[] = [];
	if (!flags.configEvalsEnabled) disabled.push(CONFIG_EVALS_SKILL_ID);
	if (!flags.progressiveBuildingEnabled) disabled.push(PROGRESSIVE_BUILDING_SKILL_ID);
	else disabled.push(PLANNING_SKILL_ID);
	return disabled;
}
