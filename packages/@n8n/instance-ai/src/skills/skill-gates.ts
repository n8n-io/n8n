/**
 * Per-user feature-flag gates for Instance AI runtime skills.
 *
 * The runtime-skill catalog is loaded once and cached process-wide
 * (`loadInstanceAiRuntimeSkillSource`), with only env-level exclusions applied
 * at load time. Feature flags, however, are resolved per user and per request,
 * so a flag-gated skill cannot be excluded at load without breaking that cache.
 *
 * Instead, resolve the user's flags per request, compute the skill ids to hide
 * via {@link disabledInstanceAiSkillIds}, and apply them with
 * `filterRuntimeSkillSource` from `@n8n/agents` — which returns a filtered copy
 * (recomputing the skills hash) without mutating the shared cached catalog. The
 * filtered source covers every LLM-facing surface (orchestrator + sub-agent
 * catalogs and sandbox materialization all derive from this one object).
 */

/**
 * Directory id of the config-based evals skill, gated by the
 * `088_instance_ai_config_evals` PostHog flag. Must match the skill's folder
 * name under `skills/` once that skill is added (TRUST-253).
 */
export const CONFIG_EVALS_SKILL_ID = 'config-evals';

/** Resolved feature flags that gate one or more runtime skills. */
export interface InstanceAiSkillFlags {
	/** `088_instance_ai_config_evals` — the config-based evals capability. */
	configEvalsEnabled: boolean;
}

/**
 * Runtime-skill ids to exclude from a user's catalog given their resolved
 * feature flags. Extend as more skills go behind flags.
 */
export function disabledInstanceAiSkillIds(flags: InstanceAiSkillFlags): string[] {
	const disabled: string[] = [];
	if (!flags.configEvalsEnabled) disabled.push(CONFIG_EVALS_SKILL_ID);
	return disabled;
}
