export const AGENT_SERVICE_TIERS = ['default', 'flex', 'priority'] as const;

export type AgentServiceTier = (typeof AGENT_SERVICE_TIERS)[number];
