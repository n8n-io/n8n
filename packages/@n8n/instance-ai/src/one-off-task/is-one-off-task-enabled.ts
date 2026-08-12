/**
 * Feature gate for one-off task sandboxes. Follows the module-enablement
 * pattern of `utils/agent-feature-enabled.ts`: an env switch the host checks
 * before registering the `run-one-off-task` tool and the `one-off-task`
 * skill. A PostHog per-user flag (like `skill-gates.ts`) is the production
 * follow-up once the feature leaves the opt-in stage.
 */
const ONE_OFF_TASK_ENV_FLAG = 'N8N_INSTANCE_AI_ONE_OFF_TASKS';

export function isOneOffTaskEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
	return env[ONE_OFF_TASK_ENV_FLAG] === 'true';
}

/** Skill folder id, for the runtime-skill exclude list when the flag is off. */
export const ONE_OFF_TASK_SKILL_ID = 'one-off-task';
