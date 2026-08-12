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
