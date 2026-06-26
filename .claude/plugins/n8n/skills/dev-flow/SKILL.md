---
name: n8n:dev-flow
description: >-
  End-to-end orchestrator for developing a feature or fixing a bug in the n8n
  checkout, driven by a Linear ticket (PAY-/DEV-/ENG-XXXX). Runs the full agent loop: read the
  ticket (title, description, comments, attachments, links) → plan → planner↔reviewer consensus
  loop → implement → parallel multi-angle review (architecture, security, conventions, testing)
  → fix↔re-review loop until clean → open a PR → watch the PR (CI, review comments, bot findings)
  and re-enter the code loop on any failure until everything is green. Use this whenever the user
  wants to "develop", "implement", "build", "fix", or "ship" an n8n Linear ticket, says "run the
  n8n flow / pipeline / full cycle" on a ticket, or hands over a ticket ID and expects the whole
  dev-to-PR process handled. Prefer this over running the individual n8n skills one at a time when
  the goal is the complete ticket lifecycle.
---

# n8n Dev Flow

Orchestrates a full feature/bugfix lifecycle in the n8n monorepo, driven by a Linear ticket, as a
mostly-autonomous loop of cooperating agents. This skill is the conductor — the real work is done
by **existing** n8n repo skills/commands and specialist subagents. Your job is to run them in the
right order, carry context between phases, drive the convergence loops to a clean state, and keep
going until the PR is green.

