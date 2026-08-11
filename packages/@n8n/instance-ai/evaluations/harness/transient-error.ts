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

import type { EvalAttribution } from './attribution';

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

/** A request cut short by the client's own AbortSignal. Narrower than
 *  {@link isExecutionTimeout}: a node's quoted `TimeoutError` is not a dead lane. */
export function isRequestAbort(message: string): boolean {
	return /operation was aborted/i.test(message);
}

/** The server stopped the run for exceeding the forwarded budget. In-band
 *  (`success: false`), so unrecognised it reads as an ordinary failure to the
 *  judge. Wording kept in sync with BOTH server paths that stop a run for time:
 *  `EvalExecutionService.awaitRunWithinBudget` (workflow) and
 *  `EvalAgentExecutionService`'s budget abort (agent). */
export function isServerBudgetStop(errors: string[] | undefined): boolean {
	return (errors ?? []).some((e) => /exceeded its .*eval budget/i.test(e));
}

/** Re-throw a budget stop as a timeout so the caller's timeout path classifies it
 *  instead of the judge scoring it as a builder failure. Shared by the workflow and
 *  agent scenario runners: the classification is one rule, so it lives in one place
 *  rather than being kept in sync by hand at two call sites. No-op otherwise. */
export function throwIfServerBudgetStop(result: { success: boolean; errors: string[] }): void {
	if (result.success || !isServerBudgetStop(result.errors)) return;
	throw new Error(`The operation was aborted due to timeout: ${result.errors.join('; ')}`);
}

/** Retry decision for one failed scenario-execution attempt. */
export function shouldRetryScenarioExecution(message: string, attempt: number): boolean {
	if (isTransientNetworkError(message)) return attempt < MAX_EXEC_ATTEMPTS;
	if (isExecutionTimeout(message)) return attempt < MAX_TIMEOUT_ATTEMPTS;
	return false;
}

/**
 * Marker prefix for the rootCause stamped on a scenario whose execution was
 * aborted by the per-iteration budget/timeout. lang-tracer used to key an infra
 * attribution off this plus `failureCategory: "framework_issue"`; it now reads
 * our `attribution` directly and this is only the fallback for rows written by
 * an older pinned harness commit. Keep the wording stable across both repos.
 */
export const BUDGET_TIMEOUT_ROOT_CAUSE =
	'Scenario execution exceeded its per-iteration time budget and was aborted before a verdict';

/**
 * Classify an error thrown out of scenario execution into the report fields.
 *
 * Any error that escapes `executeScenario` (after its own retries) is an
 * infra/framework problem, never an agent verdict, so it is always
 * `framework_issue`. A budget/timeout abort additionally carries a
 * timeout-flavoured `rootCause`, kept for readers on the legacy contract.
 */
export function classifyScenarioExecutionError(errorMessage: string): {
	failureCategory: 'framework_issue';
	/** Infra by construction — see above. Sent verbatim to lang-tracer, which no
	 *  longer has to infer it from the timeout-flavoured rootCause. */
	attribution: EvalAttribution;
	rootCause: string | undefined;
	reasoning: string;
} {
	const timedOut = isExecutionTimeout(errorMessage);
	return {
		failureCategory: 'framework_issue',
		attribution: 'framework_issue',
		rootCause: timedOut ? `${BUDGET_TIMEOUT_ROOT_CAUSE}: ${errorMessage}` : undefined,
		reasoning: `Scenario execution error: ${errorMessage}`,
	};
}

// ---------------------------------------------------------------------------
// Provider outages (TRUST-374)
//
// A model-provider 5xx/529 during the BUILD is upstream of the n8n instance:
// the lane stays healthy and the socket never breaks, so none of the checks
// above see it. Left unclassified it reads as "the agent built it wrong" — and
// because it fails in seconds rather than minutes, a 15-minute outage let each
// runner shred its remaining queue at ~60x normal speed (sweep #57: 124 units
// scored flat zero, with no product regression behind them).
// ---------------------------------------------------------------------------

/** Statuses a model provider returns when it is overloaded or briefly broken.
 *  429 counts: provider-side throttling is not a builder defect either. */
const PROVIDER_OUTAGE_STATUSES = new Set([429, 500, 502, 503, 529]);

/** Shapes that need no corroboration — the ai-sdk error class and Anthropic's
 *  overload code only appear on a genuine provider failure. */
