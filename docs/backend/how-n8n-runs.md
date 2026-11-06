---
title: How n8n runs
audience: Backend engineers new to n8n
tier: 1
last_reviewed: 2026-11-05
contact: ivov
---

# How n8n runs

The process that you started locally on the [previous page](README.md) ran all of n8n on its own. Production setups split n8n across many processes, and n8n Cloud runs the same code in thousands of customer instances. On this page, we add each part of the production setup and explain why it exists.

Week 1 follows your three steps from the previous page through this setup: the [publication](workflow-publication.md), the [webhook call](workflow-execution.md), and the [message to the agent](agent-turn.md).

## One process

`pnpm start` runs the CLI command `n8n start`. A process that runs this command is called a **main**. In your session, the main:

- served the editor: the web app, and the REST API under `/rest` that the editor calls.
- received the calls to `/webhook-test/hello` and `/webhook/hello`, and your message to the agent.
- ran both workflow executions, and sent the progress of the manual execution to your browser tab via websocket.
- ran the agent turn, and streamed its answer back in the HTTP response of your message.

The inside of a main looks somewhat like most [Express](https://expressjs.com) applications. Controllers take requests and call services. Services call repositories, and repositories use [TypeORM](https://typeorm.io). A small dependency injection container, `@n8n/di`, creates the services, and decorators register the routes.

Each workflow execution is passed to the **execution engine**, a library in `n8n-core` that runs the nodes of a workflow and knows nothing about HTTP or the database. (This is the v1 engine. Engine v2 is in development, and [its docs](../../packages/@n8n/engine/AGENTS.md) state the current design.)

Agent turns run on another library, the agent runtime in `@n8n/agents`. Workflow executions and agent turns share the same nodes, credentials, permissions, and database.

## Workers

In **regular mode**, one process serves the editor and runs executions, so heavy executions can slow the editor down. In **queue mode** (also called **scaling mode**), a main sets up the execution and adds a job to a [Bull](https://github.com/OptimalBits/bull) queue backed by Redis.

Alongside the main, processes that run the CLI command `n8n worker` are called **workers**. A worker takes the job from the queue and runs the execution. The job carries only the ID of the execution. The worker reads the workflow and the input from the database. When the execution ends, the worker saves the results to the database and reports completion to the main through the queue.

Processes that run the CLI command `n8n webhook` are called **webhook processes**. A webhook process only receives production webhook calls and adds their jobs to the queue. Busy instances run several of them behind a load balancer, to take in more webhook calls and keep that load off the main that serves the editor.

In queue mode, workers run only workflow executions, and agent turns still run on the main.

| Work | Regular mode:<br>main | Queue mode:<br>main | Queue mode:<br>worker | Queue mode:<br>webhook process |
|---|---|---|---|---|
| Serve the editor and the APIs | yes | yes | no | no |
| Receive production webhooks | yes | yes | no | yes |
| Run workflow executions | yes | no | yes | no |
| Fire schedules and poll other services | yes | yes | no | no |
| Run agent turns | yes | yes | no | no |

## Multi-main

With one main, a stopped main takes down the editor, the APIs, the schedules and polling triggers, and the agent turns. **Multi-main** runs several mains behind a load balancer for higher availability.

Several mains cause a new problem: some work must happen exactly once. If two mains ran the same poller, each new record would start two executions. Therefore one main is the **leader**, and only the leader runs pollers. Schedules need no leader, because any main starts each due run from a job in the database. The leader holds a key in Redis that expires after a few seconds and renews it while it runs. If the leader dies, another main takes the key.

Mains and workers broadcast changes over [Redis pubsub](https://redis.io/docs/latest/develop/pubsub/). For example, if you publish a workflow through a main that is not the leader, that main broadcasts a command, and the leader starts the triggers.

## n8n Cloud

n8n Cloud runs one instance for each customer. A control plane outside the n8n repository creates, configures, and upgrades each instance. It sets the environment variables of each instance, including `N8N_DEPLOYMENT_TYPE=cloud`. It also loads hooks into the process, which add the limits of each plan and usage reports.

The control plane depends on these names and files in the n8n repository, and no n8n test checks them:

- Environment variable names. Retire an old name with `DeprecationService`, which keeps it working for a release.
- Module names and license feature names.
- The external hooks, and the files and methods that they import, such as `HooksService`. A moved file makes every n8n Cloud instance fail at startup. Search the code for "cloud hooks" before you move code.
- The health endpoints `/healthz` and `/healthz/readiness`, and `/metrics`.
- The commands `n8n export:entities` and `n8n import:entities`. n8n Cloud uses them to copy whole tables out of an instance and back in.

Before you add a branch on `N8N_DEPLOYMENT_TYPE`, check if a license feature or a setting can do the same job. Then self-hosted users get the behavior too.

## Licensing

Paid features ship in every instance, including self-hosted ones. A license decides if they run. See [Licensing](licensing.md).

## Compatibility

Upgrading an n8n instance must not change what a saved workflow does. Common ways to change behavior safely:

- In a node, add a new node version (`typeVersion`). Saved workflows keep the old version.
- In the engine, add a workflow setting. New workflows get the new behavior, and saved workflows keep the old one.
- For the whole instance, add an opt-in environment variable. Instances keep the old behavior until an admin turns it on.
- If no safe way exists, wait for the next [major version](https://www.notion.so/3815b6e0c94f8052b838e90fc6e1ab14) to make a breaking change.

## Packages

| Package | Holds |
|---|---|
| `packages/cli/` | CLI commands, HTTP server, controllers, and most services and modules: auth and SSO, credentials, executions and their lifecycle, triggers and webhooks, queue mode and pubsub, push, task runners, licensing, events and telemetry, public API, and more |
| `packages/core/` | Execution engine, node execution contexts (the helpers that nodes call), trigger and poller runtime, node and credential loading, binary data storage, encryption, and instance settings |
| `packages/workflow/` | Workflow model, expression evaluator, and shared types, used by both backend and frontend |
| `packages/@n8n/db/` | Entities, repositories, and migrations |
| `packages/@n8n/agents/` | Agent runtime |
| `packages/@n8n/instance-ai/` | Backend of the n8n Assistant, the agent that builds and fixes workflows for the user |
| `packages/@n8n/api-types/` | Request and response types that the editor shares |
| `packages/@n8n/config/` | Config from env vars |
| `packages/modules/` | Modules in their own packages |
| `packages/nodes-base/`<br>`packages/@n8n/nodes-langchain/` | Built-in nodes |

## Quiz

1. In queue mode, a production webhook call arrives on a main. Which process runs the execution?
   - A. A worker. The main writes the execution row and adds a job to the queue in Redis.
   - B. The main. Queue mode moves only manual executions to workers.
   - C. The webhook process. It receives the call from the main.
   - D. The leader. Only the leader runs production executions.
2. A worker finishes an execution. What does it do with the result?
   - A. It answers the webhook call itself.
   - B. It writes the result into the job in Redis, and nothing else.
   - C. It sends the result to the editor over websocket.
   - D. It saves the results to the database and reports completion to the main through the queue.
3. In multi-main, the leader dies. What happens to pollers?
   - A. They stop until an admin picks a new leader.
   - B. Every main starts running them.
   - C. The key of the leader in Redis expires, and another main takes it and runs them.
   - D. Workers take them over.
4. You rename an environment variable, and all tests pass. What can still break?
   - A. Nothing. CI checks every use of each variable.
   - B. Every n8n Cloud instance, because the n8n Cloud control plane sets environment variables by name.
   - C. Only the editor, because it reads the variables at load.
   - D. Only workers, because they read a separate list of variables.
5. You want to change what a node does. How do saved workflows keep their behavior?
   - A. You add a new `typeVersion` of the node. Saved workflows keep the old version.
   - B. You change the node, and a migration updates the saved workflows.
   - C. You add a feature flag in PostHog.
   - D. You change the node only on the `master` branch.

<details>
<summary>Answers</summary>

1. A. In queue mode, a main does not run production executions. A worker takes the job from Redis and runs it.
2. D. The job carries only the ID of the execution, so the database holds the data.
3. C. The leader renews its key while it runs, so a dead leader loses the key within a few seconds.
4. B. Environment variables are a contract with the n8n Cloud control plane outside the n8n repository. No test in the n8n repository checks it.
5. A. A node stores its `typeVersion`. A change of behavior goes into a new version.

</details>
