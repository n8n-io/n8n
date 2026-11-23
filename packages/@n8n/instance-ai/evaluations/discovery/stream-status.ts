import type { FinishReason } from '@n8n/agents';

import type { StreamTurnResult } from './stream-turn';
import type { DiscoveryStreamStatus } from './types';

export function resolveStreamStatus(
	result: StreamTurnResult | 'timed-out',
	aborted: boolean,
): DiscoveryStreamStatus {
	if (result === 'timed-out' || aborted) return 'timed-out';
	if (result.status === 'errored') return 'errored';
	if (result.status === 'suspended') return 'waiting-for-user';
	if (result.status === 'cancelled') return 'timed-out';
	if (result.finishReason === undefined) return 'errored';
	return statusForFinishReason(result.finishReason);
}

function statusForFinishReason(finishReason: FinishReason): DiscoveryStreamStatus {
	switch (finishReason) {
		case 'stop':
			return 'completed';
		case 'max-iterations':
			return 'step-exhausted';
		case 'paused':
			return 'suspended';
		case 'cancelled':
			return 'timed-out';
		case 'tool-calls':
		case 'length':
		case 'content-filter':
		case 'error':
		case 'guardrail':
		case 'other':
			return 'errored';
		default: {
			const unhandled: never = finishReason;
			throw new Error(`Unhandled finish reason: ${String(unhandled)}`);
		}
	}
}
