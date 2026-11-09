---
name: n8n:state-machines
description: >-
  Finds implicit state machines in n8n code (boolean flag clusters, loose
  status strings, scattered transitions, impossible-state bugs) and makes them
  explicit without a behavior change. Use when the user asks to find, audit,
  or refactor implicit state, state machines, status flags, lifecycle logic,
  or "impossible states", or wants better UX, DX, and AX from state handling.
---

# Implicit state machines

Find each implicit state machine. Rank them. Make the worst ones explicit, one
machine for each change, with no change to observable behavior.

A change is acceptable only if it improves all three:

- **UX** – the user cannot see an impossible state (spinner and error at the
  same time, a stale button, a lost cancel).
- **DX** – a developer can see all states and transitions in one place, and
  the compiler rejects a missed case.
- **AX** – an agent can read the legal states and transitions from types and
  one doc comment, without tracing call sites.

If a change cannot improve all three without risk, do not make it. Record it
in the report as "deferred" with the reason.

## Hard rules (do not break anything)

1. Do not change a persisted value. This includes DB columns, enum strings,
   `ExecutionStatus`, push message types, public API payloads, telemetry
   properties, and i18n keys. Map at the boundary instead.
2. Do not change a type in `@n8n/api-types` or `n8n-workflow` in the same
   change as a refactor. These packages have external consumers.
3. Write characterization tests first. They must pass on the old code and on
   the new code without edits.
4. One machine for each commit. Do not mix a refactor with a bug fix. If you
   find a real bug (a reachable illegal state), report it and fix it in a
   separate commit with its own regression test.
5. Do not add a state machine library. The repo has none. Use TypeScript:
   discriminated unions, a transition table, and exhaustive `switch`.
6. Do not touch a machine that has no tests and that you cannot test (for
   example, timing that only occurs in multi-main). Defer it.

## Workflow

### 1. Scope

Ask for the scope if the user did not give it: a package, a module, or a
feature. A full-repo audit of n8n is too large for one pass. Default to the
package that the user works in (`git diff --name-only master...` gives a
hint).

### 2. Detect

Use the signals in [reference.md](reference.md#detection-signals). Run the
searches there on the scope. For each candidate, record:

- location (`file:line` for the state, and for each write)
- the states (explicit and implied)
- the transitions and who triggers them
- the illegal combinations that the current types allow
- whether the state persists or crosses a process or a wire boundary

### 3. Rank

Score each candidate 0–3 on each axis. Sort by the sum. Break ties by the
lowest risk.

| Axis | 3 means |
|------|---------|
| Bug surface | An illegal state is reachable now, or was the cause of a past bug (`git log -S`) |
| Spread | Writes are in 3 or more files or stores |
| Churn | High change frequency (`git log --oneline -- <file> \| wc -l`) |
| Risk (subtract) | Persisted, cross-process, or public API |

### 4. Report before you edit

Give the user the ranked table. Use the format in
[reference.md](reference.md#report-format). Stop and get approval for each
machine that you will refactor. Do not refactor the full list in one go.

### 5. Refactor one machine

Follow the pattern in [reference.md](reference.md#target-shapes):

1. Add characterization tests for the current transitions and the current
   outputs. Run them. They must pass.
2. Replace the flags with one discriminated union. Keep the old fields as
   derived getters (`computed` in Vue) if other code reads them. This keeps
   call sites unchanged.
3. Put all transitions in one place: a reducer, a transition table, or named
   methods. Callers send events. Callers do not set state.
4. Add exhaustiveness: `switch` on the state with a `default` branch that
   assigns to `never`.
5. Add one doc comment on the state type. List the states, the legal
   transitions, and the terminal states. This comment is the AX contract.
6. Run the characterization tests again with no edits. Then run lint and
   typecheck on the changed files, as `AGENTS.md` "Verify changes" says.
7. Remove the derived getters only in a later change, after you migrate
   all readers.

### 6. Report the result

For each machine, give: what changed, the tests that prove no behavior
change, what you deferred, and each real bug that you found.

## Related

- Persisted lifecycle pattern in this repo:
  `packages/@n8n/engine/src/execution/step-store.ts` (named transitions with
  compare-and-set, no generic `setStatus`).
- Status vocabulary to reuse:
  `packages/workflow/src/execution-status.ts`.
- Frontend rules: `packages/frontend/AGENTS.md`.
- Persistence rules: `AGENTS.md` "Persistence layer & the TypeORM boundary".
