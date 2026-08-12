import type { OperatorLogRole } from '@n8n/api-types';

/** Instance types that produce log lines, in the order they appear in the picker. */
export const OPERATOR_LOG_ROLES: readonly OperatorLogRole[] = ['main', 'worker', 'webhook'];

/** Backend module name. The console is opt-in and hidden unless the module is active. */
export const OPERATOR_CONSOLE_MODULE_NAME = 'operator-console';

/** Router view name. Kept module-local so the shared `VIEWS` enum stays for shell routes. */
export const OPERATOR_CONSOLE_VIEW = 'OperatorConsoleView';

export const OPERATOR_CONSOLE_STORE = 'operatorConsole';

/**
 * Client-side buffer cap. The pane is a debugging window, not an archive — past
 * this the oldest entries are evicted and the eviction is shown, never hidden.
 */
export const OPERATOR_CONSOLE_MAX_ENTRIES = 10_000;

/** Lines held while paused before the oldest are discarded (and counted). */
export const OPERATOR_CONSOLE_PAUSE_BUFFER_MAX = 10_000;

/** Records requested for the initial scrollback fetch. */
export const OPERATOR_CONSOLE_HISTORY_LIMIT = 500;

/**
 * How often the tail lease is renewed. Must stay well below the server's
 * `N8N_OPERATOR_CONSOLE_LEASE_TTL_MS` (default 30s) so producers never go quiet
 * between renewals.
 */
export const OPERATOR_CONSOLE_LEASE_RENEW_MS = 10_000;

/** Distance from the bottom (px) still treated as "at the bottom" for follow-tail. */
export const OPERATOR_CONSOLE_FOLLOW_THRESHOLD_PX = 24;

/** Estimated row height for the virtual scroller, in px. */
export const OPERATOR_CONSOLE_MIN_ROW_HEIGHT_PX = 22;
