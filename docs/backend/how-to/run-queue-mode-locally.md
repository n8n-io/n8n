---
title: Run queue mode locally
audience: Backend engineers who change queue mode, workers, pubsub, or leader-only code
tier: 3
last_reviewed: 2026-11-05
contact: ivov
---

# Run queue mode locally

Queue mode and multi-main fail in ways that a single process never shows. A leader goes away, a worker dies in the middle of a job, or a webhook arrives on the wrong main. This page starts a local cluster with two mains, one worker, Redis, and PostgreSQL. Then it gives drills that break the cluster on purpose. Each drill states the trigger, the result we measured, and where to look.

[Scaling and multi-main](../subsystems/scaling-and-multi-main.md) explains the design. Read it first.

## Start the cluster

The `n8n-containers` package starts n8n from a Docker image, with a Caddy load balancer in front of the mains.

1. Build the image from your checkout. The stack runs `n8nio/n8n:local`.

   ```bash
   pnpm build:docker
   ```

2. Get a development license key from your team. Multi-main is a licensed feature, and the stack does not start more than one main without a key. Put the key in your shell environment as `N8N_LICENSE_ACTIVATION_KEY`. Do not put it on the command line.

3. Start the stack from the package folder. The `--env` flags set the log scopes and the metrics that the drills use.

   ```bash
   cd packages/quality/environments/containers
   TESTCONTAINERS_REUSE_ENABLE=true pnpm stack --mains 2 --workers 1 --name drills \
     --env N8N_LOG_LEVEL=debug \
     --env N8N_LOG_SCOPES=scaling,pubsub,multi-main-setup,redis \
     --env N8N_METRICS=true \
     --env N8N_METRICS_INCLUDE_QUEUE_METRICS=true
   ```

4. Open the load balancer URL that the command prints, and create the owner account.

The stack sets `EXECUTIONS_MODE=queue`, `OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true`, and `N8N_MULTI_MAIN_SETUP_ENABLED=true` on the containers. The containers are named `drills-n8n-main-1`, `drills-n8n-main-2`, `drills-n8n-worker-1`, `drills-redis`, and `drills-postgres`.

> [!WARNING]
> Docker gives a container a new host port each time it starts again. After a drill that stops a container, read the port again with `docker port drills-n8n-main-1 5678`. The load balancer keeps its port while it runs.

> [!NOTE]
> The load balancer uses the Caddy policy `first`. It sends all traffic to main 1 while main 1 is healthy. To reach main 2, call its own port.

To remove the stack and its volumes:

```bash
pnpm --filter n8n-containers stack:clean:all
```

## Know what to read

Each drill below reads one or more of these signals.

| Signal | Command | What it shows |
|---|---|---|
| Logs | `docker logs -f drills-n8n-main-1` | The scopes in `N8N_LOG_SCOPES`. The follower logs `Leader is other instance` every 3 s |
| Leader key | `docker exec drills-redis redis-cli GET n8n:main_instance_leader` | The host id of the leader, for example `main-f9de9d77b3c9` |
| Debug endpoint | `curl localhost:<main port>/rest/debug/multi-main-setup` | `isLeader` for this main. It needs no login |
| Metric | `curl localhost:<main port>/metrics` | `n8n_instance_role_leader` is `1` on the leader and `0` on a follower |
| Pubsub traffic | `docker exec -it drills-redis redis-cli PSUBSCRIBE 'n8n:n8n.*'` | Every command and worker response between processes |

In Docker, the host id is `main-` followed by the container hostname. A container keeps its host id when it starts again.

## Drill 1: stop the leader

1. Find the leader with the Redis key.
2. Stop that container with `docker stop drills-n8n-main-1`.
3. Watch the logs of the other main.

**Result.** The new leader logged `Leader is now this instance` about 2 s after the stop. A graceful stop deletes the leader key, so the follower claims it at its next check. The check runs every 3 s.

Start the old leader again with `docker start drills-n8n-main-1`. It comes back as a follower.

## Drill 2: kill the leader

1. Kill the leader with `docker kill drills-n8n-main-2`. A kill gives the process no time to delete the key.
2. Watch the logs of the other main, and read the TTL of the key with `redis-cli TTL n8n:main_instance_leader`.

**Result.** The new leader logged `Leader is now this instance` about 11 s after the kill. The key has a TTL of 10 s, and the leader renews it every 3 s. The follower waits until the key expires, then claims it at its next check. A hard crash therefore leaves the cluster with no leader for up to about 13 s.

## Drill 3: move the leader by hand

Do not delete the key to force a handover. The old leader also tries to claim an empty key, and it often wins. Write the host id of the follower into the key instead.

```bash
docker exec drills-redis redis-cli SET n8n:main_instance_leader <follower host id> EX 10
```

