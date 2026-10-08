import type { InjectionKey } from 'vue';

/** Builds a chat attachment's download/thumbnail URL for the panel's channel. */
export type AgentAttachmentUrlBuilder = (attachmentId: string) => string;

/** Provided by `AgentChatPanel` so attachments don't need `projectId`/`agentId`/`channel` props. */
export const AGENT_ATTACHMENT_URL_KEY: InjectionKey<AgentAttachmentUrlBuilder> =
	Symbol('agentAttachmentUrl');
