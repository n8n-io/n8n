---
title: Triggers
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: looorent
---

# Triggers

A workflow starts when a webhook gets a call, a schedule comes due, or a poller finds new data. A trigger with an open connection can also start it when a message arrives. A paused workflow continues at a time or on a call to a URL. This page explains the parts of the backend that make these things happen on time and only once. Read it before you change a trigger, a wait, or any work that runs on a timer.

## Webhooks

[Workflow execution](../workflow-execution.md) followed one webhook call. Four kinds of webhook share that handler. Production webhooks belong to published workflows, and the editor listens on test webhooks. Waiting webhooks resume a paused execution, and forms collect input from people.

The table `webhook_entity` has the path and the method as its key. That key is what stops two workflows from owning the same URL, also when the two publications arrive on two mains at the same time.

## Schedulers

The old scheduler keeps timers in the memory of the leader. It loses a run that comes due while the leader restarts or while leadership moves.

The new scheduler writes each coming run to the database before it is due. Every main checks for due runs and claims them with a lease, so no leader is necessary, and a restart loses nothing. The price is that a run can happen twice after a crash. A Schedule Trigger therefore starts its execution with a key made of the job and the planned time. A unique index on that key stops the second execution.

The two schedulers share the work today:

| Work | Scheduler |
|---|---|
| Schedule Trigger nodes | The new scheduler |
| System tasks that each process runs for itself | A timer in each process |
| System tasks that run once for the cluster, such as the deletion of old executions | The leader, unless `N8N_SCHEDULER_SYSTEM_TASKS_ENABLED=true` |
| Poll triggers | The leader, unless `N8N_SCHEDULER_POLL_TRIGGERS_ENABLED=true` |
| Agent schedules | The leader |

## System tasks

A **system task** is a periodic job of n8n itself, such as the deletion of old executions or the renewal of the license. A task declares if it runs on each process or once for the cluster, and how often. The task runner then decides where it runs: on a timer, on the leader, or on the new scheduler. The task code stays the same when that decision changes.

All new periodic work must be a system task. A lint rule stops new leader hooks that start timers. A leader hook is only for a service that holds a live resource, such as a socket. `packages/cli/src/scheduling/system-tasks/README.md` shows how to write a task.

## Waiting

A **Wait** node, a form, or a step that waits for a human answer pauses an execution. n8n saves the execution with the time to continue.

A wait of less than 65 seconds that has no resume URL sleeps in the process. A longer wait goes to the database. Once a minute, the leader looks for executions that come due soon and sets a timer for each. It resumes an execution with a conditional update, so two processes never resume the same one.

A resume URL carries a token or a signature, and n8n checks it. n8n also refuses a call for an execution that runs or has finished. The new scheduler does not handle waits yet.

`packages/@n8n/scheduler/README.md` explains the design of the new scheduler.

## Quiz

1. Two mains publish two workflows with the same webhook path at the same moment. What stops both from owning the URL?
   - A. A lock in Redis around each publication.
   - B. The key of `webhook_entity`, which is the path and the method.
   - C. The leader, which compares the paths in memory.
   - D. Nothing. The last publication wins.
2. The new scheduler can run a Schedule Trigger twice after a crash. What stops the second execution?
   - A. A unique index on a key made of the job and the planned time.
   - B. The leader, which checks every run.
   - C. A lock that the scheduler holds in memory.
   - D. Nothing. Users must make their workflows safe to run twice.
3. You add work that runs every night. How do you write it?
   - A. As a timer in a leader hook.
   - B. As a timer in the constructor of a service.
   - C. As a Schedule Trigger in a hidden workflow.
   - D. As a system task.
4. A Wait node waits for 30 seconds and has no resume URL. Where does it wait?
   - A. In the database, like every wait.
   - B. In the new scheduler.
   - C. In the process, because it is shorter than 65 seconds.
   - D. In Redis.

<details>
<summary>Answers</summary>

1. B. The key of `webhook_entity`, which is the path and the method. The table key refuses a second row with the same path and method.
2. A. A unique index on a key made of the job and the planned time. The execution starts with that key, and the index refuses a second one.
3. D. As a system task. All new periodic work is a system task. A lint rule stops new leader hooks that start timers.
4. C. In the process, because it is shorter than 65 seconds. A shorter wait sleeps in the process. A longer wait goes to the database, and the leader resumes it.

</details>
