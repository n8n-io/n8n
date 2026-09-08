// Per-user feature-flag gates for runtime skills. Apply the returned ids via
// `filterRuntimeSkillSource` (@n8n/agents) on the cached catalog — it returns a
// filtered copy, so the process-level catalog cache is preserved.

/** Skill folder id gated by the `088_config_evaluations` flag. */
export const CONFIG_EVALS_SKILL_ID = 'config-evals';

/** Skill folder id gated by Browser Use being enabled instance-wide. */
export const BROWSER_RECORDING_PROPOSAL_SKILL_ID = 'browser-recording-proposal';

/** Resolved feature flags that gate one or more runtime skills. */
export interface InstanceAiSkillFlags {
	configEvalsEnabled: boolean;
	browserRecordingProposalEnabled: boolean;
}

/** Skill ids to hide from a user's catalog given their resolved flags. */
export function disabledInstanceAiSkillIds(flags: InstanceAiSkillFlags): string[] {
	const disabled: string[] = [];
	if (!flags.configEvalsEnabled) disabled.push(CONFIG_EVALS_SKILL_ID);
	if (!flags.browserRecordingProposalEnabled) disabled.push(BROWSER_RECORDING_PROPOSAL_SKILL_ID);
	return disabled;
}
