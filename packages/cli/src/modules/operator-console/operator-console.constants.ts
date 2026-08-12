import type { LogScope } from '@n8n/config';

/**
 * Redis Stream carrying log batches from every host in queue mode. Deliberately
 * separate from `n8n.commands` — a debug-level firehose must never share a
 * channel with control messages like `stop-execution`.
 */
export const LOG_STREAM_KEY = 'n8n:logs';

/**
 * Log scope for the console's own logging. Excluded from capture: without this,
 * broadcasting a line logs a line, which broadcasts a line.
 */
export const OPERATOR_CONSOLE_SCOPE: LogScope = 'operator-console';

/** Cursor returned when a source has no records at all. */
export const EMPTY_CURSOR = '';

/**
 * Byte budget for one host's answer to a distributed search.
 *
 * Well under `MAX_PUBSUB_PAYLOAD_BYTES` (5 MiB) on purpose: several hosts answer
 * the same request at once, and the channel also carries control messages like
 * `stop-execution` that must not queue behind a log dump.
 */
export const SEARCH_RESPONSE_MAX_BYTES = 512 * 1024;

/**
 * How long a distributed search waits for the slowest host. A human is watching
 * a spinner, so a late host is reported as missing rather than waited out.
 */
export const DEFAULT_SEARCH_TIMEOUT_MS = 3000;
