export const AGENT_REASONING_LEVELS = ['low', 'medium', 'high'] as const;

export type AgentReasoningLevel = (typeof AGENT_REASONING_LEVELS)[number];
