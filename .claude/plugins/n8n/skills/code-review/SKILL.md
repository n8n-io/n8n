---
description: >-
  Reviews n8n code changes with a merge-readiness mindset. Use for code review
  requests, PR or diff reviews, and when checking whether a change is ready for
  human review.
---

# Code Review

Review the change for correctness, maintainability, and merge risk. Findings
come first and should be limited to issues the author should plausibly fix
before merging.

## Workflow

1. Identify the changed files and any provided requirement, ticket, bug report,
   or expected behavior.
2. Compare the implementation against the requirement. If no requirement is
   provided, review the diff as written; do not invent requirements.
3. Read enough surrounding code to confirm whether a concern is real.
4. Review production code, tests, fixtures, docs, generated files, and
   configuration with the same skepticism when they affect behavior or
   maintainability.
5. Make a dedicated simplicity pass for dead code, leftover paths, speculative
   abstractions, debug scaffolding, stale tests/docs, and unrelated refactors.
6. Make a telemetry pass when user-visible behavior, workflow lifecycle
   behavior, counters, surfaced settings, or business-critical state
   transitions change.
7. Report findings first, ordered by severity.

## What to Check

- **Intended behavior:** the implementation satisfies the provided requirement
  without breaking existing behavior.
- **Security:** authorization, data exposure, injection, secret handling, unsafe
  defaults, and trust-boundary issues.
- **Concurrency:** async ordering, retries, cached state, lifecycle timing,
  locks, cursors, polling, and stale-state risks.
- **Tests:** meaningful assertions cover the behavior and failure modes; tests
  would fail if the behavior regressed.
- **Simplicity:** no unused branches, imports, exports, files, fixtures, feature
  flags, compatibility shims, debug code, or abstractions without a current use.
- **Performance and reliability:** material regressions in latency, memory,
  query count, retries, error handling, logging, metrics, tracing, and
  operational debuggability.
- **API and docs:** contracts, names, comments, docs, examples, and backward
  compatibility stay aligned with the change.
- **Frontend:** i18n is used for UI text, design-system components and tokens
  are preferred, and CSS variables replace hardcoded colors or spacing.
- **RudderStack:** applicable events or counters are minimal, versioned when
  schemas change, emitted at canonical lifecycle points, and covered by tests or
  fixtures when needed.

## n8n Gotchas

- Check canonical validation and round trips when config, schema, credentials,
  tools, integrations, or saved state are normalized, serialized, saved, or
  reloaded.
- Verify missing-resource behavior for credentials, providers, capability flags,
  integrations, and optional tools. The failure should be clear at the right
  layer.
- Watch for duplicated enums, provider lists, schema conversion logic, model
  defaults, config fields, or frontend/backend copies that can drift.
- For nodes, check backward compatibility for existing workflows: renamed or
  removed parameters, changed defaults, altered output shape, and behavior
  changes for the same input.

## Output Shape

Lead with findings. For each finding include:

- Severity
- Specific file and tight line range
- Why it matters
- Concrete remediation when it is not obvious

After findings, include open questions, assumptions, or clearly labeled
non-blocking observations only if needed. If no issues are found, say that
clearly and mention any remaining test or verification gaps.
