---
title: Coordination
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: ivov
---

# Coordination

[How n8n runs](how-n8n-runs.md) explained why n8n has mains, workers, webhook processes, and a leader. This page explains how these processes talk, how they agree on work that must run once, and what can go wrong between them.

## Channels

> **Pubsub does nothing in regular mode, because no other process exists.** Test pubsub code in queue mode.

In queue mode, the processes talk through Redis in two ways.

The first is the job queue. Besides the jobs, it carries messages about one job: the response of a webhook execution, and the end of the job. Every main and webhook process receives these messages. Only the process that holds the open request for that execution acts on them. With worker pools (`feat:workerPools`), the jobs of a project go to a named queue, and only the workers of that pool take them.

The second is **pubsub**, for commands to every process. A main publishes a command such as "reload the license" or "this workflow was published" on a commands channel. Workers answer on a channel of their own. A service handles a command with a method decorated with `@OnPubSubEvent`.

n8n merges a burst of the same command into one message, unless the command opts out. A command that expects an answer must opt out.

About half of the commands serve AI features. They relay the events of agents and the n8n Assistant between mains, because each browser connects to only one main.

## Leader

Multi-main needs `feat:multipleMainInstances`. Without it, a main in multi-main fails at startup. A follower first checks again for about a minute, because the leader may not have saved the certificate yet.

The leader holds a key in Redis with a short expiry, and it renews the key while it runs. When the leader stops cleanly, it deletes the key, and another main takes over within a few seconds. When the leader crashes, the others wait until the key expires.

A service reacts to a change of role with methods decorated with `@OnLeaderTakeover` and `@OnLeaderStepdown`. The role can change at any time, so code checks the role when it runs, not only at startup.

These are examples of tasks that run only on the leader:

- The publication outbox, and the triggers that poll or hold a connection.
- The resume of waiting executions.
- Queue recovery, which marks executions without a job as `crashed`.
- Agent chat integrations that n8n must poll or hold open, and agent schedules.

A leader that loses its connection to Redis keeps its role for a short time. Two mains can then both act as the leader. Locks in n8n are leases with an expiry, and code must stay correct when two holders overlap.

## Run once

> **Two processes can try to start or resume the same run.** Let the database pick one winner, as these cases do.

- **Webhooks:** `webhook_entity` has the path and the method as its key. Two publications on two mains therefore cannot both take one URL.
- **Schedules:** the new scheduler writes each coming run to the database, and every main claims due runs with a lease. A restart loses nothing, but after a crash a run can happen twice. A Schedule Trigger therefore starts its execution with a key made of the job and the planned time, and a unique index stops the second execution. The old scheduler kept its timers in the memory of the leader, and it lost the runs that came due during a restart.
- **Waits:** the leader resumes a waiting execution with a conditional update, so two processes never resume the same one. A resume URL carries a token or a signature, and n8n checks it. n8n also refuses a call for an execution that runs or has finished.

`packages/@n8n/scheduler/README.md` explains the new scheduler.

## System tasks

A **system task** is a periodic job of n8n itself, such as the deletion of old executions or the renewal of the license. A task declares if it runs on each process or once for the cluster, and how often. n8n then decides where it runs: on a timer, on the leader, or on the [new scheduler](#run-once). The task code stays the same when that decision changes.

All new periodic work must be a system task. A leader hook is only for a service that holds a live resource, such as a socket. As work moves to the new scheduler, the list of leader tasks above gets shorter. `packages/cli/src/scheduling/system-tasks/README.md` shows how to write a task.

## Concurrency

In regular mode, an operator can limit how many production executions run at once. Executions over the limit wait with the status `new`, and their HTTP requests stay open. In queue mode this limit is off. The number of jobs that each worker takes at once limits the work instead.

## Quiz

1. You test a new pubsub command on your laptop in regular mode, and nothing happens. Why?
   - A. Pubsub needs a license.
   - B. A pubsub command does nothing in regular mode. Test it in queue mode.
   - C. Pubsub commands reach only workers.
   - D. The command needs a restart to register.
2. The new scheduler can start a Schedule Trigger twice after a crash. What stops the second execution?
   - A. A unique index on a key made of the job and the planned time.
   - B. The leader, which checks every run.
   - C. A lock that the scheduler holds in memory.
   - D. Nothing. Users must make their workflows safe to run twice.
3. You add work that runs every night, once for the cluster. How do you write it?
   - A. As a timer in a method with `@OnLeaderTakeover`.
   - B. As a timer in the constructor of a service.
   - C. As a Schedule Trigger in a hidden workflow.
   - D. As a system task.
4. A leader loses its connection to Redis for a short time. What can happen?
   - A. The leader stops at once, and no main leads.
   - B. Two mains can both act as the leader. Code must stay correct when two lease holders overlap.
   - C. Workers take over the leader tasks.
   - D. Nothing. Redis keeps the old leader until it returns.

<details>
<summary>Answers</summary>

1. B. In regular mode, no other process exists to receive the command.
2. A. The execution starts with that key, and the index refuses a second one.
3. D. All new periodic work is a system task. n8n decides where it runs, and the code stays the same.
4. B. Locks in n8n are leases with an expiry, and two holders can overlap.

</details>

To try this setup on your laptop, follow [Run queue mode locally](how-to/run-queue-mode-locally.md).
