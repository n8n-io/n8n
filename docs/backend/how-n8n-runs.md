---
title: How n8n runs
audience: Backend engineers new to n8n
tier: 1
last_reviewed: 2026-11-05
contact: ivov
---

# How n8n runs

The process that you started on [Start here](README.md) did all the work. Production setups split that work across many processes, and n8n Cloud runs the same code for many thousands of customers. This page starts from your one process and adds each part of the production setup, with the problem that each part solves.

## One process

`pnpm start` runs the command `n8n start`. A process that runs this command is a **main**. In your session, the main did five things:

- It served the editor: the web app, and the REST API under `/rest` that the editor calls.
- It sent the progress of the manual run to your browser tab, over a connection that n8n calls **push**.
- It received the calls to `/webhook-test/hello` and `/webhook/hello`.
- It ran both executions.
- It can run agent turns, when an agent has a model.

The inside of a main looks like most Express applications. Controllers take requests and call services. Services call repositories, and repositories use TypeORM. A small dependency injection container, `@n8n/di`, creates the services, and decorators register the routes.

The **execution engine** is different. It is a library in `n8n-core` that runs the nodes of a workflow, and it knows nothing about HTTP or the database. The process gives it hooks, and the hooks save the results. Agent turns run on another library, the agent runtime in `@n8n/agents`. Both kinds of work use the same nodes, credentials, permissions, and database.

The main keeps almost all its state in the database. That fact makes the next steps possible.

## Workers

One process can serve the editor and run executions, but heavy executions then slow the editor down. **Queue mode** moves the executions to other processes. With `EXECUTIONS_MODE=queue`, a main does not run a production execution. It writes the execution row, and it adds a job to a queue in Redis. The queue library is Bull. A **worker**, a process that runs `n8n worker`, takes the job and runs the execution.

The job carries only the id of the execution. The worker reads the workflow and the input from the database. If a worker dies, the input is still there, and n8n marks the execution `crashed`.

A third role, the **webhook process**, runs `n8n webhook`. It only receives production webhook calls and adds their jobs to the queue. Busy instances use it to keep webhook traffic away from the editor.

In queue mode, the manual runs from the editor also go to workers. Agent turns stay on mains. Only mains run the consumer that takes messages for agents.

| Work | Main, one process | Main, queue mode | Worker | Webhook process |
|---|---|---|---|---|
| Serve the editor and the APIs | yes | yes | no | no |
| Receive production webhooks | yes | yes | no | yes |
| Run executions | yes | no | yes | no |
| Fire schedules and poll other services | yes | yes | no | no |
| Run agent turns | yes | yes | no | no |

## Multi-main

Queue mode still has one main. If that main stops, the editor stops. **Multi-main** runs several mains behind a load balancer, so that one main can fail.

Several mains cause a new problem. Some work must happen exactly once. A workflow can start with a trigger that polls a service every minute. If two mains polled, each new record would start two executions. Therefore one main is the **leader**, and only the leader does this work. The leader holds a key in Redis that expires after a few seconds, and it renews the key while it runs. If the leader dies, another main takes the key.

Leadership can move at any time. Code that must run once in the cluster therefore cannot use a plain timer, which every main would start. n8n is moving this work to a scheduler in the database, which any main can run without a leader.

The processes also tell each other about changes. A publication arrives on one main, but the leader must start the triggers. The main sends a command over Redis **pubsub**, and every process receives it.

## n8n Cloud

n8n Cloud runs one instance for each customer. A control plane in another repository creates each instance, sets its environment variables, and upgrades it to new versions. It also loads a hooks file into each instance. The hooks file adds the limits of each plan.

This has one effect on your work: some names are contracts with code outside this repository. Cloud reads environment variables, module names, and license feature names. It calls the hooks by name and checks the health endpoints. A rename of any of these can break every Cloud instance, and no test in this repository fails. [Cloud contracts](subsystems/cloud.md) lists them.

Paid features ship in every instance, also in self-hosted ones. A license decides if they run. [Licensing](subsystems/licensing.md) explains the checks.

## Compatibility

