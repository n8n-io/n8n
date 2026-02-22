---
name: reproduce-bug
description: Reproduce a bug from a Linear ticket with a failing test. Expects the full ticket context (title, description, comments) to be provided as input.
user_invocable: true
---

# Bug Reproduction Framework

Given a Linear ticket context ($ARGUMENTS), systematically reproduce the bug
with a failing regression test.

## Step 1: Parse Signals

Extract the following from the provided ticket context:
- **Error message / stack trace** (if provided)
- **Reproduction steps** (if provided)
- **Workflow JSON** (if attached)
- **Affected area** (node, execution engine, editor, API, config, etc.)
- **Version where it broke / last working version**


## Step 2: Route to Test Strategy

Based on the affected area, pick the test layer and pattern:

| Area | Test Layer | Pattern | Key Location |
|------|-----------|---------|--------------|
| Node operation | Jest unit | NodeTestHarness + nock | `packages/nodes-base/nodes/*/test/` |
| Node credential | Jest unit | jest-mock-extended | `packages/nodes-base/nodes/*/test/` |
| Trigger webhook | Jest unit | mock IHookFunctions + jest.mock GenericFunctions | `packages/nodes-base/nodes/*/test/` |
| Binary data | Jest unit | NodeTestHarness assertBinaryData | `packages/core/nodes-testing/` |
| Execution engine | Jest integration | WorkflowRunner + DI container | `packages/cli/src/__tests__/` |
| CLI / API | Jest integration | setupTestServer + supertest | `packages/cli/test/integration/` |
| Config | Jest unit | GlobalConfig + Container | `packages/@n8n/config/src/__tests__/` |
| Editor UI | Vitest | Vue Test Utils + Pinia | `packages/frontend/editor-ui/src/**/__tests__/` |
| E2E / Canvas | Playwright | Test containers + composables | `packages/testing/playwright/` |

## Step 3: Locate Source Files

Find the source code for the affected area:
1. Search for the node/service/component mentioned in the ticket
2. Find the GenericFunctions file (common bug location for nodes)
3. Check for existing test files in the same area
4. Look at recent git history on affected files (`git log --oneline -10 -- <path>`)

## Step 4: Trace the Code Path

Read the source code and trace the execution path that triggers the bug:
- Follow the call chain from entry point to the failure
- Identify the specific line(s) where the bug manifests
- Note any error handling (or lack thereof) around the bug

## Step 5: Form Hypothesis

State a clear, testable hypothesis:
- "When [input/condition], the code does [wrong thing] because [root cause]"
- Identify the exact line(s) that need to change
- Predict what the test output will show

## Step 6: Find Test Patterns

Look for existing tests in the same area:
1. Check `test/` directories near the affected code
2. Identify which mock/setup patterns they use
3. Use the same patterns for consistency
4. If no tests exist, find the closest similar node/service tests as a template

## Step 7: Write Failing Test

Write a regression test that:
- Uses the patterns found in Step 6
- Targets the specific hypothesis from Step 5
- Includes a comment referencing the ticket ID
- Asserts the CORRECT behavior (test will fail on current code)
- Also includes a "happy path" test to prove the setup works

## Step 8: Run and Score

Run the test from the package directory (e.g., `cd packages/nodes-base && pnpm test <file>`).

Classify the result:

| Confidence | Criteria | Output |
|------------|----------|--------|
| **CONFIRMED** | Test fails consistently, failure matches hypothesis | Reproduction Report |
| **LIKELY** | Test fails but failure mode differs slightly | Report + caveat |
| **UNCONFIRMED** | Cannot trigger the failure | Report: what was tried |
| **SKIPPED** | Hit a hard bailout trigger | Report: why skipped |
| **ALREADY_FIXED** | Bug no longer reproduces on current code | Report: when fixed |

## Step 9: Iterate or Bail

If UNCONFIRMED after first attempt:
- Revisit hypothesis — re-read the code path
- Try a different test approach or layer
- Maximum 3 attempts before declaring UNCONFIRMED

**Hard bailout triggers** (stop immediately):
- Requires real third-party API credentials
- Race condition / timing-dependent
- Requires specific cloud/enterprise infrastructure
- Requires manual UI interaction that can't be scripted

## Output: Reproduction Report

Present findings in this format:

---

**Ticket:** [ID] — [title]
**Confidence:** [CONFIRMED | LIKELY | UNCONFIRMED | SKIPPED | ALREADY_FIXED]

### Root Cause
[1-2 sentences explaining the bug mechanism]

### Location
| File | Lines | Issue |
|------|-------|-------|
| `path/to/file.ts` | XX-YY | Description of the problem |

### Failing Test
`path/to/test/file.test.ts` — X/Y tests fail:
1. `test name` — [failure description]

### Fix Hint
[Pseudocode or description of the fix approach]

---

## Important

- **DO NOT fix the bug** — only reproduce it with a failing test
- **Leave test files in place** as evidence (don't commit unless asked)
- **Run tests from the package directory** (e.g., `pushd packages/nodes-base && pnpm test <file> && popd`)
- **Always redirect build output**: `pnpm build > build.log 2>&1`
- **DO NOT look at existing fix PRs** — the goal is to reproduce from signals alone
