// ---------------------------------------------------------------------------
// Transient-error classification for scenario execution
//
// Both scenario-execution paths — the direct harness loop (`runTestCase`) and
// the LangSmith-traced loop (`cli/index.ts`) — call the running n8n instance
// over HTTP. Network-level failures there (a dropped socket, a DNS blip, the
// long `execute-with-llm-mock` request stalling) are infrastructure problems,
// not builder or mock defects. Sharing the detection + message extraction keeps
// the two paths from drifting apart and ensures such failures are retried and
// tagged `framework_issue` consistently, so they stay out of the builder
// baseline instead of counting as silent failures.
// ---------------------------------------------------------------------------

/** Max attempts (initial try + retries) for a scenario execution hitting transient errors. */
export const MAX_EXEC_ATTEMPTS = 5;

/**
 * Flatten an error to a message, folding in the underlying `cause` when it adds
 * detail. undici surfaces network failures as a bare `TypeError: fetch failed`
 * whose `cause` (e.g. `HeadersTimeoutError`, `ECONNRESET`) carries the real
 * reason — without unwrapping it every such failure looks identical.
 */
export function extractErrorMessage(error: unknown): string {
	const baseError = error instanceof Error ? error : new Error(String(error));
	const cause = baseError.cause;
	const causeText =
		cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : undefined;
	return causeText && causeText !== baseError.message
		? `${baseError.message}: ${causeText}`
		: baseError.message;
}

/** Network-level failures worth retrying — none indicate a builder or mock defect. */
export function isTransientNetworkError(message: string): boolean {
	return /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|socket hang up/i.test(message);
}

/**
 * Max attempts for a scenario execution that hit the client-side timeout.
 * Timeouts are retried at most once — unlike cheap network blips, each retry
 * can cost the full scenario budget, but a single retry recovers the common
 * case (provider contention slowing LLM mock calls on a busy lane) without
 * recording a framework_issue for an already-built workflow.
 */
export const MAX_TIMEOUT_ATTEMPTS = 2;

/**
 * True when a scenario execution died on the client-side abort timeout
 * (`AbortSignal.timeout` in the n8n REST client surfaces as TimeoutError:
 * "The operation was aborted due to timeout").
 */
export function isExecutionTimeout(message: string): boolean {
	return /operation was aborted|TimeoutError/i.test(message);
}

/** Retry decision for one failed scenario-execution attempt. */
export function shouldRetryScenarioExecution(message: string, attempt: number): boolean {
	if (isTransientNetworkError(message)) return attempt < MAX_EXEC_ATTEMPTS;
	if (isExecutionTimeout(message)) return attempt < MAX_TIMEOUT_ATTEMPTS;
	return false;
}
