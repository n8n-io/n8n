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
	if (result.finishReason === 'max-iterations') return 'step-exhausted';
	return 'completed';
}
