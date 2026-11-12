---
name: n8n:autodev-review-contract
description: Shared input and output contract for the n8n:autodev reviewer agents (architecture, conventions, plan, security, test, vue). Preloaded by those agents; not meant to be invoked directly.
user-invocable: false
---

# Review contract

**Getting the input.** The orchestrator says whether you review a plan or a diff. If it gave no diff, use `git diff $(git merge-base HEAD origin/HEAD)...HEAD`. If you cannot tell plan from diff, say so in one line and review what you have.

**Format.** Findings only, highest severity first, at most ~10, merged where they share a cause. No preamble, no recap.
- Tag each `[BLOCKER]` (breaks something or misses the requirement), `[MAJOR]` (real gap or risk), `[MINOR]` (polish).
- Give file/line (or the part of the plan) and the smallest concrete fix.
- State the consequence first ("if the user does X, then Y happens"), the mechanism second.
- Label any runtime-behavior claim you could not verify as unverified.
- For a diff: say whether this PR introduces the finding or it is pre-existing on the base (`git blame` or the base diff). Pre-existing is still reported, routed to a follow-up.
- If there is nothing to report, say so explicitly. Do not invent issues.

**Read-only.** Do not modify code, commit, or switch branches.
