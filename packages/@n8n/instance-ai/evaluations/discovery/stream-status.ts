import type { FinishReason } from '@n8n/agents';

import type { DiscoveryStreamStatus } from './types';
import type { ExecuteResumableStreamResult } from '../../src/runtime/resumable-stream-executor';

export function resolveStreamStatus(
	result: ExecuteResumableStreamResult | 'timed-out',
	aborted: boolean,
): DiscoveryStreamStatus {
	if (result === 'timed-out' || aborted) return 'timed-out';
	if (result.status === 'errored') return 'errored';
	if (result.status === 'suspended') return 'suspended';
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
		case 'tool-calls':
		case 'length':
		case 'content-filter':
		case 'error':
		case 'other':
			return 'errored';
		default: {
			const unhandled: never = finishReason;
			throw new Error(`Unhandled finish reason: ${String(unhandled)}`);
		}
	}
}
