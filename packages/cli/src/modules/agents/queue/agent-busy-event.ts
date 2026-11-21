import { AGENT_CHAT_ERROR_CODES, type AgentSseEvent } from '@n8n/api-types';

import type { AgentTurnRejectReason } from './agent-queue-metrics';

/** The chat event of a turn that n8n rejected because it has no room now. */
export const busyEvent = (
	reason: AgentTurnRejectReason,
	retryAfterSeconds: number,
): AgentSseEvent => {
	if (reason === 'main-memory-high') {
		return {
			type: 'error',
			message: 'The server is low on memory right now. Try again in a moment.',
			errorCode: AGENT_CHAT_ERROR_CODES.lowMemory,
			retryAfterSeconds,
		};
	}
	return {
		type: 'error',
		message: 'n8n is busy right now. Try again in a moment.',
		errorCode:
			reason === 'queue-full' || reason === 'agent-queue-full'
				? AGENT_CHAT_ERROR_CODES.queueFull
				: AGENT_CHAT_ERROR_CODES.mainBusy,
		retryAfterSeconds,
	};
};
