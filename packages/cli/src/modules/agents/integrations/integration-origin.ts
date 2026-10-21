import {
	AgentMessageIntegrationOriginSchema,
	type AgentMessageIntegrationOrigin,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import type { Thread } from 'chat';
import type { Logger } from 'n8n-workflow';

import type { AgentChatIntegration } from './agent-chat-integration';
import type { DecodedThread, OriginInput } from './integration-origin-support';

/**
 * Builds the typed platform context for an inbound message from trusted adapter
 * data. Returns `undefined` when the context is missing or invalid. It never throws.
 */
export async function buildIntegrationOrigin(
	integration: AgentChatIntegration,
	input: OriginInput,
	logger: Logger,
): Promise<AgentMessageIntegrationOrigin | undefined> {
	try {
		const decoded = decodeThread(input.thread);
		if (!decoded) return undefined;
		const draft = await integration.buildOriginDraft(input, decoded);
		if (!draft) return undefined;
		const parsed = AgentMessageIntegrationOriginSchema.safeParse(draft);
		if (parsed.success) return parsed.data;
		logger.debug('[AgentChatBridge] Dropped invalid integration origin', { type: draft.type });
	} catch (error) {
		logger.debug('[AgentChatBridge] Failed to build integration origin', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
	return undefined;
}

function decodeThread(thread: Thread<unknown, unknown>): DecodedThread | undefined {
	const decoded: unknown = thread.adapter.decodeThreadId(thread.id);
	return isRecord(decoded) ? decoded : undefined;
}
