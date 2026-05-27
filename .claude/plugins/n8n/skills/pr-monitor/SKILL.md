---
name: n8n:pr-monitor
description: >-
  Monitors an open n8n PR in a self-paced polling loop. Auto-fixes trivial CI
  failures (lint/format, missing imports, obvious type narrowings) and trivial
  cubic-dev-ai comments (typos, naming, dead code), restarts flaky e2e tests up
  to 2 times, and re-queues PRs evicted from the merge queue for unrelated
  reasons. Asks for confirmation before touching anything non-trivial. Use when
  the user says /n8n:pr-monitor, asks to monitor / watch / babysit a PR, or
  wants automated PR maintenance after opening a PR.
allowed-tools: Bash(gh:*), Bash(git:*), Bash(pnpm:*), Bash(jq:*), Bash(mkdir:*), Bash(rm:*), Bash(date:*), Bash(pushd:*), Bash(popd:*), Read, Edit, Write, ScheduleWakeup
---

# PR Monitor

Watches an open PR and performs trusted maintenance silently; asks before anything risky. Designed to run continuously under `/loop` dynamic mode.

## How to invoke

- **Continuous (intended):** `/loop /n8n:pr-monitor [pr-number]` — the model self-paces via `ScheduleWakeup`.
- **One-shot:** `/n8n:pr-monitor [pr-number]` — single cycle, no rescheduling.

`pr-number` defaults to the PR for the current branch.

## Prerequisites

- `gh` authenticated against `n8n-io/n8n`
- An open PR for the current branch, or PR number passed as arg
- Repo `master` reachable (`git fetch origin` may be needed)

## State file

Path: `.claude/state/pr-monitor/pr-<number>.json`.

```json
{
  "prNumber": 0,
  "branch": "",
  "flakyRestartCount": 0,
  "processedCommentIds": [],
  "knownMergeQueueEntries": [],
  "mergeQueueReQueueCount": 0,
  "defaultMergeMethod": "squash",
  "idleCycles": 0,
  "lastCycleAt": "",
  "pendingConfirmation": null
}
```

If `pendingConfirmation` is non-null on entry, the user's latest message is the answer to it. Apply the answer, clear the field, continue the cycle.

## Cycle steps

### 1. Resolve PR and load state

```bash
PR="${1:-$(gh pr view --json number --jq .number)}"
mkdir -p .claude/state/pr-monitor
STATE=".claude/state/pr-monitor/pr-$PR.json"
[ -f "$STATE" ] || echo '{"prNumber":'"$PR"',"flakyRestartCount":0,"processedCommentIds":[],"knownMergeQueueEntries":[],"mergeQueueReQueueCount":0,"idleCycles":0,"pendingConfirmation":null}' > "$STATE"

gh pr view "$PR" --repo n8n-io/n8n \
  --json number,state,mergeable,mergeStateStatus,headRefName,headRefOid,isDraft,statusCheckRollup,reviewDecision \
  > "/tmp/pr-monitor-$PR.json"
```

If `state` is `MERGED` or `CLOSED` → notify and **stop** (do not call `ScheduleWakeup`).

### 2. Inspect CI rollup

For each failed entry in `statusCheckRollup`:

```bash
gh run view <databaseId> --log-failed | head -200
```

Classify as **trivial**, **flaky**, or **non-trivial** using [reference.md § CI classification](reference.md#ci-classification).

### 3. Fetch cubic-dev-ai comments

```bash
gh api --paginate "repos/n8n-io/n8n/pulls/$PR/comments" \
  --jq '.[] | select(.user.login == "cubic-dev-ai[bot]")
              | {id, body, path, line, html_url}'
```

Skip any `id` already in `processedCommentIds`. Classify each new comment as **trivial** or **non-trivial** using [reference.md § cubic-dev classification](reference.md#cubic-dev-classification).

### 4. Check merge queue state

```bash
gh api graphql -f query='query($pr:Int!){
  repository(owner:"n8n-io",name:"n8n"){
    pullRequest(number:$pr){ mergeQueueEntry { state position estimatedTimeToMerge } }
  }
}' -F pr="$PR"
```

Compare against `knownMergeQueueEntries`. If the PR was in the queue and is no longer there, classify the eviction using [reference.md § Merge queue](reference.md#merge-queue).

### 5. Apply actions

Always work in a fresh temp worktree — never touch the user's working tree:

```bash
WT="/tmp/pr-monitor-$PR-$(date +%s)"
git fetch origin "pull/$PR/head:pr/$PR-monitor"
git worktree add "$WT" "pr/$PR-monitor"
pushd "$WT"
# … apply fixes here …
popd
git worktree remove "$WT" --force
git branch -D "pr/$PR-monitor"
```

| Finding | Action |
|---|---|
| Trivial CI: lint/format | Run package auto-fix script → `pnpm typecheck` → commit → push |
| Trivial CI: missing import / null narrowing | Apply minimal fix → `pnpm typecheck` → commit → push |
| Flaky e2e (`n8n-playwright`, `e2e-*`) | If `flakyRestartCount < 2`: `gh run rerun <runId> --failed`. Increment. Else → escalate as non-trivial. |
| Trivial cubic-dev comment | Apply fix at `path:line` → `pnpm lint && pnpm typecheck` in the affected package → commit → push. Append comment `id` to `processedCommentIds`. |
| Non-trivial (any source) | Set `pendingConfirmation` with diagnosis + proposed patch as a `diff` block. **Do not call `ScheduleWakeup`.** Ask the user one clear question. |
| Merge queue eviction (unrelated cause) | `gh pr merge "$PR" --auto --<defaultMergeMethod>` (see reference for how to detect default). Append a fresh entry to `knownMergeQueueEntries`. |
| Nothing actionable | Increment `idleCycles`. |

**Commit format** for auto-fixes (one commit per category):

```
chore(<scope>): <one-line description> (no-changelog)

Auto-applied by /n8n:pr-monitor.
<optional: cubic-dev comment URL>
```

Always run `pnpm typecheck` in the affected package before committing. Run `pnpm lint` too unless the fix _is_ a lint auto-fix. Never `git commit --amend`. Never `git push --force`.

If typecheck or lint fails after applying a fix, revert the working tree (`git restore .` inside the worktree) and escalate that finding as non-trivial.

### 6. Persist state and decide next cycle

Write the updated state file.

Decide what to do next:

| Condition | Next action |
|---|---|
| `pendingConfirmation` set | **Stop.** Wait for user. Do not call `ScheduleWakeup`. |
| PR `MERGED` or `CLOSED` | **Stop.** |
| `idleCycles >= 3` and no checks running | **Stop.** Likely done. |
| A fix was just pushed | `ScheduleWakeup` 270s (stays in cache; we want to see new CI start) |
| Checks mid-run, no fix just pushed | `ScheduleWakeup` 1200s |
| All green, in merge queue | `ScheduleWakeup` 600s |

The `prompt` parameter passed to `ScheduleWakeup` must be: `/loop /n8n:pr-monitor <PR>` — verbatim each cycle.

## Notification format

Print exactly one block per cycle, nothing else above it:

```
PR #<num> · <state> · cycle <n>
  ✓ <auto-fixed item>
  ⟳ rerun flaky <job-name> (<count>/2)
  ↺ re-queued (unrelated CI failure on <other-pr>)
  ⏸ pending: <one-line question>
  → next check in <duration>   |   → stopped (<reason>)
```

If `pendingConfirmation` was set, follow the block with the full diagnosis and proposed patch, then a single clear question.

## See also

- [reference.md](reference.md) — classification heuristics, flaky test patterns, merge queue eviction rules
