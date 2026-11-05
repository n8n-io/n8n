---
title: Scheduling and waiting
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
---

# Scheduling and waiting

Read this when you touch the Schedule Trigger, pollers, system tasks, the durable scheduler, the Wait node, or resume URLs.

## What it is

**Scheduling** is how n8n fires time-based work. This covers Schedule Trigger nodes, poll triggers that check an external source on an interval, and **system tasks** such as pruning and license renewal.

Two schedulers exist. The **in-memory scheduler** keeps timers in the leader's memory. The **durable scheduler**, the `@n8n/scheduler` package plus its host in `packages/cli/src/scheduling`, writes each upcoming run to the database first. Any main can then claim and run it.

**Waiting** is the sibling concern. An execution pauses on a Wait node, a Form node, or a send-and-wait operation. n8n saves it with a `waitTill` timestamp. It resumes later by time, or by an HTTP call to a resume URL.

## Why it has this shape

**The in-memory scheduler loses fires.** Timers on one leader stop when that leader stops. A fire that comes due during a restart or a leader change is lost. The durable scheduler fixes this by recording runs in the database before they are due.

**The durable scheduler is leaderless.** `@n8n/scheduler` runs four loops on every main. The **materializer** turns due `scheduled_job` rules into `scheduled_task` rows inside a lookahead window. The **executor** claims due tasks with a lease and calls the handler for the task type. The **reaper** requeues tasks whose lease expired. The **retention** loop deletes finished rows. The class comment on `DurableScheduler` says that claiming makes concurrent mains safe.

**At least once, then deduplicated.** A task can run again after a crash. Therefore `ScheduleTriggerTaskHandler` starts the execution with a **deduplication key**, the job id plus the scheduled time. A partial unique index on `execution_entity.deduplicationKey` stops a second execution.

**Short waits stay in process.** `putExecutionToWait` sleeps in memory when the wait is shorter than `MAX_IN_PROCESS_WAIT_MS`, 65 seconds, and the node takes no resume request. A code comment says the tracker polls too slowly to promise an on-time resume. Longer waits go to the database. The leader's `WaitTracker` polls once a minute for executions due in the next 70 seconds and arms a timer for each. The resume is a conditional update, so two processes cannot resume the same execution.

**Resume URLs are signed.** `WaitingWebhooks` and `WaitingForms` check a resume token or an HMAC signature. They reject executions that are running or finished.

## What still runs only on the leader

The durable scheduler and the workflow publication service are both on by default. Schedule Trigger nodes therefore fire from the durable scheduler on any main. These still run only on the leader:

- `WaitTracker`, for time-based resumes.
- Activation of non-webhook triggers. The publication outbox consumer runs on the leader.
- Poll triggers. They move to the durable scheduler only when `N8N_SCHEDULER_POLL_TRIGGERS_ENABLED` is on, which is off by default.
- System tasks with `scope: 'cluster'`. They run on the leader's timer unless `N8N_SCHEDULER_SYSTEM_TASKS_ENABLED` is on, which is off by default.
- The legacy `ScheduledTaskManager`, which refuses to register a timer on a follower.

New periodic work must be a system task. The ESLint rule `no-on-leader-takeover` rejects `@OnLeaderTakeover` outside an allowlist. The allowlist is for services that hold live resources on the leader, such as webhooks, pollers, and sockets.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Scheduler loops | `packages/@n8n/scheduler/src/core/factory.ts` | `createScheduler` |
| Host adapter | `packages/cli/src/scheduling/durable-scheduler.ts` | `DurableScheduler` |
| Rules to rows | `packages/cli/src/scheduling/durable-job-provisioner.ts` | `DurableJobProvisioner` |
| Schedule Trigger capture | `packages/cli/src/scheduling/schedule-trigger-node/schedule-trigger-job-registrar.ts` | `ScheduleTriggerJobRegistrar.interceptsNode` |
| Schedule Trigger fire | `packages/cli/src/scheduling/schedule-trigger-node/schedule-trigger-task-handler.ts` | `ScheduleTriggerTaskHandler` |
| System tasks | `packages/cli/src/scheduling/system-tasks/system-task-runner.ts` | `SystemTaskRunner` |
| Main system task list | `packages/cli/src/scheduling/system-tasks/main-system-tasks.ts` | `mainSystemTasks` |
| In-memory cron | `packages/core/src/execution-engine/scheduled-task-manager.ts` | `ScheduledTaskManager.register` |
| Time-based resumes | `packages/cli/src/wait-tracker.ts` | `WaitTracker` |
| Resume URLs | `packages/cli/src/webhooks/waiting-webhooks.ts` | `WaitingWebhooks` |

## What is moving

- `N8N_SCHEDULER_ENABLED` is deprecated. The in-memory scheduler goes away in a future version.
- Poll triggers and cluster system tasks move to the durable scheduler behind their own flags.
- The durable scheduler does not handle Wait node resumes yet.
- The scheduler README lists a standalone scheduler worker as an idea to explore.

## Read more

- `packages/@n8n/scheduler/README.md`, the main design document
- `packages/cli/src/scheduling/system-tasks/README.md`, how to write a system task
- [Life of a webhook execution](../life-of-a-webhook-execution.md) for the waiting variant
- [Legacy and new](../legacy-and-new.md#scheduling)
- [Scaling and multi-main](scaling-and-multi-main.md) for leader election
