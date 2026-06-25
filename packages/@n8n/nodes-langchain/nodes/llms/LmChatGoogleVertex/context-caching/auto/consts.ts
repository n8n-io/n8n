/** Shorter than Vertex cache expiry so Redis metadata is gone before the remote cache may be unusable. */
export const VERTEX_CONTEXT_CACHE_REDIS_METADATA_SAFETY_BUFFER_SEC = 10;

/** Redis TTL for `pending` metadata while `cachedContents.create` runs (cross-worker lock + stale cleanup). */
export const CONTEXT_CACHE_PENDING_METADATA_TTL_SECONDS = 30;

/** Skip automatic cache recreation for this hash until TTL elapses after CACHE_TOO_SHORT (seconds). */
export const CACHE_TOO_SHORT_ERROR_TTL = 3600;

/** Max chars for system-instruction preview in cache-create debug logs. */
export const CACHE_CREATE_LOG_TEXT_MAX = 800;

/** Max chars when logging API error response bodies. */
export const GOOGLE_CONTEXT_CACHE_RESPONSE_PREVIEW_MAX_CHARS = 4000;
