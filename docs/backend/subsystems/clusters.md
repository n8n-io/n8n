---
title: Clusters
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: ivov
---

# Clusters

[How n8n runs](../how-n8n-runs.md) explained why n8n has mains, workers, webhook processes, and a leader. This page explains how they start, how they talk, and what can go wrong between them. Read it before you write code that runs on more than one process, or that must run once in a cluster.

## Startup

Every role uses the same `n8n` binary. The first argument selects the command: `start` for a main, `worker`, or `webhook`. Other commands, such as `export:workflow`, do one job and exit.

All three roles start the same way, so that they agree on nodes, tables, and identity. Each one loads its configuration, then the modules, then connects to the database and runs the pending migrations. A worker migrates too. Then it loads the nodes and credentials, and starts its role. On PostgreSQL, a lock lets only one process migrate at a time, so processes that start together wait for each other.

Each process has a **host id** of its own. The **instance id** is the same for every process of one deployment. When a process stops, n8n runs the shutdown handlers of its services in order of priority. A worker waits for its running jobs before it exits, up to a timeout.

## Channels

In queue mode, the processes talk through Redis in two ways.

The first is the job queue. Besides the jobs, it carries messages about one job: the response of a webhook execution, and the end of the job. Every main and webhook process receives these messages. Only the process that holds the open request for that execution acts on them.

The second is **pubsub**, for commands to every process. A main publishes a command such as "reload the license" or "this workflow was published" on the channel `n8n:n8n.commands`. Workers answer on `n8n:n8n.worker-response`. A service handles a command with a method decorated with `@OnPubSubEvent`.

Pubsub has two surprises. A pubsub command does nothing in regular mode, because no other process exists. Test pubsub code in queue mode. And n8n merges a burst of the same command into one message, unless the command opts out. A request that expects an answer must opt out.

About half of the commands serve AI features. They relay the events of agents and the Assistant between mains, because each browser connects to only one main.

## Leader

The leader holds the key `n8n:main_instance_leader` in Redis. The key expires after 10 seconds, and the leader renews it every 3 seconds. When the leader stops cleanly, it deletes the key, and another main takes over within a few seconds. When the leader crashes, the others wait until the key expires.

A service reacts to a change of role with methods decorated with `@OnLeaderTakeover` and `@OnLeaderStepdown`. The role can change at any time, so code checks the role when it runs, not only at startup.

These tasks still run only on the leader:

- The publication outbox, and the triggers that poll or hold a connection.
- The resume of waiting executions.
- Queue recovery, which marks executions without a job as `crashed`.
- Agent channels that n8n must poll or hold open, and agent schedules.

The list gets shorter as work moves to the scheduler in the database. New periodic work is a **system task**, which that scheduler runs. A lint rule stops new leader hooks for this kind of work. [Triggers](triggers.md) explains system tasks.

A leader that loses its connection to Redis keeps its role for a short time. Two mains can then both act as the leader. Locks in n8n are leases with an expiry, and code must stay correct when two holders overlap.

## AI work

Agent turns and the Assistant run on mains only. Messages from chat platforms also arrive on a main, because their route is a REST route, and webhook processes serve no REST routes. A workflow that an agent calls as a tool still runs on a worker in queue mode.

## Concurrency

In regular mode, an operator can limit how many production executions run at once. Executions over the limit wait with the status `new`, and their HTTP requests stay open. In queue mode this limit is off. The number of jobs that each worker takes at once limits the work instead.

## Quiz

1. You test a new pubsub command on your laptop in regular mode, and nothing happens. Why?
   - A. Pubsub needs a license.
   - B. A pubsub command does nothing in regular mode. Test it in queue mode.
   - C. Pubsub commands reach only workers.
   - D. The command needs a restart to register.
2. Your command expects an answer from each worker. What must it do?
   - A. Opt out of the merge of bursts.
   - B. Use the job queue in place of pubsub.
   - C. Run only on the leader.
   - D. Nothing. Pubsub sends each command separately.
3. The leader crashes. How soon does another main take over?
   - A. At once, because the leader deletes its key.
   - B. After an operator restarts a main.
   - C. Never, until the old leader comes back.
   - D. When the key in Redis expires, after up to 10 seconds.
4. Your service runs work only on the leader. When must it check the role?
   - A. Once, at startup.
   - B. Only after a restart.
   - C. Each time the work runs, because the role can change at any time.
   - D. Never. The leader hook handles it.
5. A leader loses its connection to Redis for a short time. What can happen?
   - A. The leader stops at once, and no main leads.
   - B. Two mains can both act as the leader. Code must stay correct when two lease holders overlap.
   - C. Workers take over the leader tasks.
   - D. Nothing. Redis keeps the old leader until it returns.

<details>
<summary>Answers</summary>

1. B. In regular mode, no other process exists to receive the command.
2. A. n8n merges a burst of the same command into one message, unless the command opts out.
3. D. A leader that stops cleanly deletes the key. A leader that crashes cannot, so the others wait for the expiry.
4. C. Use `@OnLeaderTakeover` and `@OnLeaderStepdown`, and check the role when the code runs.
5. B. Locks in n8n are leases with an expiry, and two holders can overlap.

</details>

To try this setup on your laptop, follow [Run queue mode locally](../how-to/run-queue-mode-locally.md).
