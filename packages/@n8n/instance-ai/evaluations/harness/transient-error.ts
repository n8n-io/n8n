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

/**
 * Marker prefix for the rootCause stamped on a scenario whose execution was
 * aborted by the per-iteration budget/timeout. The lang-tracer side keys its
 * `infra_incomplete` attribution off `failureCategory: "framework_issue"` plus
 * a timeout-flavoured rootCause — keep the wording stable across both repos.
 */
export const BUDGET_TIMEOUT_ROOT_CAUSE =
	'Scenario execution exceeded its per-iteration time budget and was aborted before a verdict';

/**
 * Classify an error thrown out of scenario execution into the report fields.
 *
 * Any error that escapes `executeScenario` (after its own retries) is an
 * infra/framework problem, never an agent verdict, so it is always
 * `framework_issue`. A budget/timeout abort additionally carries a
 * timeout-flavoured `rootCause` so partial-result consumers can route it to an
 * infra/incomplete bucket instead of counting it against product quality.
 */
export function classifyScenarioExecutionError(errorMessage: string): {
	failureCategory: 'framework_issue';
	rootCause: string | undefined;
	reasoning: string;
} {
	const timedOut = isExecutionTimeout(errorMessage);
	return {
		failureCategory: 'framework_issue',
		rootCause: timedOut ? `${BUDGET_TIMEOUT_ROOT_CAUSE}: ${errorMessage}` : undefined,
		reasoning: `Scenario execution error: ${errorMessage}`,
	};
}

/**
 * Eval-DB races abort an execution before any node runs. Two known shapes:
 * `SQLITE_CONSTRAINT: FOREIGN KEY constraint failed` and `Workflow <id> not
 * found or not accessible` (lookup misses that outlast the server's own 1.7s
 * retry under concurrent eval load). Both come back as a successful HTTP
 * response with `success: false`, so the throw-based retry above never sees
 * them — yet they are infrastructure flakes, not builder or mock defects, and
 * they double-count across every unit of the affected iteration.
 */
export function isTransientExecutionAbort(errors: string[] | undefined): boolean {
	return (errors ?? []).some((e) => /SQLITE_CONSTRAINT|not found or not accessible/i.test(e));
}
