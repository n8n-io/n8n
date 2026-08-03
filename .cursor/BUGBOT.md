# Contribution Runway review guidance

Review contribution changes for scope, behavioral correctness, test strength,
and compliance with the approved ticket.

Do not duplicate formatting, linting, or type-check findings already enforced
by CI. Do not report a finding solely because an automated check may fail;
report the underlying problem and point to the affected code.

## Source of truth

For Contribution Runway changes, inspect:

- The ticket under `contrib-runway/examples/`
- `contrib-runway/policies/n8n.yaml`
- The changed implementation and test files
- The generated evidence report, when present

Treat the deterministic `contrib-runway` check and existing n8n CI commands as
the authoritative pass/fail gates. Bugbot provides an additional semantic
review; it does not replace those checks.

## Approval and ownership

Confirm that:

1. The ticket is marked `approved`.
2. Simulation tickets are marked `simulation: true`.
3. The change addresses one focused behavior.
4. The implementation does not enter a team-owned or restricted area without
   explicit owner approval recorded separately from the ticket.

A ticket must not authorize its own exception to an ownership restriction.

Restricted areas include:

- `packages/core/**`
- `packages/nodes-base/credentials/**`
- Identity or access-management code
- Team-owned high-impact nodes identified by repository policy

For a simulation ticket, flag unexpected restricted-area edits even if no real
upstream pull request will be opened.

## Change scope

Confirm that changed files are limited to the smallest reasonable change set.

Allowed supporting changes may include:

- The ticket’s implementation area
- Colocated unit tests
- Relevant workflow fixtures
- Required documentation
- Contribution evidence
- Contribution Runway policy or tests when the PR explicitly changes the tool

Flag:

- Unrelated production changes
- Broad refactoring performed alongside a focused bug fix
- Changes to shared packages without a stated reason
- Generated or formatting-only changes unrelated to the ticket

Do not confuse edit scope with context scope. Reading a file and modifying a
file are governed by different boundaries.

## n8n implementation conventions

For code under `packages/nodes-base/**`, flag newly introduced:

- `@ts-ignore`
- `@ts-expect-error`
- Generic `Error` where `NodeOperationError` or `NodeApiError` should be used
- Bare `JSON.parse` where n8n's `jsonParse` helper should be used

Apply these checks contextually. For example, do not flag every generic
`Error` or `JSON.parse` inside standalone Contribution Runway tooling when the
n8n node-specific convention does not apply.

Confirm preferred patterns preserve useful context such as:

- The failing node
- The failing item index
- The original error cause
- An actionable user-facing message

## Bug-fix testing

For bug-fix tickets, confirm that tests demonstrate:

1. The reported failure through a regression test.
2. The corrected behavior.
3. Preservation of valid existing behavior.
4. Relevant edge cases, such as empty input or multiple input items.
5. Workflow-level behavior when required by the affected n8n node.

A regression test should fail against the behavior before the fix and pass
after the fix.

Flag weak assertions that only prove execution occurred, including patterns
equivalent to:

- `expect(result).toBeDefined()`
- Assertions that do not verify the changed behavior
- Snapshot updates without a behavioral assertion
- Tests that mock away the logic being changed

Confirm manual test instructions are present when user-visible node behavior
changes.

## Compatibility and release review

Flag a missing compatibility decision when a change affects:

- Node parameters
- Parameter defaults
- Output shape
- Error behavior consumed by workflows
- Credential behavior
- Existing saved workflows
- Node or schema versioning

Do not decide compatibility or node-versioning questions without evidence.
Identify the unresolved decision and request owner review.

## Severity

Use these priorities:

- **Blocker** — unapproved work, unauthorized restricted-area edits, security
  or credential exposure, or a bug fix with no meaningful regression test.
- **Major** — behavior outside ticket scope, backward-compatibility risk,
  materially weak tests, or missing required manual verification.
- **Minor** — maintainability or clarity issue that could reasonably cause
  future defects.
- **Nit** — naming or style only.

Avoid reporting nits already handled by formatting or linting tools.

## Findings

For every actionable finding, include:

- Severity
- Concrete file and line
- The violated requirement
- Why it matters
- The smallest reasonable correction

Do not return `READY` merely because no forbidden string was found. Return
`READY` only when no actionable findings remain and clearly distinguish that
review result from the deterministic CI gate.