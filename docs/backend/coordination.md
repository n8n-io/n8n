---
title: Coordination
last_reviewed: 2026-11-06
contact: ivov
---

# Coordination

[How n8n runs](how-n8n-runs.md) explained why n8n has mains, workers, webhook processes, and a leader. This page explains how these processes talk to each other, and how they agree on who does work that must run once.

## Channels

In queue mode, the processes talk to each other over Redis pubsub, through two separate systems:

- **Bull pubsub:** A worker reports on a job, e.g. a webhook response. Only the process that holds the open request acts on the report.
- **n8n pubsub:** A main publishes a command to every process, e.g. "reload the license". Workers answer on a channel of their own. A service handles a command with a method that has `@OnPubSubEvent`.

With worker pools, the jobs of a project go to a named queue, and only the workers of that pool dequeue them.

n8n pubsub also relays push messages to the main that holds the browser tab. [Live updates](apis.md#live-updates) explains push.

## Leader

[How n8n runs](how-n8n-runs.md) explained how the mains pick a leader. The leader raises three questions for your code:

- **Where does my work run?** Work that must run only once in the cluster runs on the leader, e.g. polling triggers and the resume of waiting executions. For new periodic work, write a [system task](#system-tasks) instead, and n8n picks where the task runs.
- **When does the role change?** At any time. Check the role at each action, and react to a change with `@OnLeaderTakeover` and `@OnLeaderStepdown`.
- **Can two leaders coexist?** Yes. If the leader loses Redis, the leader keeps its role until Redis is back, but another main takes the key after 10 seconds. Leader code must stay correct when two mains run it at once.

## System tasks

A **system task** is periodic work of n8n itself, e.g. the deletion of old executions. A task declares how often it runs, and whether it runs on every process or once for the cluster. n8n then picks where the task runs.

Use a leader hook only for a service that holds a live resource, e.g. a socket. The [system tasks README](../../packages/cli/src/scheduling/system-tasks/README.md) shows how to write a task.

## Concurrency

`N8N_CONCURRENCY_PRODUCTION_LIMIT` caps the production executions that run at once. Who applies the cap depends on the mode:

- **Regular mode:** n8n applies the cap on the main. At the cap, a new execution waits until a running execution ends.
- **Queue mode:** Bull applies the cap on each worker. At the cap, a new job stays in the queue until a running job ends.

## Quiz

1. A worker finishes a webhook execution. Which process answers the HTTP caller?
   - A. The worker.
   - B. The process that holds the open request.
   - C. The leader.
   - D. Every main.
2. The leader loses its connection to Redis. What can happen?
   - A. The leader stops at once, and no main leads.
   - B. Two mains can both act as the leader.
   - C. Workers take over the leader tasks.
   - D. Nothing.
3. You add work that runs every night, once for the cluster. How do you write it?
   - A. As a timer in a method with `@OnLeaderTakeover`.
   - B. As a timer in the constructor of a service.
   - C. As a Schedule Trigger in a hidden workflow.
   - D. As a system task.

<details>
<summary>Answers</summary>

1. B. Every main and webhook process receives the message, but only the process with the open request acts on it.
2. B. The leader keeps its role while it cannot reach Redis, and another main can take the expired key.
3. D. All new periodic work is a system task, and n8n picks where the task runs.

</details>
