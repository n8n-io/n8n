import { VERTEX_CONTEXT_CACHE_REDIS_METADATA_SAFETY_BUFFER_SEC } from './consts';
import { parseExpireMs } from '../utils';

/**
 * Seconds until this Redis metadata key should expire: remaining Vertex cache life from "now",
 * minus the create-request wall time (rounded up), minus {@link VERTEX_CONTEXT_CACHE_REDIS_METADATA_SAFETY_BUFFER_SEC}.
 */
export function computeRedisMetadataTtlSecondsForSuccess(input: {
	createDurationMs: number;
	expireTimeIso: string;
}): number {
	const expireMs = parseExpireMs(input.expireTimeIso);
	const now = Date.now();
	const remainingSec = Math.floor((expireMs - now) / 1000);
	const createSec = Math.ceil(Math.max(0, input.createDurationMs) / 1000);
	const raw = remainingSec - createSec - VERTEX_CONTEXT_CACHE_REDIS_METADATA_SAFETY_BUFFER_SEC;
	return Math.max(1, raw);
}
