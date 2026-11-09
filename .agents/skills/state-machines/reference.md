# State machines reference

## Detection signals

Run these on the scope (replace `<scope>`). Each hit is a candidate, not a
finding. Read the code before you record it.

```bash
# Boolean flag clusters: two or more is/has/should flags on one object or store
rg -n --type ts --type vue '\b(is|has|should)[A-Z]\w*\s*(=|:)\s*(ref\()?(true|false)' <scope>

# Loose status strings without a union type
rg -n --type ts --type vue '\b(status|state|phase|stage|mode|step)\s*(=|:)\s*(ref\()?['"'"'"]' <scope>

# Direct writes to status from many places
rg -n --type ts --type vue '\.(status|state|phase)\s*=\s*' <scope>

# Optional fields that only make sense together (data/error/loading triads)
rg -n --type ts '\b(error|result|data)\?:' <scope>

# Guard chains that hint at implied states
rg -n --type ts --type vue 'if \(!?\w+\.(is|has)\w+ && !?\w+\.(is|has)\w+' <scope>

# Timers, retries, and abort controllers (often hide lifecycle states)
rg -n --type ts 'setTimeout|setInterval|AbortController|retryCount|attempts' <scope>
```

Strong signals:

- Two or more booleans where some combinations are meaningless
  (`isLoading && hasError`, `isSaving && isDirty === false`).
- `status` typed as `string`, or a union with values that no code reads.
- A `watch` or event handler that resets several flags at once.
- Code that checks the same flag set in more than one file.
- A `finally` block that "cleans up" state. It often hides a missing state.
- Comments like "should not happen", "just in case", or "reset everything".

Common n8n locations:

| Area | Where to look |
|------|---------------|
| Editor stores | `packages/frontend/editor-ui/src/**/*.store.ts` (Pinia) |
| Composables | `packages/frontend/editor-ui/src/**/use*.ts` |
| Push and canvas | Push connection, node execution status in the canvas |
| Instance AI | `packages/@n8n/instance-ai`, `packages/cli/src/modules/instance-ai` (run and message lifecycle) |
| Backend services | Activation, executions, queue jobs, source control pull and push |
| Engine | `packages/@n8n/engine` (already explicit; use as reference) |

## Report format

```markdown
| # | Machine | Location | States (implied) | Illegal states allowed | Persisted? | Bug | Spread | Churn | Risk | Score | Action |
|---|---------|----------|------------------|------------------------|-----------|-----|--------|-------|------|-------|--------|
| 1 | Credential test | `x.store.ts:40` | idle, testing, ok, failed | testing + error set | no | 2 | 3 | 2 | 0 | 7 | refactor |
| 2 | Job lifecycle | `y.service.ts:88` | ... | ... | yes (DB) | 3 | 2 | 1 | -3 | 3 | defer: persisted |
```

Under the table, for each "refactor" row, give: the target union, the events,
and the characterization tests that you will add.

## Target shapes

### In-memory state (frontend store, composable, service field)

```ts
/**
 * Credential test lifecycle.
 * idle -> testing -> (succeeded | failed); any -> idle on reset.
 * Terminal: none. `failed` keeps the error for display.
 */
type TestState =
	| { kind: 'idle' }
	| { kind: 'testing'; startedAt: number }
	| { kind: 'succeeded' }
	| { kind: 'failed'; error: string };

type TestEvent =
	| { type: 'start'; now: number }
	| { type: 'resolve' }
	| { type: 'reject'; error: string }
	| { type: 'reset' };

function transition(state: TestState, event: TestEvent): TestState {
	switch (event.type) {
		case 'start':
			return state.kind === 'testing' ? state : { kind: 'testing', startedAt: event.now };
		case 'resolve':
			return state.kind === 'testing' ? { kind: 'succeeded' } : state;
		case 'reject':
			return state.kind === 'testing' ? { kind: 'failed', error: event.error } : state;
		case 'reset':
			return { kind: 'idle' };
		default: {
			const unhandled: never = event;
			return unhandled;
		}
	}
}
```

Rules:

- An event that is not legal in the current state returns the same state.
  Do not throw, unless the old code threw. Match the old behavior.
- Keep `transition` pure. Do side effects (API calls, toasts, telemetry) in the
  caller, after the transition.
- In Pinia, keep one `ref<TestState>`. Expose old flags as `computed`
  (`const isTesting = computed(() => state.value.kind === 'testing')`).
- Data that belongs to one state lives in that state's variant, not as an
  optional field on the store.

### Persisted state (DB row, queue job)

Do not use a generic `setStatus(id, status)`. Expose one named repository
method for each transition. Make each one a compare-and-set on the expected
source state, and return whether it applied. See
`packages/@n8n/engine/src/execution/step-store.ts`.

Keep the stored strings. If the code needs a richer in-memory union, map from
the row at the repository boundary.

### Wire state (push messages, API responses)

Do not change the payload. Parse the payload into the union at the receiver
with a Zod discriminated union or a type guard. Avoid `as`.

## Characterization tests

- Cover each transition that exists now, including the "wrong" ones. A
  refactor keeps them. A separate bug-fix commit changes them.
- Assert on observable output: rendered UI, returned values, emitted events,
  stored rows. Do not assert on the internal flag names. The refactor removes
  those.
- Frontend: Vitest with `@testing-library/vue` on the component or store.
- Backend: Vitest unit tests in the owning package. For DB transitions, use
  the package's existing integration test setup.
