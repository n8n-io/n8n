/** Length of the "recent" window that the activity counts cover. */
export const ACTIVITY_WINDOW_SECONDS = 60;

/** A run with no end event after this time is dropped, for example after a crash. */
export const MAX_RUNNING_MS = 6 * 60 * 60 * 1000;

/**
 * A paused run with no resume after this time is dropped. Waits can be long, and another main
 * instance can resume the run without this one knowing.
 */
export const MAX_WAITING_MS = 7 * 24 * 60 * 60 * 1000;

export const PRUNE_INTERVAL_MS = 60 * 1000;

/** How long the readable workflow ids of a user stay cached. Polls come every few seconds. */
export const READABLE_WORKFLOWS_CACHE_MS = 15 * 1000;
