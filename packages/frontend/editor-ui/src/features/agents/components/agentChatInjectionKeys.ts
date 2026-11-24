import type { ComputedRef, InjectionKey } from 'vue';

/** Builds a chat attachment's download/thumbnail URL for the panel's channel. */
export type AgentAttachmentUrlBuilder = (attachmentId: string) => string;

/** Provided by `AgentChatPanel` so attachments don't need `projectId`/`agentId`/`channel` props. */
export const AGENT_ATTACHMENT_URL_KEY: InjectionKey<AgentAttachmentUrlBuilder> =
	Symbol('agentAttachmentUrl');

/**
 * Sub-agent id → name map from the n8n Chat agent route. Chat-only members lack
 * `agent:list`, so `useSubAgentNames` uses this instead of the project agent list.
 */
export const AGENT_SUB_AGENT_NAMES_KEY: InjectionKey<ComputedRef<Map<string, string>>> =
	Symbol('agentSubAgentNames');

/** Names a tool step, or gives `undefined` to keep the label of the chat. */
export type AgentToolStepLabeler = (toolName: string, input: unknown) => string | undefined;

/** Provided by a host, such as the Assistant, that has more specific tool labels. */
export const AGENT_TOOL_STEP_LABEL_KEY: InjectionKey<AgentToolStepLabeler> =
	Symbol('agentToolStepLabel');

/**
 * Whether the session timeline shows the cost of a turn in dollars. The Assistant
 * hides it when the instance pays with Assistant credits. Without it, the cost shows.
 */
export const SESSION_TIMELINE_SHOW_COST_KEY: InjectionKey<() => boolean> =
	Symbol('sessionTimelineShowCost');
