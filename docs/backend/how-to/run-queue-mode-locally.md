---
title: Run queue mode locally
audience: Backend engineers new to n8n
tier: 4
last_reviewed: 2026-11-06
contact: ivov
---

# Run queue mode locally

On [Start here](../README.md), you ran n8n as one process with SQLite. On this page, we start [queue mode](../how-n8n-runs.md) on your machine, run your workflow on a worker, and add a second main.

## Start Redis and PostgreSQL

Queue mode needs Redis and PostgreSQL. From repository root:

```bash
pnpm --dir packages/quality/environments/containers \
  services --services postgres,redis
```

The command also configures queue mode for each n8n process that starts from `packages/cli/bin/`.

## Start a main and a worker

Start a main in a new data folder:

```bash
N8N_USER_FOLDER=$HOME/.n8n-queue pnpm start
```

In a second terminal, start a worker in the same data folder, on another port:

```bash
cd packages/cli/bin
N8N_USER_FOLDER=$HOME/.n8n-queue \
  N8N_RUNNERS_BROKER_PORT=5680 \
  ./n8n worker
```

When the worker is ready, it logs `n8n worker is now ready`.

## Run a workflow on the worker

The new database is empty. Open `http://localhost:5678`, create the owner account, and build the workflow from [Start here](../README.md#build-a-workflow) again. Publish it, then call it:

```bash
curl -s -X POST localhost:5678/webhook/hello \
  -H 'content-type: application/json' \
  -d '{"name":"Nathan"}'
```

The answer is the same as on [Start here](../README.md#publish-it):

```json
{"greeting":"Hello, Nathan"}
```

This time, the main enqueued the execution, the worker ran it, and the main sent the result back.

## Add a second main

Multi-main needs a dev n8n license key with the multi-main feature. Ask your team for one, and export it in your shell as `N8N_LICENSE_ACTIVATION_KEY`.

Stop the main, and start it again with multi-main turned on:

```bash
N8N_USER_FOLDER=$HOME/.n8n-queue \
  N8N_MULTI_MAIN_SETUP_ENABLED=true \
  pnpm start
```

In a third terminal, start the second main on other ports:

```bash
cd packages/cli/bin
N8N_USER_FOLDER=$HOME/.n8n-queue \
  N8N_MULTI_MAIN_SETUP_ENABLED=true \
  N8N_PORT=5681 \
  N8N_RUNNERS_BROKER_PORT=5682 \
  ./n8n start
```

The first main is the leader. Call the webhook on the second main:

```bash
curl -s -X POST localhost:5681/webhook/hello \
  -H 'content-type: application/json' \
  -d '{"name":"Nathan"}'
```

```json
{"greeting":"Hello, Nathan"}
```

The second main logs `Enqueued execution 2 (job 2)`. Both mains put jobs on the same queue, so the worker runs this execution too.

## Move the leader

Stop the first main with <kbd>Ctrl+C</kbd>. Within a few seconds, the second main becomes the leader.

If your code runs only on the leader, check that it stops on the old leader and starts on the new one.

## Clean up

Stop all the n8n processes with <kbd>Ctrl+C</kbd>. Then remove the Redis and PostgreSQL containers:

```bash
pnpm --dir packages/quality/environments/containers \
  services:clean
```

Remove the folder `$HOME/.n8n-queue/` when you no longer need this instance.