**Skill = orchestrator, agents = workers.** This skill has no context of its own; it sequences the
flow. The heavy lifting is delegated to subagents so the work runs in parallel (the four review
lenses at once), stays context-isolated (a reviewer's large file reads never bloat this
conductor), and is genuinely independent (a reviewer that didn't write the code is more skeptical).
This plugin ships a purpose-built agent set for exactly this flow — **prefer these `n8n:autodev-*`
agents; fall back to the generic equivalents only if one isn't available:**

| Role | Preferred agent | Fallback |
|------|-----------------|----------|
| Plan | `n8n:autodev-planner` | `/n8n:plan` command |
| Plan review | `n8n:autodev-plan-reviewer` | skeptic subagent / `plan-eng-review` |
| Implement | `n8n:autodev-implementer` | `n8n:developer` agent |
| Review: architecture | `n8n:autodev-architecture-reviewer` | `architecture-auditor` |
| Review: security | `n8n:autodev-security-reviewer` | `security-auditor` |
| Review: best practices & patterns | `n8n:autodev-conventions-reviewer` | `code-reviewer` + `n8n:conventions` |
| Review: testing | `n8n:autodev-test-reviewer` | `expert-test-developer` + `/check-tests` |
| Review: frontend/Vue (only if diff touches frontend) | `n8n:autodev-vue-reviewer` | `expert-vue3-developer` + `n8n:design-system` |

Confirm availability at runtime (the Agent tool lists available agent types) and use the fallback
when a preferred agent is missing.

There is **no live browser-testing phase** — it's too environment-fragile to automate reliably.
Instead, correctness is enforced by strong automated tests plus a dedicated testing review lens
(below). Lean on those harder because there is no manual click-through.

## Why this exists

The same loop gets run by hand for every ticket: read ticket → plan → get the plan critiqued →
implement → review from several angles → fix → open PR → chase CI and bot comments. Doing it
manually means re-explaining context at each handoff and dropping steps. This skill encodes the
sequence, the agent hand-offs, and the iterate-until-clean loops so it runs as one motion.

## Prefer the repo's own skills

The repo's `.claude` directory ships skills, commands, and agents tuned to n8n conventions
(namespaced `n8n:*`). **Always prefer these over generic equivalents** — they know the monorepo
layout, PR-title CI rules, design system, etc. Discover what's available at runtime rather than
assuming a fixed list:

```bash
ls .claude/plugins/n8n/skills .claude/plugins/n8n/commands .claude/plugins/n8n/agents 2>/dev/null
```

Read a skill/command/agent file before relying on it if you're unsure what it does — they evolve.

## Setup: locate the repo, capture the ticket, start a todo list

**Locate the n8n repo once, up front, and `cd` into it — every later path is relative to it.**
Resolve the repo root in this order and `cd` there before Phase 1:

1. If the current directory is already inside an n8n checkout (`git rev-parse --show-toplevel`),
   use that.
2. Otherwise default to `~/n8n`: `cd ~/n8n && git rev-parse --show-toplevel`.
3. If neither resolves, ask the user for the repo path.

From here on, all repo paths are relative to this root (e.g. `.claude/plans/`, `packages/cli`).

The input is a Linear ticket ID (e.g. `PAY-1234`). If the user didn't give one, ask for it. The
feature branch is created at the start of Phase 3, using the name **Linear** provides (see there) —
not a hand-rolled slug, **unless this is a security fix** (see Phase 3).

Create a TodoWrite list with one item per phase so progress is visible and resumable. Track the
ticket ID — every phase references it.

## Autonomy & loop discipline

Run autonomously end-to-end. The plan is settled by **agent consensus**, not a user gate. There is
**no stop before the PR**: once the review loop is clean, open the PR automatically as **ready for
review** (not a draft) so all CI jobs run, then go straight to watching it (Phase 7).

Every loop in this skill is **bounded** to avoid spinning forever:
- Cap each convergence loop at **3 rounds** by default. The cap is per convergence attempt: a
  genuinely new finding (a fresh CI failure or a new review/bot comment in Phase 7) resets the
  counter, so a healthy PR that legitimately takes several rounds isn't escalated prematurely.
- If a loop hasn't converged after its cap — plan or implementation reviews keep finding
  `[BLOCKER]`/`[MAJOR]` issues, or CI won't go green — **stop and escalate to the user** with a
  crisp summary of what's unresolved and why. Don't loop silently or lower the bar to "pass".
- Track loop state in the todo list so the flow is resumable after an interruption.

---

## Phase 1 — Read the ticket (full context)

Invoke the repo's issue-analysis skill to gather everything about the ticket:

```
/n8n:linear-issue <TICKET-ID>
```

This pulls title, description, comments, relations (blocking/related/duplicate), linked PRs, and
any Notion/Loom/attachments/images. Critically, it runs a **mandatory `n8n-private` safety check**
— if the ticket is private and a remote points at the public `n8n-io/n8n`, it stops. Respect that
stop; do not proceed on a public remote with private work.

Keep the gathered context — every later phase consumes it. Note whether the ticket is a **feature**
or a **bug** (the implementation phase branches on it), and whether it is a **security fix** (it
changes branch/commit/test naming throughout — see Phase 3 and AGENTS.md "Security Fix Hygiene").

## Phase 2 — Plan, then planner↔reviewer consensus loop

**2a. Draft the plan** — dispatch the **`n8n:autodev-planner`** agent for the ticket; it identifies
affected packages and designs the approach per n8n conventions. Save its plan to
`.claude/plans/<TICKET-ID>.md` — this single path is the source of truth the implementer and
reviewers read from. Fallback: the `/n8n:plan <TICKET-ID>` command, which writes the same file.

**2b. Parallel multi-angle plan review loop.** Review the plan from several independent angles **in
parallel** — dispatch the subagents in a single turn so they run concurrently, each told the input
is an **implementation plan** (not a diff) and pointed at `.claude/plans/<TICKET-ID>.md`. Each
returns findings tagged `[BLOCKER]` / `[MAJOR]` / `[MINOR]` against the concrete part of the plan,
with a fix. Cover these lenses (same agents as Phase 4, in plan mode), adding the Vue lens **only
when the plan targets frontend** (`.vue`, `packages/frontend/**`, `@n8n/design-system`):

1. **Correctness & completeness** — does the plan satisfy the ticket and every AC, are affected
   files right, edge cases/migrations/compat covered, simpler alternative? (`n8n:autodev-plan-reviewer`;
   fallback skeptic subagent / `plan-eng-review`)
2. **Architecture & approach** — soundness, coupling, fit with existing patterns, over-engineering.
   (`n8n:autodev-architecture-reviewer`; fallback `architecture-auditor`)
3. **Security & risk** — does the proposed approach widen the attack surface or miss authz/validation?
   (`n8n:autodev-security-reviewer`; fallback `security-auditor`)
4. **Test strategy** — is the planned testing adequate and does it name the high-value cases?
   (`n8n:autodev-test-reviewer`; fallback `expert-test-developer`)
5. **Frontend / Vue** *(only if the plan targets frontend)* — proposed components/stores, design-system
   and i18n approach. (`n8n:autodev-vue-reviewer`; fallback `expert-vue3-developer`)

Collect and dedupe findings. Then loop: feed the `[BLOCKER]`/`[MAJOR]` items back to the planner to
revise the plan file → re-run the affected lenses → repeat until **no `[BLOCKER]` or `[MAJOR]`
findings remain** (consensus that development can start), or the 3-round cap is hit (then escalate).
Record `[MINOR]` items in the plan as known trade-offs rather than blocking on them.

The converged plan file is the source of truth for the rest of the flow.

## Phase 3 — Create the branch, then implement (bug path: reproduce first)

**3a — Create the branch.** This runs once. Linear generates a branch name for every issue (the string behind
the "Copy git branch name" button), already slugified and namespaced. Use that exact name — it
comes from the `branchName`/`gitBranchName` field fetched in Phase 1, and using it lets Linear
auto-link the PR.

> **Security fix exception (AGENTS.md):** if Phase 1 flagged this as a security fix, do **NOT** use
> the Linear branch name if it reveals the vulnerability. This is a public repo — branch names,
> commit messages, and test descriptions must not leak the attack vector. Use a neutral name that
> describes the fix (e.g. `node-1234-improve-request-handling`, not `...-fix-ssrf`). Apply the same
> neutral-language rule to commit messages and test descriptions in every later phase.

Create it off the up-to-date default branch:

```bash
git fetch origin
default=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's@^origin/@@' || echo main)
git switch -c "<branch-name>" "origin/$default"
```

If the Linear field is missing (and it's not a security fix), fall back to
`<ticket-id-lowercased>-<slugified-title>` and tell the user you used a fallback name.

**3b — Implement (bug path: reproduce first).**

**If the ticket is a bug**, first reproduce it with a failing test — invoke `n8n:reproduce-bug`
with the Phase 1 context. It picks the right test layer and writes a failing regression test. Then
implement until that test is green; the regression test stays.

Implement the converged plan with the **`n8n:autodev-implementer`** agent (it executes the plan
file at `.claude/plans/<TICKET-ID>.md` and gets the build/tests green). Fallback: the
`n8n:developer` agent. For specialized slices, the implementer should lean on the relevant repo
skills:

- `n8n:db-migrations` — schema changes under `packages/@n8n/db/src/migrations/`
- `n8n:design-system` — `.vue` work in `packages/frontend` using the design system
- `n8n:node-add-oauth` — adding OAuth2 to a node
- `n8n:protect-endpoints` — endpoint authorization/scopes
- `n8n:conventions` — general n8n standards reference

Make atomic commits as logical units complete. Follow conventions in the touched files. The plan
file is the source of truth; note any deviation. Run the relevant package test suite and get it
green before moving to review.

## Phase 4 — Parallel multi-angle review

When implementation is in a green, committed state, review the diff from several independent angles
**in parallel** — dispatch the subagents in a single turn so they run concurrently. Each returns
findings tagged `[BLOCKER]` / `[MAJOR]` / `[MINOR]` with file:line and a concrete fix. Always cover
these four lenses, and add the fifth (Vue) **only when the diff touches frontend code** — i.e. any
`.vue` file, `packages/frontend/**`, `editor-ui`, or `@n8n/design-system`. On backend-only tickets,
skip it rather than dispatch a no-op reviewer:

1. **Architecture** — structure, coupling, data flow, fit with existing design.
   (`n8n:autodev-architecture-reviewer`; fallback `architecture-auditor`)
2. **Security** — vulns, trust boundaries, input validation, authz.
   (`n8n:autodev-security-reviewer`; fallback `security-auditor`)
3. **Best practices & project patterns** — does it follow n8n conventions and the patterns already
   in this codebase? (`n8n:autodev-conventions-reviewer`; fallback `code-reviewer` + the
   `n8n:conventions` skill)
4. **Testing** — identify high-value tests that are missing, and review existing/changed tests for
   whether they actually assert behavior. (`n8n:autodev-test-reviewer`; fallback
   `expert-test-developer`. `/check-tests` is a good starting scan; for logic-heavy files,
   `n8n:mutant-score` to measure mutation coverage and `n8n:mutant-fix` to add tests that kill
   surviving mutants.)
5. **Frontend / Vue** *(only when the diff touches frontend)* — Vue 3 + Pinia reactivity, design-system
   and i18n conventions, a11y, component health. (`n8n:autodev-vue-reviewer`; fallback
   `expert-vue3-developer` + the `n8n:design-system` skill)
6. **Simplicity / over-engineering** — *if the `ponytail-review` skill is installed*, run
   `/ponytail-review` on the diff as this lens; *if it isn't available*, apply the same checklist
   inline (speculative abstractions, needless config/flexibility, error handling for impossible
   cases, code that could be inlined or deleted). Tag `[MINOR]`–`[MAJOR]` and feed valid findings
   into the fix loop.

**Always add an independent automated second-opinion pass when one is available** (e.g. `codex review`,
or a `cubic` / `/run-review` pass) as another lens — treat its findings like any other reviewer's and
verify them rather than accepting blindly. If none is available, note that and continue.

Collect all findings, dedupe across lenses (any second-opinion pass included), and triage by severity.

## Phase 5 — Fix ↔ re-review loop (until clean)

Apply fixes for the real findings (loop back into Phase 3-style implementation as needed; write the
missing high-value tests the testing lens identified). For anything you judge a false positive,
record a one-line reason rather than changing code. Keep the **ponytail bias** while fixing: the
smallest change that resolves the finding — never gold-plate or add scope in response to a review note.

After fixing, **re-run the affected review lenses** on the new diff. Repeat fix → re-review until
**no `[BLOCKER]` or `[MAJOR]` findings remain** and the package test suite is green — or the
3-round cap is hit, then escalate with the unresolved findings. Commit fixes atomically.

## Phase 6 — Open the PR (automatic, ready for review)

**No user gate** — open the PR automatically as soon as the review loop is clean. Print a one-line
summary (scope, packages touched, tests added, findings resolved) for the record, but do not wait
for approval.

Push the branch and invoke the repo's PR skill so the title passes `check-pr-title` CI:

```
/n8n:create-pr
```

Ensure the PR body links the Linear ticket. For a security fix, keep the title and body in neutral
language (no vulnerability type, no Linear slug that reveals it). Capture the PR number for the watch
phase: `pr=$(gh pr view --json number -q .number)`.

The PR must be **ready for review, not a draft**, so every configured CI job runs. If
`/n8n:create-pr` opened a draft, mark it ready immediately: `gh pr ready "$pr"`. Then proceed
directly to Phase 7.

## Phase 7 — Watch the PR, re-enter the code loop on any finding

Drive the PR to fully green using `gh` as the baseline (optional repo/personal review skills like
`/comments`, `/bot-re`, or `check-pr-comments` can help if installed, but aren't required):

1. Poll checks: `gh pr checks "$pr" --watch` and `gh pr view "$pr" --json statusCheckRollup,url` (using the `$pr` captured in Phase 6).
2. Gather feedback from all sources:
   - **CI failures** — get the failing run id from `gh pr checks "$pr"` (or `gh run list --branch "$(git branch --show-current)"`), then fetch logs (`gh run view <run-id> --log-failed`) and diagnose the root cause.
   - **Automated review/bot comments** — `gh pr view "$pr" --comments` and review threads. Fix
     valid findings; reply briefly (in the user's name, no em dashes) to ones you disagree with.
     You may resolve bot threads and your own threads once addressed.
   - **Human review comments** — surface these to the user; don't auto-resolve human feedback.
3. For any real CI failure, bug, or valid review/bot finding, **re-enter the Phase 3b → 4 → 5 code
   loop** (implement the fix — do NOT recreate the branch → multi-angle review of the fix → converge), then commit and push.
4. Repeat until all required checks are green and bot comments are resolved. Respect the loop cap:
   if CI won't go green after 3 fix rounds, stop and escalate with the failing logs.

When green, report the PR URL and a short summary across all phases. **Don't merge** — leave the
final merge to the user unless they explicitly asked you to land it.

---

## Resuming mid-flow

If invoked when work is already underway (branch exists, plan file present, PR open), infer the
current phase from git state + the todo list and continue from there rather than restarting. The
plan file at `.claude/plans/<TICKET-ID>.md` is the durable context anchor.

## When NOT to use this

- The user wants only one phase (just plan, just review, just fix CI) — invoke that skill directly.
- There's no ticket and the task is a tiny one-line fix — overkill; just do it.
