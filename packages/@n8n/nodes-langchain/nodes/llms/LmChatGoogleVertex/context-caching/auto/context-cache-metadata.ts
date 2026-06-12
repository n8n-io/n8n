/**
 * JSON document stored in Redis per config hash for Vertex auto context cache.
 */

export type ExistingContextCache = {
	kind: 'existing';
	cacheName: string;
	/** Vertex cachedContents expiry (RFC3339). */
	expireTime: string;
	model: string;
	location: string;
};

/** Context cannot be cached (e.g. Google minimum token count). */
export type NotCacheable = {
	kind: 'not_cacheable';
	reason: 'CACHE_TOO_SHORT';
	/** Do not retry cachedContents.create until this instant (ISO 8601). */
	retryNotBeforeIso: string;
};

/** Another worker is creating cachedContents; callers must use uncached path. */
export type PendingCache = {
	kind: 'pending';
	startedAtIso?: string;
};

export type ContextCacheMetadata = ExistingContextCache | NotCacheable | PendingCache;

export function isExistingContextCache(m: ContextCacheMetadata): m is ExistingContextCache {
	return m.kind === 'existing';
}

export function isNotCacheable(m: ContextCacheMetadata): m is NotCacheable {
	return m.kind === 'not_cacheable';
}

export function isPendingCache(m: ContextCacheMetadata): m is PendingCache {
	return m.kind === 'pending';
}

export function serializeContextCacheMetadata(meta: ContextCacheMetadata): string {
	return JSON.stringify(meta);
}

/**
 * Parses and validates a JSON string. Returns `null` if invalid or unknown shape.
 */
export function parseContextCacheMetadata(raw: string): ContextCacheMetadata | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw) as unknown;
	} catch {
		return null;
	}

	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		return null;
	}

	const o = parsed as Record<string, unknown>;
	const kind = o.kind;

	if (kind === 'pending') {
		if (o.startedAtIso !== undefined && typeof o.startedAtIso !== 'string') {
			return null;
		}
		const out: PendingCache = { kind: 'pending' };
		if (typeof o.startedAtIso === 'string') {
			out.startedAtIso = o.startedAtIso;
		}
		return out;
	}

	if (kind === 'not_cacheable') {
		if (o.reason !== 'CACHE_TOO_SHORT') return null;
		if (typeof o.retryNotBeforeIso !== 'string') return null;
		return {
			kind: 'not_cacheable',
			reason: 'CACHE_TOO_SHORT',
			retryNotBeforeIso: o.retryNotBeforeIso,
		};
	}

	if (kind === 'existing') {
		if (
			typeof o.cacheName !== 'string' ||
			typeof o.expireTime !== 'string' ||
			typeof o.model !== 'string' ||
			typeof o.location !== 'string'
		) {
			return null;
		}
		return {
			kind: 'existing',
			cacheName: o.cacheName,
			expireTime: o.expireTime,
			model: o.model,
			location: o.location,
		};
	}

	return null;
}
