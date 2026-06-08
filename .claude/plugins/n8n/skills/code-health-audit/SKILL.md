---
description: Use after an implementation to audit the full diff for dead code, leftover scaffolding, unnecessary complexity, redundancy, speculative abstractions, maintainability risks, and applicable RudderStack telemetry coverage before final review or commit.
---

# Code Health Audit

## When To Use

Use this after an implementation is functionally complete and the user wants a cleanup/refactor audit over the whole diff.

This is broader than normal PR review. The goal is to answer: what can be deleted, simplified, split, renamed, or de-risked before the change hardens into the codebase?

Do not use this as an excuse for broad unrelated refactors. Audit the implemented diff first, then trace only the surrounding code needed to prove or disprove a concern.

## Audit Posture

Treat unnecessary code as a real risk when it increases maintenance burden, test burden, public surface area, cognitive load, or future bug probability.

Prefer deletion and narrower local code over abstraction unless there is concrete current reuse, an explicit architectural boundary, or a strong established local pattern.

Separate evidence levels:

- **Confirmed finding**: enough evidence exists that the author should fix this before considering the implementation done.
- **Cleanup candidate**: likely worth simplifying or deleting, but needs owner judgment, extra validation, or may be deliberately retained.
- **Non-issue**: looked suspicious, but evidence shows it is needed. Mention only when useful to avoid repeat investigation.

## Inputs / Context

1. Identify the diff range and changed files.
2. Identify the stated goal, ticket, bug, or implementation intent.
3. Check local project guidance before judging style or architecture.
4. Inspect generated files, config, tests, docs, package metadata, and feature flags when they changed.
5. Identify product analytics/RudderStack conventions that may apply to newly added, changed, or removed user-visible behavior.
6. Respect repository constraints. Do not run broad lint or expensive repo-wide commands unless the user asked for that scope.

## Procedure

1. Build a diff map.
   - List changed files by purpose: production code, tests, config, docs, generated artifacts, migrations, package/dependency files.
   - Note new public exports, new entry points, new dependencies, new flags/config, new schemas, and removed/renamed paths.
   - Identify unrelated churn: formatting-only changes, dependency bumps, opportunistic refactors, or files that do not serve the implementation goal.

2. Run the residue pass.
   - Search for old and new paths living side by side.
   - Look for abandoned helpers, temporary scripts, debug logs, commented-out code, stale TODOs, stale feature flags, unused mocks/fixtures, fallback paths, and compatibility shims.
   - Check whether removed behavior left behind docs, tests, config, exports, labels, RudderStack telemetry, migrations, or package entries.

3. Run the dead-code pass.
   - For each new or modified symbol, check callers and registration points.
   - For removed or replaced behavior, search for references to old names, old flags, old config keys, old events, old CSS classes, old routes, and old tests.
   - For TypeScript/JavaScript projects, consider existing project tools first. If available and appropriate for the repo, use or suggest targeted checks such as `tsc --noUnusedLocals --noUnusedParameters`, ESLint unused rules, Knip for unused files/dependencies/exports, or project-specific code-health tooling.
   - Treat static-tool output as candidates, not proof. Dynamic imports, dependency injection, framework conventions, generated references, string-based registration, exported SDK/API surface, tests, and downstream package usage can make code appear unused when it is not.

4. Run the complexity pass.
   - Flag deep nesting, long methods/classes, excessive parameters, boolean flag arguments, wide interfaces, broad helper objects, and wrapper layers that mostly pass data through.
   - Challenge "future proof" options, generic abstractions with one real use, premature extension points, and configuration that is not required by the current goal.
   - Prefer splitting behavior by current responsibilities over adding a generalized framework around a single concrete case.
   - If duplication appears twice, decide whether keeping it local is clearer. If it appears three or more times, or changes must be synchronized across copies, consider a small shared helper.

5. Run the redundancy pass.
   - Look for duplicate validation, duplicate transformations, repeated conditionals, parallel enums/types/constants, repeated query fragments, duplicate test setup, and multiple sources of truth.
   - Check whether new dependencies duplicate standard-library, platform, or existing local helper functionality.
   - Check whether new tests duplicate lower-level coverage without improving confidence.

