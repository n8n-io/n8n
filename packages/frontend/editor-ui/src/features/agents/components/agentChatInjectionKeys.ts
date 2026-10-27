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
