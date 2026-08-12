# Use the Shared sleep Utility

- Rule Statement:
Code must ALWAYS use `sleep` from `@n8n/utils/sleep` instead of
hand-rolling a helper that only wraps `setTimeout` in a promise. One
canonical helper keeps call sites consistent and makes its abortable
form discoverable — `sleep(ms, abortSignal?)` rejects early when the
signal fires, so a local abort-aware waiter is a violation too.

The `no-restricted-sleep-definition` and `no-restricted-sleep-import`
ESLint rules already catch helpers literally named `sleep` /
`sleepWithAbort` and named `sleep` imports from `n8n-workflow`. Do not
repeat those as review comments — this rule covers only what they
cannot see syntactically.

- Detection Criteria:
Flag NEW or MODIFIED code in `packages/**` where a delay is
re-implemented under a name ESLint does not restrict (`wait`, `delay`,
`pause`, `waitFor`, …) and the entire body is a promise wrapping
`setTimeout` with no additional behaviour:
  - `const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))`
  - `async function wait(ms) { await new Promise((r) => setTimeout(r, ms)); }`
The shape is what matters, not the name. Also flag an inline, awaited
`new Promise((resolve) => setTimeout(resolve, ms))`.

- Do NOT flag:
  - Wrappers that do more than wait: racing against another promise,
    rejecting with a timeout error once the delay elapses, retry
    backoff with jitter, debounce/throttle. (Rejecting on *abort* is a
    violation — `sleep` takes the signal.)
  - Bare `setTimeout` calls used for scheduling, not awaited as a delay
  - Test-framework helpers such as `vi.advanceTimersByTime` or waiting
    on fake timers
  - `packages/@n8n/node-cli/**` and `packages/@n8n/typeorm/**`, which
    cannot depend on `@n8n/utils` and are exempt from the ESLint rules
  - Existing unchanged code (review only new or modified lines)

- Recommendation:
Import `sleep` from `@n8n/utils/sleep` — `await sleep(500)`, or
`await sleep(500, abortSignal)` when the wait must be cancellable.