6. Run the RudderStack telemetry pass.
   - For newly added or materially changed user-visible behavior, workflow/agent lifecycle behavior, counters, surfaced settings, or business-critical state transitions, check whether existing RudderStack telemetry has an analogous event or counter that should be added or updated.
   - If telemetry is applicable, verify event names, payload fields, `event_version`, aggregation/flush behavior, tests/fixtures, and downstream warehouse or data-team expectations stay consistent.
   - Prefer minimal payloads from canonical sources. Do not add opportunistic dimensions or duplicate app-side derived warehouse fields when a raw source event is the established contract.
   - If telemetry is not applicable, make sure the omission is intentional rather than residue from adding product behavior without analytics coverage.

7. Run the boundary pass.
   - Check whether new public exports, API fields, database columns, events, RudderStack telemetry, settings, or SDK types are truly needed.
   - Look for product-specific concepts leaking into generic packages, generic packages reaching into app-specific adapters, or test-only seams exposed as production API.
   - For n8n `packages/@n8n/agents`, preserve the rule that the SDK stays generic and non-opinionated; n8n identity and policy belong in CLI/integration adapters.

8. Run the verification-risk pass.
   - Identify code that became harder to test, behavior hidden behind unnecessary indirection, and tests that would still pass if the implementation were broken.
   - Check whether simplification would reduce the test matrix or remove fragile mocks.
   - If a cleanup is behavior-preserving, name the existing tests or targeted checks that should cover it.

## Tooling Guidance

Prefer cheap, targeted commands before expensive global scans:

- `git diff --stat`, `git diff --name-only`, `git diff --check`
- `git diff <base>...HEAD -- <path>`
- `rg` for old names, flags, exports, routes, events, TODOs, debug logs, and removed concepts
- `rg` for RudderStack telemetry call sites, event names, payload fields, `event_version`, counters, pulse/flush paths, and analytics tests when product behavior changes
- project-local typecheck, lint, or code-health commands when they are already established
- language-specific unused/dependency tools only when configured or safe to run in the repo

For JavaScript/TypeScript, useful categories include:

- compiler unused checks: `noUnusedLocals`, `noUnusedParameters`
- linter unused checks: unused variables/imports, unreachable code
- graph/dependency tools: unused files, exports, dependencies, and unresolved imports
- duplication/complexity tools: cognitive complexity, duplicated blocks, large functions/classes

Do not blindly add new tools or configs during an audit. If a tool is missing, suggest it as a follow-up only when it would materially improve repeatability.

## Output Shape

Lead with the highest-value cleanup findings.

For each confirmed finding:

- `Severity`: use P1/P2/P3 or a concise priority label.
- `Evidence`: file/line references and the caller/search/tool evidence that proves the problem.
- `Why it matters`: maintainability, test burden, public API surface, risk of stale behavior, rollback complexity, or future bug risk.
- `Suggested fix`: usually delete, inline, narrow, split, rename, or move behind the correct boundary.

Then include cleanup candidates only if they are useful and clearly labeled as candidates.

End with a short "Checked But Kept" section when something looked suspicious but was intentionally retained, especially dynamic registrations, public exports, or downstream-facing APIs.

Keep the report tight. This skill is for actionable cleanup, not an inventory of every possible smell.

## Common Pitfalls

- Calling code dead after only one search. Check exports, registrations, tests, generated references, framework conventions, and downstream usage when relevant.
- Refactoring for beauty rather than reducing real maintenance risk.
- Abstracting too early. A two-use helper can still be worse than two clear local implementations.
- Treating tool output as truth. Static tools are excellent scouts and mediocre judges.
- Expanding the audit into unrelated historical debt. The first pass should focus on residue introduced or exposed by the implementation diff.
- Ignoring tests and docs. Dead tests, stale fixtures, obsolete docs, and unused config are part of code health too.
- Treating RudderStack as optional observability only. If a change adds tracked product behavior, missing or stale analytics coverage is code health residue.
