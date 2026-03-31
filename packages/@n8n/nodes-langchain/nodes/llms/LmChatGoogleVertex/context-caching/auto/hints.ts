import type { NodeExecutionHint } from 'n8n-workflow';

import { CACHE_TOO_SHORT_ERROR_TTL } from './consts';

export function vertexContextCacheTooShortFirstHitHint(): NodeExecutionHint {
	return {
		location: 'outputPane',
		message:
			"Vertex context cache was not used: your system instruction and tool definitions are below Google's minimum token size for cached content. This execution continues without a content cache. Use a longer system message, richer tool schemas, or the Predefined cache strategy.",
		type: 'warning',
	};
}

export function vertexContextCacheTooShortFromStoreHint(): NodeExecutionHint {
	const minutes = Math.max(1, Math.round(CACHE_TOO_SHORT_ERROR_TTL / 60));
	return {
		location: 'outputPane',
		message: `Vertex context cache was not used for this configuration: it was too small to cache in a recent run. Automatic cache creation is paused for about ${minutes} minutes. This execution runs without a content cache. Use a longer system message or larger tool definitions, or use the Predefined cache strategy.`,
		type: 'warning',
	};
}

export function vertexContextCacheCreateFailedHint(errorMessage: string): NodeExecutionHint {
	return {
		location: 'outputPane',
		message: `Vertex context cache could not be created (${errorMessage}). This execution continues without using a content cache.`,
		type: 'warning',
	};
}

/** @param cacheResourceName Full Vertex `cachedContents` resource name from Google (not displayName). */
export function vertexContextCacheHitHint(cacheResourceName: string): NodeExecutionHint {
	return {
		location: 'outputPane',
		message: `Vertex context cache was used for this execution (reused cached content from a previous run). Cached content resource: ${cacheResourceName}`,
		type: 'info',
	};
}
