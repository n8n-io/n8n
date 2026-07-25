// PostHog rollout flag id gating the agent-evals feature surface. Every new
// agent-eval endpoint + frontend entry point consults this; the flag-off
// cohort sees no agent-eval surface at all. Single source of truth shared
// between FE and BE so the two cannot drift. Follows the `NNN_<feature>`
// numeric-prefix convention used by every other n8n PostHog flag (next
// available after `100_n8n_credits_credential_selection`).
export const AGENT_EVALS_FLAG = '101_agent_evals';
