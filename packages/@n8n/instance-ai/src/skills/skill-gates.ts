// Per-user feature-flag gates for runtime skills. Apply the returned ids via
// `filterRuntimeSkillSource` (@n8n/agents) on the cached catalog — it returns a
// filtered copy, so the process-level catalog cache is preserved.

/** Skill folder id gated by the `088_config_evaluations` flag. */
export const CONFIG_EVALS_SKILL_ID = 'config-evals';

/** Injected into treatment agents by the host, so it needs no load_skill entry. */
export const PROGRESSIVE_BUILDING_SKILL_ID = 'progressive-building';

/** Skill folder id hidden while progressive building is active: planned tasks
 *  batch every artifact into one approved graph, bypassing the execution gate. */
export const PLANNING_SKILL_ID = 'planning';

/**
 * Skill folder id gated by the instance-context reader. It is entirely about a block and a tool
 * that only exist when the reader is on, so listing it otherwise would advertise both.
 */
export const INSTANCE_AWARENESS_SKILL_ID = 'instance-awareness';

/** Resolved feature flags that gate one or more runtime skills. */
export interface InstanceAiSkillFlags {
	configEvalsEnabled: boolean;
	progressiveBuildingEnabled: boolean;
	instanceContextEnabled: boolean;
}

/** Skill ids to hide from a user's catalog given their resolved flags. */
export function disabledInstanceAiSkillIds(flags: InstanceAiSkillFlags): string[] {
	const disabled: string[] = [PROGRESSIVE_BUILDING_SKILL_ID];
	if (!flags.configEvalsEnabled) disabled.push(CONFIG_EVALS_SKILL_ID);
	if (flags.progressiveBuildingEnabled) disabled.push(PLANNING_SKILL_ID);
	if (!flags.instanceContextEnabled) disabled.push(INSTANCE_AWARENESS_SKILL_ID);
	return disabled;
}
