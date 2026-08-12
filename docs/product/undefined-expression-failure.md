# Fail a node when an expression resolves to undefined

Status: Draft · Owner: wire · Date: 2026-08-12 · Issue: N8N-240 (parent N8N-239)

## Problem

A node parameter driven by an expression can resolve to `undefined` when the referenced
field is absent — a renamed API field, an empty branch, a first-run item that lacks a key.
n8n does not treat that as an error. The node runs with a missing value and the workflow
reports success, so the failure surfaces downstream as an email with a blank recipient, an
HTTP request with a dropped query parameter, or a record written with a hole in it. The user
learns about it from the person who received the broken output, not from n8n.

## Evidence

- **Reported (unquantified):** the parent issue reports users sending `Hello, undefined`
  in emails. Source: Operator, N8N-239. No ticket count, no affected-workflow count.
- **Verified (code):** a parameter that resolves to `undefined` reaches the node silently.
  `_getNodeParameter` (`packages/core/src/execution-engine/node-execution-context/node-execution-context.ts:489`)
  guards the *raw* parameter (line 505: `value === undefined` → throw) but never checks
  the *resolved* result. `extractValue` / `ensureType` / `validateValueAgainstSchema`
  (lines 557–580) are opt-in per parameter, so most parameters have no guard at all.
- **Verified (code + execution):** the reported symptom `Hello, undefined` **is not produced
  by n8n's interpolation.** For a template with surrounding text, tournament emits
  `v = (<expr>); return v || v === 0 || v === false ? v : ''` per code chunk and `.join('')`s
  the parts (`packages/@n8n/tournament/src/ExpressionBuilder.ts:106-131` and `:204-271`).
  Executing that emitted shape:

  | `$json.name` | `Hello, {{ $json.name }}` | `{{ $json.name }}` |
  |---|---|---|
  | missing key | `"Hello, "` | `undefined` |
  | explicit `undefined` | `"Hello, "` | `undefined` |
  | `null` | `"Hello, "` | `null` |
  | `""` | `"Hello, "` | `""` |
  | `0` | `"Hello, 0"` | `0` |
  | `false` | `"Hello, false"` | `false` |

  Interpolation already yields empty string, never the text `undefined`. The real
  `Hello, undefined` comes from JavaScript coercion **inside** the expression —
  `{{ 'Hello, ' + $json.name }}` and `` {{ `Hello, ${$json.name}` }} `` both produce
  `"Hello, undefined"`, verified. That string is a perfectly good non-empty value by the
  time the expression returns, so **no check at the result boundary can catch it.**
- **Verified (code):** two independent resolution paths exist. Programmatic nodes go through
  `_getNodeParameter`; declarative nodes go through the private `getParameterValue` in
  `packages/core/src/execution-engine/routing-node.ts:760-787`. 102 files under
  `packages/nodes-base/nodes` contain `routing:`.
- **Assumed:** that users who hit this would prefer a hard failure over a silent hole. Untested.
  This is the assumption the default-off setting exists to hedge.

**Consequence for scope, stated plainly:** the literal example in the parent issue is *not*
fixable by "fail when an expression evaluates to `undefined`". This spec fixes the adjacent
and more common defect — a whole parameter silently becoming `undefined`. The in-expression
coercion case is named as a non-goal and needs its own investigation (see Open questions Q1).

## Users

- **Served:** builders whose workflows read from sources with unstable or optional fields, and
  who would rather the run fail loudly. Opt-in, per node, so the population is self-selecting.
