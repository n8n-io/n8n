# Fail a node when an expression resolves to undefined

Status: Draft · Owner: wire · Date: 2026-08-12 · Issue: N8N-240 (parent N8N-239)

> This is the product spec as written before implementation, preserved as the feature's
> rationale. It is **not** a description of shipped behaviour: implementation deviated from
> D3's guard placement and from D5's declarative plan, both deliberately. For what the
> feature actually does, read [Error On Undefined Expression](error-on-undefined-expression.md);
> for why the implementation diverged, read the pull request description.

## Decisions log

| Date | Decision | By |
|---|---|---|
| 2026-08-12 | **Q1: do both cases as v1** — the whole-value `undefined` guard *and* in-expression coercion to the text `undefined`. Overrides this spec's earlier recommendation to ship the narrow guard and defer coercion to an RFC. Rationale on record: the coercion case is the symptom users actually reported, so shipping without it would not close the parent issue. | Operator |
| 2026-08-12 | **Q2: yes** — declarative (`routing:`) nodes are in v1. | Operator |

Consequence, stated plainly: v1 is roughly 3× the original slice and now touches shared
expression codegen. The compatibility line (default-off changes nothing) still holds and is
still non-negotiable, but the risk profile has moved from "too narrow to be useful" to
"false positives on expressions that deliberately handle missing values". Guardrail 3 and the
kill criteria are written against that new risk.

## Problem

A node parameter driven by an expression can silently lose its value when the referenced field
is absent — a renamed API field, an empty branch, a first-run item missing a key. n8n does not
treat that as an error. Either the parameter becomes `undefined` and the node runs with a hole
in it, or the missing value gets stringified into the output as the literal text `undefined`.
Both paths report success. The user learns about it from the person who received the broken
output — a mail merge addressed to `Hello, undefined`, an HTTP request with a dropped query
parameter, a record written with a missing field — not from n8n.

## Evidence

- **Reported (unquantified):** users sending `Hello, undefined` in emails. Source: Operator,
  N8N-239. No ticket count, no affected-workflow count.
- **Verified (code):** a parameter resolving to `undefined` reaches the node silently.
  `_getNodeParameter`
  (`packages/core/src/execution-engine/node-execution-context/node-execution-context.ts:489`)
  guards the *raw* parameter (line 505) but never the *resolved* result. `extractValue` /
  `ensureType` / `validateValueAgainstSchema` (lines 557–580) are opt-in per parameter.
- **Verified (code + execution):** the reported symptom does **not** come from n8n's
  interpolation. For a template with surrounding text, tournament emits
  `v = (<expr>); return v || v === 0 || v === false ? v : ''` per code chunk and `.join('')`s
  the parts (`packages/@n8n/tournament/src/ExpressionBuilder.ts:106-131`, `:204-271`).
  Executing that emitted shape:

  | `$json.name` | `=Hello, {{ $json.name }}` | `={{ $json.name }}` |
  |---|---|---|
  | missing key | `"Hello, "` | `undefined` |
  | explicit `undefined` | `"Hello, "` | `undefined` |
  | `null` | `"Hello, "` | `null` |
  | `""` | `"Hello, "` | `""` |
  | `0` | `"Hello, 0"` | `0` |
  | `false` | `"Hello, false"` | `false` |

  So `Hello, {{ $json.name }}` yields `Hello, ` — never the text `undefined`.
- **Verified (execution):** the text `undefined` is produced by JavaScript coercion **inside**
  the expression. Exactly which operations do it:

  | Expression fragment | Result | Produces `undefined` text? |
  |---|---|---|
  | `'Hello, ' + $json.missing` | `"Hello, undefined"` | **yes** |
  | `` `Hi ${$json.missing}` `` | `"Hi undefined"` | **yes** |
  | `String($json.missing)` | `"undefined"` | **yes** |
  | `''.concat($json.missing)` | `"undefined"` | **yes** |
  | `1 + $json.missing` | `NaN` | no |
  | `[1, $json.missing].join()` | `"1,"` | no |
  | `JSON.stringify({a: $json.missing})` | `"{}"` | no |
  | `$json.missing ?? 'default'` | `"default"` | no |
  | `null + ' x'` | `"null x"` | no (that is `null`, not `undefined`) |

  The first two are syntactic operators; the last two are call-shaped.