**Result.** Within 3 s, the old leader logged `Leader failed to renew leader key`. The follower logged `Leader is now this instance`, and the debug endpoints showed the change.

Leadership moves duties such as the wait tracker, queue recovery, and the publication outbox consumer. [Scaling and multi-main](../subsystems/scaling-and-multi-main.md#what-still-runs-only-on-the-leader) lists them.

## Drill 4: send a webhook to each main

1. Create a workflow with a Webhook node on the path `drill`, set to respond with a Respond to Webhook node. Return `{{ { "execution": $execution.id } }}` from the Respond to Webhook node.
2. Publish the workflow.
3. Call the webhook on each main and on the load balancer:

   ```bash
   curl localhost:<main 1 port>/webhook/drill
   curl localhost:<main 2 port>/webhook/drill
   curl localhost:<load balancer port>/webhook/drill
   ```

4. Search the logs of each main for `Enqueued execution`.

**Result.** Both mains answered with an execution id. The main that took the request logged `Enqueued execution N (job N)`, and the worker logged `Worker started execution N`. All calls through the load balancer went to main 1.

> [!TIP]
> An expression cannot read `$env` by default, because `N8N_BLOCK_ENV_ACCESS_IN_NODE` is `true`. The execution fails with `access to env vars denied`. Use the `Enqueued execution` log line to see which main took the request.

## Drill 5: watch pubsub

1. Subscribe to all n8n channels:

   ```bash
   docker exec -it drills-redis redis-cli PSUBSCRIBE 'n8n:n8n.*'
   ```

2. In the editor, open **Settings > Workers**.

**Result.** The main published `get-worker-status` on `n8n:n8n.commands`. The worker answered with `response-to-get-worker-status` on `n8n:n8n.worker-response`. Publish a workflow to see the commands that activate it.

## Drill 6: kill a worker during an execution

1. Create a workflow with a Webhook node on the path `slow`, set to respond immediately. Connect a Wait node of 40 s.
2. Publish the workflow and call `curl localhost:<load balancer port>/webhook/slow`.
3. When the worker logs `Worker started execution N`, kill it with `docker kill drills-n8n-worker-1`.
4. Read the status of the execution in the editor. Then start the worker again with `docker start drills-n8n-worker-1`.

**Result.**

| Time after the kill | What happened |
|---|---|
| 0 s | The execution stayed `running`. The Bull job stayed in the active list in Redis |
| 9 s | The worker was ready again. At startup it read its event log on disk, found the execution with no final event, and marked it `crashed` |
| 56 s | The main logged `Execution N ended without a completion event, resolving the wait from the DB`. The metric `n8n_scaling_mode_queue_jobs_completion_missed{status="crashed"}` went to 1 |
| 107 s | The active list in Redis was empty. Bull had failed the stalled job |

The main checks the database for missed completions every 60 s, so it can take up to a minute to see the crash.

In this drill the same container came back with its event log. A new container has no event log. Then the path is different. The job lock expires after 60 s, and a worker finds the stalled job in its next 30 s check. Bull fails the job at once, because n8n sets `maxStalledCount` to 0. We did not measure this path.

> [!NOTE]
> `docker stop` is not a crash. A worker that gets a stop signal waits for its running jobs, up to the graceful shutdown timeout.

## What the stack does not show

- **Concurrent migrations.** The stack starts the mains some seconds apart. [Write a database migration](write-a-database-migration.md#know-how-n8n-runs-migrations) explains the PostgreSQL lock that makes mains migrate one at a time.
- **Webhook processes.** The `stack` command has no option to start them.
- **Hot reload.** The stack runs a built image. Run `pnpm build:docker` again after a code change.

> [!WARNING]
> Queue recovery marks executions that have no Bull job as `crashed`. A main that is the leader at startup runs it at once. A main that becomes the leader later waits the full interval, 180 minutes by default, before its first run.

## Self-check

1. You kill the leader with `docker kill`. How long can the cluster run with no leader?
   - A. About 3 s.
   - B. About 13 s.
   - C. Until you start the old leader again.
2. You delete the leader key in Redis to move the leader. What happens?
   - A. The follower always becomes the leader.
   - B. The old leader and the follower race for the key, and the old leader often wins.
   - C. No main is the leader until a restart.
3. A worker dies in the middle of an execution and starts again in the same container. What marks the execution as `crashed`?
   - A. The main, when the HTTP request times out.
   - B. The worker, when it reads its event log at startup.
   - C. Nothing. The execution stays `running`.

<details>
<summary>Answers</summary>

1. B. The key has a TTL of 10 s, and the follower checks every 3 s.
2. B. A leader that finds the key empty also tries to claim it. To move the leader, write the host id of the follower into the key.
3. B. The worker recovers from its event log at startup. The main sees the new status at its next database check.

</details>