- **Not served:** anyone relying on `undefined` → empty-string as intended behaviour (the
  default keeps working for them, untouched); users whose broken output comes from
  in-expression string concatenation (Non-goals #1).
- **Size: unknown.** No analytics access in this workspace, so no adoption baseline. Naming
  this as a gap rather than guessing a number.

## Success metric + guardrail

**Success:** of nodes with the setting enabled, ≥ 20% raise the new error at least once within
60 days of enabling it. That is the test of whether the setting catches real defects rather
than decorating the settings panel. Baseline 0 (feature does not exist).

**Guardrail 1 (the important one):** execution failure rate for workflows with the setting
**off** does not move at all. Not "does not move much" — this branch must be unreachable
when the setting is off.

**Guardrail 2:** p95 node execution time does not regress. One `=== undefined` comparison on
an already-computed value, no change to expression resolution itself.

**Instrumentation plan** (ships with the feature, not after):
- Setting enablement: add the key to `collectSettings` /`foundNodeSettings` in
  `packages/frontend/editor-ui/src/features/ndv/shared/ndv.utils.ts:624-660`, matching the
  `alwaysOutputData` pattern at line 642. This is the existing node-settings telemetry hook.
- Error occurrence: the new `ExpressionError` `type` value (below) is what makes fired errors
  countable in execution data. No new event needed.

## Decisions

### D1 — What counts as "evaluates to undefined"

**Only the whole resolved parameter value being `undefined`.** `returnData === undefined`
after resolution — a strict identity check, not a truthiness check.

| Case | Throws? | Why |
|---|---|---|
| Whole value `undefined` (`={{ $json.missing }}`) | **Yes** | The defect being fixed |
| `undefined` interpolated in text (`=Hello, {{ $json.missing }}`) | **No** | Already resolves to `"Hello, "`; there is nothing to catch (see Evidence) |
| In-expression coercion (`={{ 'Hi ' + $json.missing }}`) | **No** | Returns the non-empty string `"Hi undefined"`; undetectable at this boundary. Non-goal #1 |
| `null` | **No** | Distinct and usually deliberate — JSON `null` is a real value |
| `""` | **No** | A legitimate value; failing on it would break far more than it fixes |
| `NaN` | **No** | Different defect, different fix. Non-goal #4 |
| Missing key vs. explicit `undefined` | **Both throw, indistinguishable** | Verified: both resolve to `undefined`. Do not spend effort trying to separate them |

Non-expression parameters are untouched — a literal `undefined` cannot be authored in the UI,
and the raw-value guard at `node-execution-context.ts:505` already covers absent parameters.

### D2 — Setting shape and scope

- **Key:** `throwOnUndefinedExpression?: boolean` on `INode`
  (`packages/workflow/src/interfaces.ts:1590-1621`), a top-level sibling of `alwaysOutputData`
  — *not* inside `parameters`. Add to the zod node schema at
  `packages/workflow/src/schemas.ts:478-488` as `z.boolean().optional()`.
- **Default:** `false`. Absent key and `false` must behave identically; do not backfill the key
  into existing workflows.
- **Label:** `Error On Undefined Expression`, Title Case to match `Always Output Data` /
  `Retry On Fail` / `Execute Once`. This drops the developer verb "throw" from the parent
  issue's wording while keeping "undefined", which users literally see in the NDV. Low-stakes
  copy nit — the Operator's original `Throw error on undefined expression` is acceptable if
  preferred; either way the *key* stays `throwOnUndefinedExpression`.
- **Help text:** "If active, the node fails when an expression resolves to no value at all
  (`undefined`), instead of continuing with an empty value."
- **Scope: per-node only.** No workflow-level default in v1 — n8n has no existing mechanism for
  workflow-wide node-setting defaults, so adding one is new surface and a separate decision.
  v2 candidate.
- **i18n:** `nodeSettings.throwOnUndefinedExpression.displayName` / `.description` in
  `packages/frontend/@n8n/i18n/src/locales/en.json` (siblings at lines 2277–2314).

### D3 — Failure semantics

- **Error:** `ExpressionError` (`packages/workflow/src/errors/expression.error.ts`) with a new
  member added to its existing `type` union: `'undefined_value'`. The class already carries
  `parameter`, `itemIndex`, `runIndex` and `descriptionKey` — use them; do not invent a new
  error class.
- **Message:** must name the parameter, e.g.
  `The expression for parameter "<name>" resolved to no value (undefined)`.
  Description should point at the fix: check the field exists on the incoming item, or
  turn the setting off. `_getNodeParameter`'s catch block already stamps
  `e.context.parameter` (`node-execution-context.ts:546`).
- **Where thrown:** immediately after `cleanupParameterData(returnData)`
  (`node-execution-context.ts:535`), gated on `node.throwOnUndefinedExpression`. This location
  is deliberate: it keeps `packages/workflow`'s expression resolution — the hot, cached, dual-engine
  path — completely untouched, and leaves NDV expression previews unaffected (previews do not
  call `_getNodeParameter`, so the editor keeps showing `undefined` rather than erroring while
  the user is still typing).
- **Declarative nodes:** the same gate is required in `routing-node.ts:760-787`, which has
  `this.context.node` in scope. Without it the setting silently no-ops across ~102 node files,
  which is worse than not shipping it.
- **`On Error`:** no special handling. Because the throw happens inside the normal node
  execution try/catch, `stopWorkflow` / `continueRegularOutput` / `continueErrorOutput`
  (`packages/core/src/execution-engine/workflow-execute.ts:990-991, 1912`) apply exactly as they
  do to any node error. **Do not add a bypass.**
- **`Retry On Fail`:** likewise unmodified — retries will run
  (`workflow-execute.ts:1797-1815`) and will deterministically fail again, since the input item
  does not change between tries. That is consistent, mildly wasteful, and correct to leave
  alone; document it in the help text rather than special-casing it.
- **NDV / execution log:** the failed node shows the error like any node failure, with the
  parameter name visible. No new UI surface. If implementation finds one is needed, stop and
  route to design rather than inventing it.

### D4 — Backward compatibility

Default-off must leave every existing workflow byte-identical in behaviour. What holds that line:

- The only new runtime code is `if (node.throwOnUndefinedExpression && returnData === undefined)`.
  Absent setting → falsy → unreachable branch.
- No change to `Expression.resolveSimpleParameterValue`, to tournament codegen, or to the VM
  runtime. Both engines share `getExpressionCode`
  (`packages/@n8n/expression-runtime/src/evaluator/expression-evaluator.ts:191`), so touching
  the coercion at `ExpressionBuilder.ts:106-131` would change behaviour for **every existing
  workflow on both engines**. Out of bounds for this issue.
- Workflow JSON gains the key only when a user enables it, so existing stored workflows and
  their checksums are unchanged.

**Nothing in this spec requires breaking that line.** If stage 2 finds otherwise, that is a
blocker to raise in-thread, not a trade-off to absorb.

## Non-goals

1. **Catching `undefined` coerced to text inside an expression** (`'Hi ' + $json.x`,
   `` `Hi ${$json.x}` ``). This is the parent issue's literal example and it is genuinely out of
   reach here — it would require instrumenting user JavaScript, an RFC-scale change to
   `packages/workflow` expression semantics. Q1 below.
2. **Changing what interpolation returns for falsy values.** Shared codegen, both engines, every
   existing workflow.
3. **A workflow-level or instance-level default** for this setting.
4. **`null`, `""`, `NaN`, or empty-array strictness.** Adjacent, separately arguable, not here.
5. **Warning-without-failing, or a "strict expressions" mode.** One behaviour, one setting.
6. **Editor-time static detection** of expressions that might resolve to `undefined`.
7. **Retrofitting `ensureType` / schema validation** across existing node parameters.

## Thinnest testable slice

Per-node boolean, default off; strict `=== undefined` check on the resolved value in both
resolution paths; `ExpressionError` with `type: 'undefined_value'`; the existing settings toggle
pattern in the NDV; telemetry key added to the existing hook.

What the slice cuts, and why each cut is safe:
- Workflow-level default → per-node proves the behaviour first; no user is blocked.
- In-expression coercion detection → not achievable at this layer at any scope (Q1).
- `null`/`""`/`NaN` handling → each would widen blast radius without new evidence.
- Retry/`On Error` special-casing → inheriting standard node-error semantics is the correct
  default and is strictly less code.

## Acceptance criteria

Definition-of-ready gate for stages 2–4. Observable and testable as written.

**Setting**
1. `throwOnUndefinedExpression` is an optional boolean on `INode`, accepted by the node zod schema, defaulting to `false`.
2. The NDV Settings tab shows a toggle labelled per D2, off by default, using the same component and layout as `Always Output Data`.
3. The value survives save → reload, and workflow export → import.
4. A workflow whose node has never had the setting touched contains no `throwOnUndefinedExpression` key in its exported JSON.

**Behaviour — setting ON**
5. A node with a parameter `={{ $json.missing }}` (key absent from the item) fails execution with an `ExpressionError` whose `type` is `'undefined_value'`.
6. The error message names the offending parameter.
7. Same failure when the value is present but explicitly `undefined`.
8. A parameter `=Hello, {{ $json.missing }}` does **not** fail; it resolves to `"Hello, "`.
9. Parameters resolving to `null`, `""`, `0`, `false`, or `NaN` do **not** fail.
10. A declarative (`routing:`-based) node fails under the same conditions as a programmatic one.
11. With `On Error: continueRegularOutput`, the workflow continues past the failure; with `continueErrorOutput`, the item is routed to the error output; with `stopWorkflow`, the execution stops.
12. With `Retry On Fail` on, the configured retries are attempted and the node then fails — no infinite loop, no swallowed error.

**Behaviour — setting OFF (the regression gate)**
13. Every case in 5–12 behaves exactly as it does on `master` today: `undefined` reaches the node, the node succeeds, no error is raised.
14. A regression test asserts case 13 explicitly for whole-value `undefined`, and is required to land in the repo.
15. No change to any file under `packages/workflow/src/expression*`, `packages/@n8n/tournament`, or `packages/@n8n/expression-runtime`. A diff touching expression resolution or codegen fails this criterion.

**Editor**
16. NDV expression previews still render `undefined` / empty for an unresolvable expression while editing, regardless of the setting. Turning the setting on does not make the editor error as the user types.

**Instrumentation**
17. Enabling the setting is recorded through the existing `foundNodeSettings` hook.

## Open questions

| # | Question | Owner | Resolve by |
|---|---|---|---|
| Q1 | The parent issue's `Hello, undefined` example comes from JS coercion inside the expression, which this spec cannot catch. Accept the narrower fix as v1, or open a separate RFC on expression semantics for the coercion case? Recommendation: accept v1, open the RFC separately if evidence justifies it. | Operator | before stage 2 starts |
| Q2 | Declarative nodes: include `routing-node.ts` in v1 (recommended — otherwise the setting silently does nothing on ~102 node files), or ship programmatic-only and follow up? | Operator | before stage 2 starts |
| Q3 | Final label wording — `Error On Undefined Expression` (recommended) vs. the parent's `Throw error on undefined expression`. Copy-only; does not block stage 2, which uses the i18n key. | Operator / @jinx | before stage 3 ships |

Stages 2–4 may proceed on the recommendations above, treated as labelled assumptions, if the
Operator does not answer first. Q1 and Q2 change scope; Q3 does not.

## Kill criteria

- **Adoption:** if fewer than 0.5% of active workflows have the setting enabled on at least one
  node 90 days after release, remove the setting and the code path rather than leaving it as
  furniture.
- **Precision:** if enabled nodes raise this error at a rate suggesting it mostly fires on values
  users considered acceptable — or if support sees repeated "my working node started failing"
  reports traced to it — the semantics in D1 are wrong; revert and re-spec.
- **Immediate revert:** any confirmed behaviour change in a workflow with the setting off.
  That is not a bug to fix forward; it fails Guardrail 1 and the change comes out.
