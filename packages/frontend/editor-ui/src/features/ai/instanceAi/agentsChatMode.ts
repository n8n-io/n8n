import type { LocationQuery } from 'vue-router';

/** Fixed id of the n8n Assistant on the Agents runtime. */
export const ASSISTANT_AGENT_ID = 'n8n-assistant';

/**
 * PoC switch: `?chat=legacy` keeps the old Assistant conversation (own SSE
 * protocol). Without it, the thread renders with the Agents chat core.
 */
export function isLegacyAssistantChat(query: LocationQuery): boolean {
	return query.chat === 'legacy';
}

export const LEGACY_ASSISTANT_CHAT_QUERY = { chat: 'legacy' } as const;
