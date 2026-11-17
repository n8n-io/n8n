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

## Next card: fair admission in the runtime (not built)

The lanes bound the CPU delay, not the steps that one workflow holds in
flight. Plan, in `workflow-runtime/src/shell/server.zig`:

1. `Runner.init`: `fb_wf_inflight: []u32` by module slot; `fb_cap_total`
   (workers of the hello x `--fallback-steps-per-worker`) and `fb_cap_wf`
   (max(1, total / 4), `--fallback-workflow-share`), set in `onControlFrame`.
2. `sendFrame`: at either cap, call `waitFrame` and not `pickConn`.
3. `sendWaiting`: turns between modules, with a fixed ring of the modules
   that wait and one list for each module (`next: u32` in `FbEntry`); skip a
   module at its share. `expireWaiting` checks the head of each list.
4. One function `fbDone` for the decrement, called from `onFallbackFrame`,
   `lostFallback`, `failAloneQueue` and `expireWaiting`.
5. A full wait queue keeps `fb_full`. Admission gets its own wait
   (`--fallback-admit-wait-ms`): 30 s is the wait for a host that is down.
6. `--stats`: steps waiting, in flight, the largest count of one workflow.
7. Tests: a module at its share waits while another module's step goes out;
   turns between three modules; counts are 0 after a lost connection.
