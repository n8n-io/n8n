import { v5 as uuidv5 } from 'uuid';

import type { AgentQueuedMessage } from '../types/agent-queued-message';

const MESSAGE_NAMESPACE = uuidv5('n8n-agent-message-acceptance-v1', uuidv5.URL);

/** Keep this contract stable across mains and releases so delivery retries keep the same ID. */
export function queuedMessageId(
	agentId: string,
	threadId: string,
	payload: AgentQueuedMessage,
): string | undefined {
	if (payload.kind !== 'integration') {
		if (!payload.messageId) return undefined;
		return uuidv5(
			JSON.stringify([
				payload.kind,
				agentId,
				payload.userId,
				threadId,
				payload.messageId.toLowerCase(),
			]),
			MESSAGE_NAMESPACE,
		);
	}
	const { platform, integrationConnectionId, messageId } = payload.messageContext;
	if (!messageId) return undefined;
	return uuidv5(
		JSON.stringify([
			'integration',
			agentId,
			platform,
			integrationConnectionId,
			payload.platformThreadId,
			messageId,
		]),
		MESSAGE_NAMESPACE,
	);
}
