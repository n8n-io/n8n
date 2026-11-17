# Isolation between workflows in the fallback host

## What was measured

`isolation.e2e.test.ts`, 2 workers, 3 s stands for 10 s to 40 s. `ISOLATION_BASELINE=1` is "before".

| Case | Before | With lanes |
|---|---|---|
| One step blocks 3,000 ms; delay of another workflow's step | 3,003 ms | 7 to 18 ms |
| 20 steps of 200 ms from one workflow; delay of another workflow | 2,009 ms | 8 ms |
| A known key starts to block (400 ms, then 3,000 ms) | 3,002 ms | 405 ms once, then 11 ms |
| A block longer than the guard (1,000 ms) | step fails | 1,240 ms once, step gets its result |
| A step that blocks 4 x the guard, alone | step fails | result |

## The gaps

1. **Head-of-line blocking in a worker: real.** A worker runs many steps on
   one event loop. The delay of the other steps equals the block.
2. **No fairness between workflows: real.** The runtime picks the connection
   with the fewest steps (`pickConn`, `server.zig`). Its only bound is 65,536
   host steps for each shard (`fb_max_inflight`); none for each workflow.
   Steps that wait on I/O do not delay others; steps that use the CPU do.
3. **A long synchronous step is stopped: real, and worse for Code.** The CPU
   guard stopped a worker after 30 s, and the code timeout was 5 s. v1 gives
   300 s (`N8N_RUNNERS_TASK_TIMEOUT`).
4. **A saturated host: partly real.** The runtime has no time limit for a
   step that it sent; the host ends it after 300 s. A step waits in the
   runtime only when no connection is usable (`fb_waitq`: 1,024 steps, 30 s,
   then a retryable error). Steps for a slow host collect in the host. Each
   keeps its execution, and its webhook caller waits up to the step limit.
   Host load does not fill the slot table: a new webhook gets 503 only when
   the event queue or the outbox is full.

Code steps ran in the worker (`node:vm`), with the node steps: not apart.

## Design: two lanes in the host

The **key** of a step is its workflow id and its step name. The runtime sends
both (`workflowId`, new, and `step`). The key holds no data of the workflow.

- **Normal lane**: `--workers` workers, many steps each. CPU guard
  `WF_FALLBACK_BLOCKED_MS`, now 5 s (was 30 s).
- **Slow lane**: `WF_FALLBACK_SLOW_WORKERS` workers (a quarter of the workers,
  2 to 4). One step at a time for each worker, no CPU guard. Only the step
  limit (300 s) and the heap limit end a step, so a 40 s step finishes. The
  code timeout is now the step limit when the host has workers.
- **Lag**: each worker measures the delay of its event loop (a 20 ms timer,
  and a look before each answer). A delay of `WF_FALLBACK_LAG_MS` (100 ms) is
  a block. The number is a proposal: lower values also mark pauses of the
  garbage collector. The load test must confirm it.

Marks (`lanes.ts`, at most 4,096 keys, 10 minutes each):

| Mark | When | Effect |
|---|---|---|
| `slow` | The only key in a blocked worker, or a block in the slow lane | Steps wait for the slow lane |
| `probe` | In a worker that the guard stopped, with other keys | The next step runs in the slow lane, which gives `slow` or `clear` |
| `maybe` | In a worker during a block that ended, with other keys | One step runs in the slow lane when a worker is free there |
| `clear` | Ran alone without a block | Normal lane. It does not excuse the key at the next block |

A **Code step** whose key has no mark starts in the slow lane when a worker
is free there. The next steps of that key wait for that one answer, then go
to the normal lane (`clear`) or stay (`slow`). This changes the proposal: with
"Code always starts in the slow lane", each short Code step waits behind the
long steps of other workflows.

A worker gives a marked step to the pool (`RELAY_JOB`); the answer and the
service calls go back through it. The slow queue holds 256 steps, workflows
take turns, and a full queue is a retryable limit error.

## The CPU guard and at-least-once

When a normal worker does not answer for 5 s, the pool marks its keys, stops
it, and sends `{"worker_lost":{"reason","again":true}}`. The runtime then
sends each step of that connection again once as a new step (`sendAgain`,
`server.zig`), also a step that was alone. The marked step now runs in the
slow lane and gets its result. A step that is lost a second time follows the
old blame rule, which bounds the loop.

Consequence: each step in the stopped worker runs twice, with the same
idempotency key. The pool did this already for each worker that stops; the
shorter guard makes it more frequent (at most once for each key in 10
minutes). It is acceptable when the service honours the key, or when the step
had no effect before the block. It is not acceptable for a step that sent a
request without the key and waited for the answer in that worker.

Proposed rule (not built): a worker reports once when a step wrote to the
network. After a guard stop, only steps without that report go again; the
others fail as retryable. Until then the guard value is the trade.

Known limit: the marks reach the workers before the steps come again in
practice, not by protocol. Else the step is lost twice and fails as before.

## Limits and metrics

`WorkerPool.stats()`: `normalInFlight`, `slowInFlight`, `slowWaiting`,
`movedToSlow`, `guardStops`, `blockEvents`, `maxBlockMs`, `slowRejected`,
`marks`. The host logs them on a change (`WF_FALLBACK_STATS_MS`) and on `SIGUSR2`.

## Fair admission in the runtime

The lanes bound the CPU delay. The runtime bounds the steps that one workflow
holds in flight (`workflow-runtime/src/shell/server.zig`, for each shard):

- Total: host workers x `--fallback-steps-per-worker` (256). For each
  workflow (module slot): `--fallback-workflow-steps`, default a quarter of
  the total, at least 1 (`hostCapTotal`, `hostCapWorkflow`).
- A step beyond a cap waits in `fb_waitq` (1,024 steps, at most 512 of one
  workflow). Its frame is in the journal. All tables have their size from
  startup; `fbAdmit`, `fbLeave` and `fbRemove` are the only code that counts.
- `sendWaiting`: the workflows take turns. Each pass gives each workflow an
  equal part of the free places, in arrival order. With fewer places than
  workflows, those that sent a step longest ago go first (`waitTurn`). A
  workflow at its share is passed over.
- Defined results: a full queue fails the step with `fb_full`; a wait longer
  than `--fallback-wait-ms` (30 s) fails it with `fb_busy`. Both are retryable.
- `--stats`: `host_inflight`, `host_waiting`, `host_waited`, `host_refused`.

Limits: a cap is for each shard, and each version of a workflow has its own share.