const PROVIDER_ERROR_TOKEN = /AI_APICallError|AI_RetryError|overloaded_error/i;

/** Shapes that indicate an outage only once we know the text came from the model
 *  call. "Internal server error" on its own is far too common to classify from. */
const TRANSIENT_FAILURE_TOKEN =
	/\bInternal server error\b|\bOverloaded\b|\bService Unavailable\b|\bBad Gateway\b|\b(?:HTTP|status(?: code)?)\s*[:=]?\s*(?:429|500|502|503|529)\b/i;

/**
 * Root cause stamped on a build that died on a provider outage. lang-tracer keyed
 * an infra attribution off this exact prefix; it now reads our `attribution`
 * instead, so this is the legacy-contract fallback — same arrangement as
 * `BUDGET_TIMEOUT_ROOT_CAUSE`.
 */
export const PROVIDER_OUTAGE_ROOT_CAUSE =
	'Model provider was unavailable during the build (transient upstream 5xx/429), so the agent produced no output';

/** Max attempts (initial + retries) for a build hitting a provider outage. Kept
 *  separate from `MAX_BUILD_ATTEMPTS` because each of these retries also waits
 *  out a backoff, so the two budgets are not interchangeable. */
export const MAX_PROVIDER_BUILD_ATTEMPTS = 3;

/**
 * How long to wait BEFORE re-attempting a build that died on a provider outage.
 * This is a delay between attempts, not a limit on how long a build may take —
 * the build's own budget (`effectiveTimeoutMs`, 15+ minutes) is untouched.
 *
 * Deliberately long relative to the failure itself: a provider 5xx comes back in
 * ~3 seconds, so instant cross-lane retries just re-hit the same upstream and
 * the run queue drains at the speed of the outage. Absorbing ~2 minutes locally
 * is the cheapest defence available, and it costs nothing when the provider is
 * healthy because none of this runs.
 */
export function providerRetryBackoffMs(attempt: number): number {
	return attempt === 1 ? 30_000 : 90_000;
}

/** True for error text that only a failing model provider produces. */
export function isTransientProviderError(message: string): boolean {
	if (PROVIDER_ERROR_TOKEN.test(message)) return true;
	// `Agent error:` is summarizeMissingWorkflowError's prefix for run-level error
	// events — i.e. the agent's own model call blew up. `Tool errors:` is
	// deliberately excluded: that is the built workflow's own (mocked) HTTP
	// traffic, and a 5xx there is a real product signal.
	return /^Agent error:/i.test(message) && TRANSIENT_FAILURE_TOKEN.test(message);
}

/** Minimal view of a captured SSE event — avoids a cycle back through `types`. */
interface ErrorEventLike {
	type: string;
	data: Record<string, unknown>;
}

/**
 * Provider evidence read from the captured event stream. Preferred over the
 * flattened error text because the agent's `error` events carry the ai-sdk
 * `statusCode` verbatim, making this a structured check rather than a guess.
 * Only run-level `error` events count — a `tool-error` carrying an HTTP 500 is
 * the built workflow's own API call failing.
 */
export function providerOutageFromEvents(events: ErrorEventLike[] | undefined): string | undefined {
	for (const event of events ?? []) {
		if (event.type !== 'error') continue;
		const payload = (event.data.payload ?? event.data) as Record<string, unknown>;
		const status = payload.statusCode;
		const content = typeof payload.content === 'string' ? payload.content : undefined;
		if (typeof status === 'number' && PROVIDER_OUTAGE_STATUSES.has(status)) {
			return `provider HTTP ${String(status)}${content ? `: ${content}` : ''}`;
		}
		if (content && PROVIDER_ERROR_TOKEN.test(content)) return content;
	}
	return undefined;
}

/**
 * Provider-outage evidence for a failed build, structured signal first. Returns
 * the evidence (for the root cause) or undefined when the failure is a genuine
 * builder verdict.
 */
export function findProviderOutage(build: {
	success: boolean;
	error?: string;
	events?: ErrorEventLike[];
}): string | undefined {
	if (build.success) return undefined;
	const fromEvents = providerOutageFromEvents(build.events);
	if (fromEvents) return fromEvents;
	return build.error && isTransientProviderError(build.error) ? build.error : undefined;
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
