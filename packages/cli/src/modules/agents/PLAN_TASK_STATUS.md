# Plan task status

Each task has one source of status. A parent-run task stores its status and
timestamps in the plan. A delegated task stores one owning job ID. A group
calculates its status from its children.

`agent-plan-state.ts` calculates the current view. Plan reads, dependency
checks, delegation, and continuation use this calculation. Job transitions do
not update the plan document or its revision. Revisions track plan edits and
job bindings.

| Job status | Task status |
| --- | --- |
| `running` | `in_progress` |
| `suspended` for approval | `in_progress` |
| `suspended` for a resume reservation | `paused` |
| `paused` | `paused` |
| `completed` | `done` |
| `failed` | `failed` |
| `cancelled` | `cancelled` |

Groups use this priority: `in_progress`, `paused`, `pending`, `failed`,
`cancelled`, then `done`. Empty groups stay `pending`. A successful fallback
replaces its original task in this calculation.

The parent can change titles and result summaries after completion. It cannot
override the status of a delegated task. Further delegated work needs a new
task. The parent still uses `update_plan` for work that it does itself.

`AgentPlanRepository` owns plan persistence. `AgentPlanService` validates
edits and returns the calculated view. The current-plan GET routes use the
existing project and thread access checks.

## Development upgrade

Plan format 2 replaces the unreleased format 1. The irreversible
`ResetAgentPlansForJobStatus1793024571925` migration deletes old plans and their
revision history. It clears their job links and plan references in Stop and
checkpoint metadata. It preserves chat messages, executions, jobs, outcomes,
and unrelated checkpoint data.

Stop the development instance before the upgrade. Upgrade all application
processes together. Do not run mixed versions against the same database.
Existing conversations can create new plans after the upgrade. The chat card
must use the current-plan endpoint, because historical tool results can still
contain deleted plans.