- **Verified (code):** two independent resolution paths. Programmatic nodes go through
  `_getNodeParameter`; declarative nodes use the private `getParameterValue` in
  `packages/core/src/execution-engine/routing-node.ts:760-787`. 102 files under
  `packages/nodes-base/nodes` contain `routing:`.
- **Assumed:** that users who hit this prefer a hard failure over a silent hole. Untested; the
  default-off setting is the hedge.

## Users

- **Served:** builders reading from sources with unstable or optional fields who would rather the
  run fail loudly. Opt-in per node, so the population is self-selecting.
- **Not served:** anyone relying on `undefined` → empty-string as intended behaviour (default
  keeps working, untouched); users whose broken output comes from `String()`/`.concat()`
  coercion (documented gap, D5) or from `null` rather than `undefined` (Non-goals).
- **Size: unknown.** No analytics access in this workspace. Recorded as a gap rather than guessed.

## Success metric + guardrail

**Success:** of nodes with the setting enabled, ≥ 20% raise the new error at least once within
60 days of enabling it. That tests whether the setting catches real defects rather than
decorating the settings panel. Baseline 0.

**Guardrail 1 — compatibility (hard gate):** execution failure rate for workflows with the
setting **off** does not move at all. Not "does not move much": the throwing branch must be
unreachable when the setting is off.

**Guardrail 2 — performance (hard gate):** p95 expression evaluation time does not regress
measurably. This is a real risk now, not a formality: instrumenting `+` and template literals
means the emitted code changes for **every** expression on both engines, including the ~99.9%
that hit the code cache. A benchmark on a representative workflow is required in the stage-2 PR
description, and a measurable p95 regression blocks merge.

**Guardrail 3 — precision (hard gate, the dominant risk):** the new error must not fire on
expressions that deliberately handle missing values. `??`, `?.`, `=== undefined`,
`typeof x !== 'undefined'`, and `Array.join` must never trigger it. A false positive fails a
workflow that was working correctly, which is a worse outcome than the bug being fixed.

**Instrumentation plan** (ships with the feature):
- Setting enablement: add the key to `collectSettings` / `foundNodeSettings` in
  `packages/frontend/editor-ui/src/features/ndv/shared/ndv.utils.ts:624-660`, matching
  `alwaysOutputData` at line 642.
- Error occurrence: the new `ExpressionError` `type` values make fired errors countable in
  execution data. Case A and case B must be distinguishable — see D3 — so we can tell which
  half of the feature is earning its keep.

## Decisions

### D1 — What counts as "evaluates to undefined"

Two cases, both in v1.

**Case A — whole resolved value is `undefined`.** `returnData === undefined` after resolution:
a strict identity check, not a truthiness check.

**Case B — `undefined` is converted to the string `"undefined"` during evaluation.** Scoped to
the two **syntactic** coercion sites: the `+` operator and template-literal interpolation. These
cover the reported symptom and, per the Evidence table, essentially all real occurrences.

| Case | Throws? | Why |
|---|---|---|
| `={{ $json.missing }}` → whole value `undefined` | **Yes (A)** | Silent hole in the parameter |
| `={{ 'Hi ' + $json.missing }}` | **Yes (B)** | The reported symptom |
| `` ={{ `Hi ${$json.missing}` }} `` | **Yes (B)** | Same symptom, template form |
| `=Hello, {{ $json.missing }}` | **No** | Already resolves to `"Hello, "`; catching it means changing shared interpolation coercion — Non-goal #1. **Known gap, see below** |
| `={{ String($json.missing) }}` / `.concat(...)` | **No** | Call-shaped, not syntactic; D5 gap |
| `={{ 1 + $json.missing }}` → `NaN` | **No** | No `undefined` text produced |
| `={{ $json.missing ?? 'x' }}`, `?.`, `=== undefined` | **No — must never throw** | Deliberate handling; Guardrail 3 |
| `null`, `""`, `0`, `false`, `NaN` as the whole value | **No** | Legitimate values |
| Missing key vs. explicit `undefined` | **Both throw, indistinguishable** | Verified: both resolve to `undefined`. Do not try to separate them |