Users save a workflow and expect it to work the same way for years. An upgrade must not change what a saved workflow does. n8n has three ways to change behavior without that problem:

- A node stores its `typeVersion`. A change of behavior goes into a new version of the node, and saved workflows keep the old one.
- A workflow stores some settings, such as the order in which it runs nodes. New workflows get the new setting, and old workflows keep theirs.
- A change that cannot follow those two ways waits for the next major version, on the `3.x` branch. `.github/DEVELOPING_V3.md` describes the process.

Review checks these rules, not CI. When your change can alter a saved workflow, say so in the PR.

The code changes too. Many parts of the backend exist in an old shape and a new shape at the same time. For example, some features live in `packages/cli`, and newer ones are modules. `AGENTS.md` names the new shape, and lint rules stop new code in the old shape.

## Packages

| Package | Holds |
|---|---|
| `packages/cli` | The `n8n` package: the commands, the server, the controllers, and most services and modules |
| `packages/core` | The execution engine |
| `packages/workflow` | The workflow model, the expression evaluator, and shared types. The editor uses it too |
| `packages/@n8n/db` | The entities, the repositories, and the migrations |
| `packages/@n8n/agents` | The agent runtime |
| `packages/@n8n/instance-ai` | The n8n Assistant, the agent inside the editor that builds workflows |
| `packages/@n8n/api-types` | The request and response types that the editor shares |
| `packages/@n8n/config` | All environment variables |
| `packages/modules` | Features that are their own packages |
| `packages/nodes-base`, `packages/@n8n/nodes-langchain` | The built-in nodes. The node teams own them |

## Quiz

1. In queue mode, a production webhook call arrives on a main. Which process runs the execution?
   - A. A worker. The main writes the execution row and adds a job to the queue in Redis.
   - B. The main. Queue mode moves only manual runs to workers.
   - C. The webhook process. It receives the call from the main.
   - D. The leader. Only the leader runs production executions.
2. A worker dies in the middle of an execution. What does n8n still have?
   - A. Nothing. The job in Redis held the workflow and the input.
   - B. The job, which another worker runs again from the start.
   - C. The output of every node, which a main uses to finish the run.
   - D. The input of the execution, in the database. n8n marks the execution `crashed`.
3. Your code must run once an hour for the whole cluster. Why is a plain timer wrong?
   - A. Timers do not run in queue mode.
   - B. Only workers can run timers.
   - C. Every main starts the timer, so the code runs once for each main.
   - D. The leader removes timers that other code starts.
4. You rename an environment variable, and all tests pass. What can still break?
   - A. Nothing. CI checks every use of each variable.
   - B. Every Cloud instance, because the Cloud control plane sets environment variables by name.
   - C. Only the editor, because it reads the variables at load.
   - D. Only workers, because they read a separate list of variables.
5. You want to change what a node does. How do saved workflows keep their behavior?
   - A. You add a new `typeVersion` of the node. Saved workflows keep the old version.
   - B. You change the node, and a migration updates the saved workflows.
   - C. You add a feature flag in PostHog.
   - D. You change the node only on the `master` branch.

<details>
<summary>Answers</summary>

1. A. A worker. The main writes the execution row and adds a job to the queue in Redis. In queue mode, a main does not run production executions. A worker takes the job from Redis and runs it.
2. D. The input of the execution, in the database. n8n marks the execution `crashed`. The job carries only the id of the execution. The workflow and the input stay in the database.
3. C. Every main starts the timer, so the code runs once for each main. Some work must happen exactly once. A plain timer runs in every main. n8n moves this work to a scheduler in the database.
4. B. Every Cloud instance, because the Cloud control plane sets environment variables by name. Environment variables are a contract with the Cloud control plane in another repository. No test in this repository checks it.
5. A. You add a new `typeVersion` of the node. Saved workflows keep the old version. A node stores its `typeVersion`. A change of behavior goes into a new version.

</details>

Week 1 follows your three steps from the first page through this setup: [the publication](workflow-publication.md), [the webhook call](workflow-execution.md), and [the message to the agent](agent-turn.md).
