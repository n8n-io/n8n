# Community PR Readiness Check — triage label flow

A PR should carry **exactly one** `triage:<state>` label at any time. The skill drives the PR through this state machine.

## States

| State                  | Meaning                                                                |
|------------------------|------------------------------------------------------------------------|
| `triage:pending`       | Auto-applied by n8n-assistant when the PR opens. Skill removes it.     |
| `triage:in-progress`   | Skill is actively reviewing. Set in step 2, replaced before exit.      |
| `triage:complete`      | PR has been triaged to a team (or closed). Terminal.                   |
| `triage:needs-info`    | Comment posted; contributor needs to address something non-test.       |
| `triage:tests-needed`  | Comment posted; contributor needs to add tests (priority over info).   |

## Transitions

### Skill entry (step 2)

Before transitioning, **check for an existing `triage:in-progress` label**. If present, another reviewer is mid-triage — bail out without touching labels, Linear, or comments. This prevents two parallel runs from double-processing the same PR.

Strip any existing `triage:*` state label before adding `triage:in-progress`, so the single-state invariant holds even when re-reviewing a PR that was previously sent back with `triage:needs-info` or `triage:tests-needed`:

```bash
gh pr edit <number> --repo n8n-io/n8n \
  --remove-label "triage:pending" \
  --remove-label "triage:needs-info" \
  --remove-label "triage:tests-needed" \
  --remove-label "triage:complete" \
  --add-label "triage:in-progress"
```

Only one of those `triage:*` labels will actually be present; `--remove-label` errors when a label is missing, so run each removal as its own call (or batch and ignore errors) and then do the add.

### Skill exit — branch by outcome

#### Triaged to a team (action path 7B)

```bash
gh pr edit <number> --repo n8n-io/n8n \
  --remove-label "triage:in-progress" \
  --remove-label "status:pending-assignment" \
  --add-label "team:<slug>" \
  --add-label "status:team-assigned" \
  --add-label "triage:complete"
```

The `team:<slug>` is taken from `reference/teams.md`. Apply only after the Linear `save_issue` call succeeds — if Linear fails, leave the PR on `triage:in-progress` for the next loop run. `status:pending-assignment` may not be present (e.g. older PRs that predate the convention) — if `--remove-label` errors, drop the flag and retry, or run it as a separate call.

#### Closed (action path 7D)

```bash
gh pr edit <number> --repo n8n-io/n8n \
  --remove-label "triage:in-progress" \
  --remove-label "status:pending-assignment" \
  --add-label "status:internal-closed" \
  --add-label "triage:complete"
```

Apply alongside `gh pr close <number>` and the close-comment template (see SKILL.md). If the PR is already closed (`gh pr close` reports "already closed"), still apply the labels and the Linear cancellation.

#### Comment posted, contributor must act (action path 7C)

Pick **one** terminal label using this priority:

| Condition                                                              | Label                  |
|------------------------------------------------------------------------|------------------------|
| `TestsNeeded === true` **and** `TestsIncluded === false`               | `triage:tests-needed`  |
| Any other failing check (`CLA`, `Title`, `Description`, `CubicIssues`) | `triage:needs-info`    |

When both conditions hold, `triage:tests-needed` wins — it's the more specific signal and the comment already covers everything else.

```bash
gh pr edit <number> --repo n8n-io/n8n \
  --remove-label "triage:in-progress" \
  --add-label "triage:tests-needed"   # or triage:needs-info
```

#### Skill aborted before posting

If the user picks `Skip` at the "post this comment?" prompt, leave the PR on `triage:in-progress` — don't apply a terminal label without an accompanying contributor message. The next loop run will pick it up.

## status:* labels

These are independent of the triage state and signal where the PR sits in the n8n internal flow:

| Label                       | Applied when                                       |
|-----------------------------|----------------------------------------------------|
| `status:team-assigned`      | PR triaged to a Linear team (path 7B).             |
| `status:internal-closed`    | PR closed via path 7D.                             |
| `status:pending-assignment` | Default before the skill runs (set elsewhere).     |

The skill writes `status:team-assigned` (path 7B) or `status:internal-closed` (path 7D) and clears `status:pending-assignment` at the same time, so a triaged or closed PR drops out of any `status:pending-assignment` queue. It does not touch other `status:*` labels — reconciliation between team-assigned/internal-closed happens elsewhere if needed.