**Known gap, called out so review does not discover it:** `=Hello, {{ $json.name }}` — plausibly
the most common authoring form — still silently yields `Hello, `. Catching it requires changing
`buildFunctionBody`'s falsy coercion, which is shared by both engines and would alter behaviour
for every existing workflow (Non-goal #1). Users may reasonably find this surprising after
enabling the setting. Revisit if reported; the help text should not overpromise.

Non-expression parameters are untouched.

### D2 — Setting shape and scope

- **Key:** `throwOnUndefinedExpression?: boolean` on `INode`
  (`packages/workflow/src/interfaces.ts:1590-1621`), top-level sibling of `alwaysOutputData`,
  *not* inside `parameters`. Add to the zod node schema at `packages/workflow/src/schemas.ts:478-488`
  as `z.boolean().optional()`.
- **Default:** `false`. Absent and `false` behave identically; do not backfill the key.
- **Label:** `Error On Undefined Expression` (Title Case, matching `Always Output Data` /
  `Retry On Fail`). Copy nit only — Q3.
- **Help text:** must describe both cases without overpromising the known gap, e.g. "If active,
  the node fails when an expression has no value at all (`undefined`), or when a missing value
  would be inserted into text as `undefined`."
- **Scope: per-node only.** No workflow-level default in v1 — n8n has no existing mechanism for
  workflow-wide node-setting defaults, so that is new surface and a separate decision.
- **i18n:** `nodeSettings.throwOnUndefinedExpression.displayName` / `.description` in
  `packages/frontend/@n8n/i18n/src/locales/en.json` (siblings at lines 2277–2314).

### D3 — Failure semantics

- **Error:** `ExpressionError` (`packages/workflow/src/errors/expression.error.ts`) with two new
  members on its existing `type` union: `'undefined_value'` (case A) and
  `'undefined_coercion'` (case B). Distinct values so instrumentation can tell them apart. The
  class already carries `parameter`, `itemIndex`, `runIndex`, `descriptionKey` — use them; do
  not add a new error class.
- **Messages** must name the parameter and, for case B, say where the coercion happened, e.g.
  `Parameter "<name>": a missing value was inserted into text as "undefined"`. Descriptions
  point at the fix (`?? ''`, or turn the setting off). `_getNodeParameter`'s catch already
  stamps `e.context.parameter` (`node-execution-context.ts:546`).
- **Case A location:** immediately after `cleanupParameterData(returnData)`
  (`node-execution-context.ts:535`), gated on `node.throwOnUndefinedExpression`. Deliberate: it
  leaves NDV previews unaffected, since previews do not call `_getNodeParameter` — the editor
  keeps showing `undefined` while the user is mid-edit rather than erroring at them.
- **Declarative nodes:** the same case-A gate is required in `routing-node.ts:760-787`, which has
  `this.context.node` in scope. Without it the setting silently no-ops across ~102 node files.
- **`On Error`:** no special handling. The throw happens inside the normal node execution
  try/catch, so `stopWorkflow` / `continueRegularOutput` / `continueErrorOutput`
  (`packages/core/src/execution-engine/workflow-execute.ts:990-991, 1912`) apply as they do to
  any node error. **Do not add a bypass.**
- **`Retry On Fail`:** unmodified. Retries will run (`workflow-execute.ts:1797-1815`) and
  deterministically fail again, since the input item does not change between tries. Consistent
  and correct to leave alone; note it in the help text rather than special-casing.
- **NDV / execution log:** failed node shows the error like any node failure, parameter name
  visible. No new UI surface. If implementation finds one is needed, stop and route to design.

### D4 — Backward compatibility

Default-off must leave every existing workflow byte-identical in behaviour.

- Case A adds only `if (node.throwOnUndefinedExpression && returnData === undefined)`. Absent
  setting → falsy → unreachable.
- Case B changes emitted code for all expressions (D5), so identical *behaviour* when off must be
  guaranteed by the injected helper being a faithful pass-through, not by the transform being
  skipped. That is the crux of stage 2's contract and where review attention belongs.
- Workflow JSON gains the key only when a user enables it, so stored workflows and their
  checksums are unchanged.

### D5 — How case B is detected: constraints, not architecture

@signal owns the design and must post the contract on N8N-241 before implementing. These are the
constraints the research turned up, so that contract does not start from a blank page.

**The seam already exists.** Tournament accepts `before`/`after` AST hooks
(`packages/@n8n/tournament/src/ast.ts`, wired at `Tournament`'s constructor in
`packages/@n8n/tournament/src/index.ts`). n8n already ships three: `ThisSanitizer`,
`PrototypeSanitizer`, `DollarSignValidator` (`packages/workflow/src/expression-sandboxing.ts`).
An instrumenting hook for `+` and template literals fits this mechanism.

**The injected-helper pattern already exists, with four touchpoints.** `__sanitize` is the
working precedent — copy its shape:
1. name + reserved-word guard — `expression-sandboxing.ts:13-18`
2. codegen injects the call — `PrototypeSanitizer`, `expression-sandboxing.ts:498`
3. host-side implementation on `data` — `Object.defineProperty(data, sanitizerName, …)` in
   `packages/workflow/src/expression.ts`
4. in-isolate implementation — `packages/@n8n/expression-runtime/src/runtime/context.ts:121`

Both engines need it. Missing touchpoint 4 means the feature silently does nothing under
`N8N_EXPRESSION_ENGINE=vm`.

**Hard constraint — codegen cannot vary by setting.** Transformed code is cached keyed by
expression string alone (`codeCache: LruCache<string, string>`,
`packages/@n8n/expression-runtime/src/evaluator/expression-evaluator.ts:42, 168-195`, ~99.9% hit
rate). Two nodes sharing an expression string but differing in this setting would collide. So:
**emit the instrumented form unconditionally and gate at runtime**, e.g. via a plain boolean on
the data context (a boolean crosses the bridge; function-typed values on `data` do not — see the
note at `packages/workflow/src/expression.ts:585`). Do not put the setting in the cache key.

**Required behaviour of the helper:**
- When the flag is off, semantics are byte-for-byte those of the operator it replaced —
  including string/number coercion order, `NaN` results, and `null` handling.
- When on, it throws only if an operand is `undefined` **and** the operation would insert the
  text `undefined`. `1 + undefined` → `NaN`, no throw.
- It must not perturb short-circuiting or evaluation order.

**Foreclosed alternatives, so they are not re-proposed:** substring-sniffing the final result for
`"undefined"` (false-positives on legitimate data containing that word); flagging any property
access that returns `undefined` (breaks `??`, `?.`, `=== undefined` — fails Guardrail 3).

## Non-goals

1. **Changing what interpolation returns for falsy values.** Shared codegen, both engines, every
   existing workflow. This is what leaves the `=Hello, {{ $json.name }}` gap in D1.
2. **`String()` / `.concat()` coercion sites.** Call-shaped rather than syntactic; instrumenting
   the call graph is materially more invasive for a small share of occurrences. Documented gap.
3. **A workflow-level or instance-level default** for this setting.
4. **`null`, `""`, `NaN`, or empty-array strictness**, including `null + ' x'` → `"null x"`.
5. **Warning-without-failing, or a general "strict expressions" mode.** One behaviour, one setting.
6. **Editor-time static detection** of expressions that might resolve to `undefined`.
7. **Retrofitting `ensureType` / schema validation** across existing node parameters.

## Thinnest testable slice

Not thin any more, and worth saying so: the Operator's decision makes v1 three surfaces —
case A in two resolution paths, case B in shared codegen across two engines, and the settings
toggle. Cut scope, never quality: what keeps quality intact here is the sequencing, not a smaller
feature. **Recommend splitting N8N-241** so case A (small, self-contained, low risk) lands and is
verifiable before case B (codegen, perf-sensitive, both engines) starts. Same v1 scope, two PRs,
independently revertable. @trigger owns the schedule; this is a sequencing recommendation, not a
date.

What v1 still cuts, and why each cut is safe:
- Interpolation coercion (Non-goal #1) → shared codegen, unbounded blast radius.
- `String()`/`.concat()` (Non-goal #2) → small share of occurrences, disproportionate reach.
- Workflow-level default → per-node proves the behaviour first; nobody is blocked.
- Retry / `On Error` special-casing → inheriting standard node-error semantics is correct *and*
  less code.

## Acceptance criteria

Definition-of-ready gate for stages 2–4. Observable and testable as written.

**Setting**
1. `throwOnUndefinedExpression` is an optional boolean on `INode`, accepted by the node zod schema, defaulting to `false`.
2. The NDV Settings tab shows a toggle labelled per D2, off by default, same component and layout as `Always Output Data`.
3. The value survives save → reload, and workflow export → import.
4. A workflow whose node never had the setting touched contains no `throwOnUndefinedExpression` key in its exported JSON.

**Case A — whole value undefined, setting ON**
5. A parameter `={{ $json.missing }}` (key absent) fails with an `ExpressionError` of type `'undefined_value'`.
6. The error message names the offending parameter.
7. Same failure when the key is present with an explicit `undefined` value.
8. A declarative (`routing:`-based) node fails under the same conditions as a programmatic one.
9. Parameters resolving to `null`, `""`, `0`, `false`, or `NaN` do **not** fail.

**Case B — coercion to the text `undefined`, setting ON**
10. `={{ 'Hi ' + $json.missing }}` fails with an `ExpressionError` of type `'undefined_coercion'`.
11. `` ={{ `Hi ${$json.missing}` }} `` fails the same way.
12. Fires identically under both engines: default, and `N8N_EXPRESSION_ENGINE=vm`.
13. `={{ 1 + $json.missing }}` does **not** fail and still evaluates to `NaN`.
14. `={{ [1, $json.missing].join() }}` does **not** fail and still evaluates to `"1,"`.
15. **None of these ever fail:** `={{ $json.missing ?? 'x' }}`, `={{ $json.a?.b }}`, `={{ $json.missing === undefined }}`, `={{ typeof $json.missing !== 'undefined' }}`. (Guardrail 3.)
16. `=Hello, {{ $json.missing }}` does **not** fail and still resolves to `"Hello, "` — the documented gap in D1.
17. An item whose data legitimately contains the string `"undefined"` does **not** fail.

**Failure semantics**
18. With `On Error: continueRegularOutput` the workflow continues past the failure; with `continueErrorOutput` the item routes to the error output; with `stopWorkflow` execution stops. Applies to both error types.
19. With `Retry On Fail` on, configured retries are attempted and the node then fails — no infinite loop, no swallowed error.

**Setting OFF — the regression gate**
20. Every case in 5–19 behaves exactly as on `master` today: `undefined` reaches the node, the text `undefined` still appears in output, no error is raised.
21. Regression tests asserting 20 for both case A and case B land in the repo.
22. Expression evaluation results are unchanged for the whole existing tournament fixture suite (`packages/@n8n/tournament/test/ExpressionFixtures/base.ts`) with the setting off, on both engines.
23. A benchmark comparing p95 expression evaluation before/after the case-B transform appears in the stage-2 PR description. A measurable regression blocks merge (Guardrail 2).

**Editor**
24. NDV expression previews still render `undefined` / empty while editing, regardless of the setting. Turning it on does not make the editor error as the user types.

**Instrumentation**
25. Enabling the setting is recorded through the existing `foundNodeSettings` hook, and the two error types are distinguishable in execution data.

## Open questions

| # | Question | Owner | Resolve by |
|---|---|---|---|
| Q3 | Final label wording — `Error On Undefined Expression` (recommended) vs. the parent's `Throw error on undefined expression`. Copy-only; does not block stage 2, which builds against the i18n key. | Operator / @jinx | before stage 3 ships |

Q1 and Q2 are resolved — see the decisions log.

## Kill criteria

- **Precision (fastest trigger):** if case B produces confirmed false positives on expressions
  that deliberately handle missing values, case B comes out — not forward-fixed. It fails
  Guardrail 3, and a setting that fails working workflows destroys trust in the setting.
- **Performance:** a measurable p95 expression-evaluation regression attributable to the case-B
  transform reverts case B, regardless of adoption.
- **Adoption:** if fewer than 0.5% of active workflows have the setting enabled on at least one
  node 90 days after release, remove the setting and both code paths rather than leaving
  furniture behind.
- **Immediate revert:** any confirmed behaviour change in a workflow with the setting off. That
  is not a bug to fix forward; it fails Guardrail 1 and the change comes out.
