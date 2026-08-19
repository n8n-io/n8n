/** Comment embedded in generated SSH keys (visible when added as a deploy key). */
export const GIT_KEY_COMMENT = 'n8n git connection';

// Timeouts that bound how long a stalled Git operation can hang. Transport-level
// limits (SSH, HTTP) fire first based on real network inactivity; the process
// stall timeout is a transport-agnostic backstop.

// Bound SSH: fail the initial connect after CONNECT_TIMEOUT, and drop an
// established-but-silent session after INTERVAL * COUNT_MAX seconds of unanswered
// keepalives.
export const SSH_CONNECT_TIMEOUT_SECONDS = 30;
export const SSH_SERVER_ALIVE_INTERVAL_SECONDS = 15;
export const SSH_SERVER_ALIVE_COUNT_MAX = 3;

// Abort an HTTP(S) transfer that drops below ~1 KB/s for this long, so a stalled
// server can't leave the request pending indefinitely.
export const HTTP_LOW_SPEED_LIMIT_BYTES = 1000;
export const HTTP_LOW_SPEED_TIME_SECONDS = 30;

// Transport-agnostic backstop: kill the git process if it emits no output for
// this long, so clone() always rejects and its cleanup path runs. Clone is run
// with --progress so a healthy transfer keeps feeding this timer.
export const GIT_COMMAND_STALL_TIMEOUT_MS = 60_000;
