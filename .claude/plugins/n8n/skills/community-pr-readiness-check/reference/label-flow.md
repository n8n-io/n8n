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

```bash
gh pr edit <number> --repo n8n-io/n8n \
  --remove-label "triage:pending" \
  --add-label "triage:in-progress"
```

`triage:pending` may not be present — if `--remove-label` errors, retry the add as a separate call.

### Skill exit — branch by outcome

#### Triaged to a team (action path 7B)

```bash
gh pr edit <number> --repo n8n-io/n8n \
  --remove-label "triage:in-progress" \
  --add-label "team:<slug>" \
  --add-label "status:team-assigned" \
  --add-label "triage:complete"
```

The `team:<slug>` is taken from `reference/teams.md`. Apply only after the Linear `save_issue` call succeeds — if Linear fails, leave the PR on `triage:in-progress` for the next loop run.

#### Closed (action path 7D)

```bash
gh pr edit <number> --repo n8n-io/n8n \
  --remove-label "triage:in-progress" \
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

The skill only writes `status:team-assigned` and `status:internal-closed`. It does not remove existing `status:*` labels — GitHub's label model accepts multiple statuses; reconciliation happens elsewhere if needed.
