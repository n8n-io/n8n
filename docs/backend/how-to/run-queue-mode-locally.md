---
title: Run queue mode locally
audience: Backend engineers new to n8n
tier: 4
last_reviewed: 2026-11-05
contact: ivov
---

# Run queue mode locally

On Day 1 you ran n8n as one process with SQLite. Production often runs queue mode: mains take the requests, and workers run the executions. This page starts the same setup from your checkout. It then runs the Day 1 workflow on a worker and adds a second main. Use it when your change touches executions, pubsub, or the leader. [How n8n runs](../how-n8n-runs.md) explains the design.

## Start Redis and PostgreSQL

Queue mode needs Redis for the job queue. It also needs PostgreSQL, because n8n does not support queue mode on SQLite. The `n8n-containers` package starts both in Docker. From the root of the repository:

```bash
pnpm --filter n8n-containers services --services postgres,redis
```

The command writes the connection settings, together with `EXECUTIONS_MODE=queue`, to a `.env` file in `packages/cli/bin`. Each n8n process that starts from `packages/cli/bin` reads this file.

## Start a main and a worker

Start a main in a new folder, as on Day 1:

```bash
N8N_USER_FOLDER=$HOME/.n8n-queue pnpm start
```

In a second terminal, start a worker:

```bash
cd packages/cli/bin
N8N_USER_FOLDER=$HOME/.n8n-queue N8N_RUNNERS_BROKER_PORT=5680 ./n8n worker
```

The worker uses the same folder as the main, because the folder holds the encryption key. The main already uses port 5679 for its task broker, so the worker needs another port. When the worker is ready, it logs `n8n worker is now ready`.

## Run a workflow on the worker

The new database is empty. Open `http://localhost:5678`, create the owner account, and build the Day 1 workflow again. Publish it, then call it:

```bash
curl -s -X POST localhost:5678/webhook/hello -H 'content-type: application/json' -d '{"name":"Ada"}'
```

The answer is the same as on Day 1:

```
{"greeting":"Hello, Ada"}
```

This time the main did not run the workflow. The main logs `Enqueued execution 1 (job 1)`. The worker logs `Worker started execution 1 (job 1)` and `Worker finished execution 1 (job 1)`. Then the main logs that the execution finished, and it sends the answer.

## Add a second main

Several mains need a license with the multi-main feature. Get a development license key from your team. Put it in your shell as `N8N_LICENSE_ACTIVATION_KEY`, not on the command line. Without the feature, a main with multi-main turned on does not start.

Stop the main, and start it again with multi-main turned on:

```bash
N8N_USER_FOLDER=$HOME/.n8n-queue N8N_MULTI_MAIN_SETUP_ENABLED=true pnpm start
```

In a third terminal, start the second main on other ports:

```bash
cd packages/cli/bin
N8N_USER_FOLDER=$HOME/.n8n-queue N8N_MULTI_MAIN_SETUP_ENABLED=true N8N_PORT=5681 N8N_RUNNERS_BROKER_PORT=5682 ./n8n start
```

The first main logs `Leader is now this instance`. Call the webhook on the second main:

```bash
curl -s -X POST localhost:5681/webhook/hello -H 'content-type: application/json' -d '{"name":"Grace"}'
```

```
{"greeting":"Hello, Grace"}
```

Both mains put jobs on the same queue, so the worker runs this execution too.

## Move the leader

Stop the first main with Ctrl+C. A leader that stops releases its key in Redis. Within a few seconds, the second main logs `Leader is now this instance`.

Use this when your code runs only on the leader. Check that it stops on the old leader and starts on the new one.

## Clean up

Stop the n8n processes with Ctrl+C. Then remove the containers and the `.env` file:

```bash
pnpm --filter n8n-containers services:clean
```

Remove the folder `$HOME/.n8n-queue` when you no longer need this instance.
