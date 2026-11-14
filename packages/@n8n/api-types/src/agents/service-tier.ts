export const AGENT_SERVICE_TIERS = ['default', 'flex', 'priority'] as const;

export type AgentServiceTier = (typeof AGENT_SERVICE_TIERS)[number];

/**
 * Default and upper bound of `config.flexMaxRetries`. The default matches
 * `DEFAULT_FLEX_UNAVAILABLE_RETRIES` in `@n8n/agents`.
 */
export const AGENT_FLEX_MAX_RETRIES_DEFAULT = 10;
export const AGENT_FLEX_MAX_RETRIES_MAX = 50;
