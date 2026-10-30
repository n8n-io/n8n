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
`ResetAgentPlansForJobStatus1793353273511` migration deletes old plans and their
revision history. It clears their job links and plan references in Stop and
checkpoint metadata. It preserves chat messages, executions, jobs, outcomes,
and unrelated checkpoint data.

Stop the development instance before the upgrade. Upgrade all application
processes together. Do not run mixed versions against the same database.
Existing conversations can create new plans after the upgrade. The chat card
must use the current-plan endpoint, because historical tool results can still
contain deleted plans.

## Stop and Continue

Stop captures the current executions and jobs. It pauses unfinished parent-run
tasks. Delegated task status follows the owning job. Continue selects tasks
whose prerequisites are ready. A paused sub-agent resumes the same job. A
cancelled workflow needs a new task and job.

The Stop acknowledgement uses the existing message queue. It starts after the
captured work stops and the parent turn ends. The execution record keeps the
acknowledgement ID, so chat history can show the reply and its trace.

Stop is best effort. It does not fence work that starts after capture. It does
not guarantee recovery across an instance restart. A running tool can delay a
pause until the runtime reaches its next pause check.
