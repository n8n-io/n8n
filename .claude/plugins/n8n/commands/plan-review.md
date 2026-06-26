---
description: Multi-discipline parallel sub-agent review of an n8n implementation plan (accepts a plan file path or description)
---

Run a multi-discipline review of the plan in **$ARGUMENTS** by fanning out specialized `n8n:autodev-*` sub-agents in parallel, then synthesizing their findings. This is the `n8n:dev-flow` plan-review phase, run standalone.

## READ-ONLY

This command reviews a plan only. Never modify the plan, the code, or any git state, and never open or touch a PR. The sole output is the synthesized review — act only if I explicitly ask afterward.

## Step 1 — Locate the plan

`$ARGUMENTS` may be a path to a plan file or a freeform plan/description.
- If it's a path, read that file.
- If it's prose, treat it as the plan.
- If empty, look for the dev-flow plan (`.claude/plans/*.md` — newest, or the one named for the current branch/ticket) and use it. If none is found, ask me rather than guessing.

State which plan you're reviewing before continuing.

## Step 2 — Fan out reviewers (parallel)

Dispatch these sub-agents **in a single message** so they run concurrently. Give each the full plan text plus repo context. Each returns findings tagged `[BLOCKER]` / `[MAJOR]` / `[MINOR]` with a concrete suggestion to the plan. Always run the first four; add the fifth only when the plan touches frontend code (`.vue`, `packages/frontend/**`, `editor-ui`, or `@n8n/design-system`):

- **`n8n:autodev-plan-reviewer`** (lead) — correctness & completeness: does the plan satisfy the ticket and every acceptance criterion, with a sound approach, the right files, and sensible ordering? Catch gaps, wrong assumptions, and missing steps before any code is written.
- **`n8n:autodev-architecture-reviewer`** (fallback `architecture-auditor`) — structure, boundaries, coupling, data flow, fit with the existing n8n design.
- **`n8n:autodev-security-reviewer`** (fallback `security-auditor`) — security implications of the planned approach: input handling, authn/authz, secrets, injection / SSRF / path-traversal surface, dependency risk, data exposure.
- **`n8n:autodev-test-reviewer`** (fallback `expert-test-developer`) — is the test strategy adequate? Name the high-value cases it must cover; flag any plan to under-test risky logic or to lean on meaningless tests.
- **`n8n:autodev-vue-reviewer`** *(frontend plans only)* (fallback `expert-vue3-developer` + the `n8n:design-system` skill) — Vue 3 + Pinia approach, design-system & i18n conventions, a11y. Skip on backend-only plans and note it.
- **Simplicity / YAGNI (ponytail)** — judge whether the planned approach is over-engineered: speculative abstractions, needless configurability/flexibility, layers or patterns the ticket doesn't require, error handling for impossible cases. The simplest approach that satisfies the ticket and every AC wins — recommend cutting anything beyond that, tagged `[MINOR]`–`[MAJOR]`. (No `/ponytail-review` here — there's no code yet; this is a judgment on the plan.)

(The conventions reviewer is diff-only — not run against a plan.)

Add an **independent second-opinion pass** over the plan when available (e.g. `codex`), folded in as another lens — verify its points rather than accepting them blindly.

## Step 3 — Synthesize

1. **Verdict** — one line: ready-to-implement / revise-first / major-rethink, plus the single most important reason.
2. **`[BLOCKER]` & `[MAJOR]`** — deduplicated across lenses, each with discipline tag and a concrete fix to the plan.
3. **`[MINOR]`** — grouped, terse.
4. **Coverage note** — which lenses ran, which were skipped and why.

Deduplicate overlapping findings and resolve contradictions, flagging any unresolved. Output the synthesis as your final message. Don't modify the plan or anything else unless I explicitly ask.
