---
title: Scaling and multi-main
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: ivov
---

# Scaling and multi-main

Read this when you touch queue mode, workers, the Bull queue, pubsub between processes, leader election, or anything that must run on exactly one main.

## What it is

**Queue mode**, `EXECUTIONS_MODE=queue`, splits n8n into main, worker, and webhook processes. They share one Redis and one database. Mains and webhook processes add executions as Bull jobs to the `jobs` queue. Workers take the jobs and run them. A separate Redis pubsub layer sends commands between processes outside the life of a job.

**Multi-main** is the licensed extension where several mains run at once. One main is the **leader**. It holds a Redis key with a time to live. Leader-only duties move between mains on `leader-takeover` and `leader-stepdown` events.

## Why it has this shape

**A job carries ids, not data.** The execution is already in the database when the main calls `addJob`. The job holds only ids and flags. A worker reloads the execution, runs it, and writes the result back. All state that matters is in the database.

**Two channels in Redis.** Bull's `global:progress` event carries messages inside a job's life, such as a webhook response or a finished job. Every main and webhook process hears every progress message, and only the process that holds the execution acts. Pubsub on `n8n:n8n.commands` carries n8n's own commands, such as a license reload or a workflow activation. Workers answer on `n8n:n8n.worker-response`. The first `n8n:` is the Redis key prefix.

**Leader handlers are decorators.** A service marks methods with `@OnLeaderTakeover` and `@OnLeaderStepdown`. `@OnPubSubEvent` filters can name an instance role. `PubSubRegistry` checks the role when the event fires, because the role can change at runtime.

**Leader election is a Redis key.** `LeaderElectionClient` sets the key with the host id, an expiry, and "only if absent". The leader renews it on an interval and steps down if another host owns it. A comment in `MultiMainSetup` accepts some inconsistency during a Redis partition and expects recovery when Redis is back.

**The leader cleans up the queue.** Some executions are `new` or `running` in the database but have no Bull job. Queue recovery marks them as `crashed`.

**Locks are leases.** `RedisLockService` holds a lock with an expiry and a renewal watchdog. A lease is an efficiency tool. Code must still be correct when two holders overlap.

## What still runs only on the leader

The durable scheduler and the workflow publication service are on by default. Schedule Trigger nodes now fire on any main. A search for `isLeader` and the two leader decorators finds these leader-only duties:

- The publication outbox consumer and reconciler, which activate non-webhook triggers and pollers.
- `ActiveWorkflowManager`, when the publication service is off.
- `WaitTracker`.
- Queue recovery in `ScalingService`.
- Cluster system tasks, while `N8N_SCHEDULER_SYSTEM_TASKS_ENABLED` is off. These include execution pruning and license renewal.
- The legacy `ScheduledTaskManager`.
- Some module services, for example chat integrations in the agents module.

The ESLint rule `no-on-leader-takeover` sends new periodic work to system tasks, so this list is meant to shrink. [Scheduling and waiting](scheduling-and-waiting.md) has the details.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Queue setup and jobs | `packages/cli/src/scaling/scaling.service.ts` | `ScalingService.addJob` |
| Run a job on a worker | `packages/cli/src/scaling/job-processor.ts` | `JobProcessor.processJob` |
| Job and channel types | `packages/cli/src/scaling/scaling.types.ts` | `JobMessage` |
| Channel names | `packages/cli/src/scaling/constants.ts` | `COMMAND_PUBSUB_CHANNEL` |
| Send a command | `packages/cli/src/scaling/pubsub/publisher.service.ts` | `Publisher.publishCommand` |
| Receive a command | `packages/cli/src/scaling/pubsub/subscriber.service.ts` | `Subscriber` |
| Bind handlers | `packages/cli/src/scaling/pubsub/pubsub.registry.ts` | `PubSubRegistry` |
| Leader election | `packages/cli/src/scaling/multi-main-setup.ee.ts` | `MultiMainSetup.init` |
| Leader key | `packages/cli/src/scaling/leader-election-client.ts` | `LeaderElectionClient` |
| Locks | `packages/cli/src/scaling/redis-lock.service.ts` | `RedisLockService` |
| Process registry | `packages/cli/src/modules/instance-registry/instance-registry.service.ts` | `InstanceRegistryService` |

## What is moving

- Worker pools are experimental, behind `N8N_WORKER_POOLS_ENABLED`. A worker with a pool name listens on its own queue, `jobs-<name>`.
- The leader-only list shrinks as cluster work moves to the durable scheduler.

## Read more

- [Life of a webhook execution](../life-of-a-webhook-execution.md) for the queue mode variant
- [Life of a workflow publish](../life-of-a-workflow-publish.md) for the multi-main variant
- [Patterns](../patterns.md) for pubsub across processes
- [Startup and process roles](startup-and-processes.md)
- [Run queue mode locally](../how-to/run-queue-mode-locally.md) for a local stack and failure drills
- docs.n8n.io: queue mode and scaling pages
