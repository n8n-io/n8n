# Durable scheduler benchmarks (CAT-3623)

Two opt-in benchmark suites for the durable scheduler, run against **both** SQLite
(single-writer) and Postgres (SKIP LOCKED, dead-tuple churn) so the two can be
compared on the same numbers. They inform the
[minimum-interval policy and conservative SQLite cadences](https://linear.app/n8n/issue/CAT-3623)
decision.

- **`scheduler-benchmarks.test.ts`** — operator-facing KPIs (capacity,
  punctuality, recovery, health). "Is throughput enough?" See below.
- **`scheduler-query-benchmarks.test.ts`** — per-query profiling of
  `ScheduledJobRepository` / `ScheduledTaskRepository`: latency KPIs and `EXPLAIN`
  plans to surface index/query/config optimizations. See
  [Query-level profiling](#query-level-profiling).

Both live here, next to the other scheduling integration tests, rather than in
`@n8n/performance` or `@n8n/benchmark`, on purpose (see below).

## The KPIs

| KPI | Operator question | What it reports | Pass condition |
|-----|-------------------|-----------------|----------------|
| **1 · Capacity** | How many schedule fires per second can one node handle? | sustained fires/sec end-to-end (claim → mark started → complete), translated to "N schedules every X s" | every fire ran once; ≥ floor |
| **2 · Punctuality** | Will my jobs fire on time when many come due at once? | how late each fire was vs its due time, p50/p95/p99, under a due-at-once burst | whole burst fired; p99 under the 30 s late-dispatch warning |
| **3 · Recovery** | If a node dies mid-run, how fast does its work resume? | wall-clock to recover a stranded (crashed-node) backlog | all recovered exactly once; within the time budget |
| **4 · Health** | Does the scheduler's table stay bounded (no DB bloat)? | peak finished-but-unpruned rows while retention prunes *concurrently* with live churn, vs total fired | finished rows stay bounded (retention keeps pace); fully drained at the end |

### How concurrency is modelled per dialect

- **Postgres** supports multi-main, so each worker is its own `DataSource` (one
  connection) — an independent instance. Claims run in parallel and rely on
  `FOR UPDATE SKIP LOCKED` to stay disjoint.
- **SQLite** is single-instance (multi-main needs Postgres). Its pooled driver
  funnels every write through one mutex-guarded write connection, so the workers
  share one `DataSource`: concurrent claims queue on that single writer, which is
  the real bottleneck. (Separate SQLite `DataSource`s would be separate write
  connections fighting over the file lock — `SQLITE_BUSY` — which is not a real
  topology.)

## Running

Set `N8N_SCHEDULER_BENCHMARK=1` and reuse the existing scheduling-integration
scripts, filtering to this file by name.

```sh
# SQLite (single-writer)
N8N_SCHEDULER_BENCHMARK=1 pnpm --filter n8n test:sqlite scheduler-benchmarks

# Postgres via testcontainers (needs Docker; on Colima add the socket override)
N8N_SCHEDULER_BENCHMARK=1 \
  TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock \
  pnpm --filter n8n test:postgres:integration:tc scheduler-benchmarks

# Postgres against an already-running instance (DB_POSTGRESDB_* env set)
N8N_SCHEDULER_BENCHMARK=1 pnpm --filter n8n test:postgres scheduler-benchmarks
```

At the default workload a full run is ~50s on SQLite and ~110s on Postgres
(local, laptop-class). Scale via env for a bigger host.

Without `N8N_SCHEDULER_BENCHMARK=1` both suites are skipped
(`describe.runIf(...)`), so you get no output at all — that's the usual reason
a run seems to produce "no results".

### Where the results go

The suites don't write any file or artifact — every KPI is printed to **stdout**
via `console.log`, one block per benchmark, prefixed with
`[scheduler-benchmark · <dialect>]` (capacity/punctuality/recovery/health) or
`[scheduler-query · <dialect>]` (per-query profiling). Because Vitest buffers
per-test logs, the reliable way to capture them is to redirect the run and grep
the prefix:

```sh
N8N_SCHEDULER_BENCHMARK=1 pnpm --filter n8n test:sqlite scheduler-benchmarks > bench.log 2>&1
grep -A20 'scheduler-benchmark ·' bench.log
```

The tables in [Observed numbers](#observed-numbers-local-laptop-class-default-workload)
and `benchmark-baseline.md` are **hand-captured** from that stdout — nothing
regenerates them automatically.

### Tuning the workload

| Env var | Default | Meaning |
|---------|---------|---------|
| `N8N_SCHEDULER_BENCHMARK_BATCH` | 100 | rows per claim statement (all KPIs) |
| `N8N_SCHEDULER_BENCHMARK_CAPACITY_WORKERS` | 8 | instances (KPI 1) |
| `N8N_SCHEDULER_BENCHMARK_CAPACITY_BACKLOG` | 50000 | schedules to fire (KPI 1) |
| `N8N_SCHEDULER_BENCHMARK_CAPACITY_MIN_FPS` | 50 | capacity floor (fires/sec) |
| `N8N_SCHEDULER_BENCHMARK_PUNCTUALITY_WORKERS` | 8 | instances (KPI 2) |
| `N8N_SCHEDULER_BENCHMARK_PUNCTUALITY_BURST` | 20000 | schedules due at once (KPI 2) |
| `N8N_SCHEDULER_BENCHMARK_PUNCTUALITY_MAX_P99_MS` | 30000 | lateness ceiling (p99) |
| `N8N_SCHEDULER_BENCHMARK_RECOVERY_WORKERS` | 8 | recovering instances (KPI 3) |
| `N8N_SCHEDULER_BENCHMARK_RECOVERY_STRANDED` | 20000 | crashed-node backlog (KPI 3) |
| `N8N_SCHEDULER_BENCHMARK_RECOVERY_MAX_SECONDS` | 120 | recovery-time budget |
| `N8N_SCHEDULER_BENCHMARK_CHURN_WORKERS` | 8 | instances (KPI 4) |
| `N8N_SCHEDULER_BENCHMARK_CHURN_CYCLES` | 20 | × batch = total fires (KPI 4) |
| `N8N_SCHEDULER_BENCHMARK_CHURN_BATCH` | 5000 | fires per cycle; also the pending-backlog watermark |
| `N8N_SCHEDULER_BENCHMARK_CHURN_MIN_FPS` | 50 | churn floor (fires/sec) |
| `N8N_SCHEDULER_BENCHMARK_CHURN_RETENTION_LIMIT` | 1000 | rows pruned per retention sweep (KPI 4) |
| `N8N_SCHEDULER_BENCHMARK_CHURN_RETENTION_INTERVAL_MS` | 100 | delay between retention sweeps (KPI 4) |
| `N8N_SCHEDULER_BENCHMARK_CHURN_SAMPLE_INTERVAL_MS` | 50 | how often live/finished rows are sampled (KPI 4) |
| `N8N_SCHEDULER_BENCHMARK_CHURN_MAX_FINISHED_ROWS` | 5000 | ceiling on finished-but-unpruned rows (KPI 4) |

## Reading the results for the min-interval decision

- **Capacity** is the per-node fire budget. Divide it by your schedule count to
  get the safe floor on the shared minimum interval, and keep a wide margin. The
  report already prints the translation (e.g. "~142,000 schedules every 60s").
- **SQLite's** capacity comes from one serialised writer, so its cadences should
  be more conservative than Postgres's even though its local-file latency can
  make the raw fires/sec look higher.
- **Punctuality** shows what a "thundering herd" (e.g. everything on `0 * * * *`)
  costs: the p99 is the worst-case lateness a job in that herd sees. If it
  approaches the 30 s warning threshold at your burst size, the cadence is too
  tight.
- **Recovery** is your crash-blast-radius: how long scheduled work stalls after
  an instance dies. The "wasted-sweep factor" (near the instance count) shows the
  reaper sweep takes no row lock, so many concurrent recoverers mostly duplicate
  work — argues for a modest reaper count rather than many aggressive ones.
- **Health** runs retention concurrently with live churn and watches the peak
  finished-but-unpruned rows — the actual bloat signal (Postgres dead tuples /
  SQLite file growth). Staying bounded well below the total fired is what proves
  retention keeps pace, so it can briefly fall behind without the DB bloating.

## Observed numbers (local, laptop-class, default workload)

Indicative only — hardware-dependent. Captured for orientation, not as thresholds.

| KPI | SQLite | Postgres |
|-----|--------|----------|
| Capacity (fires/sec, one node) | ~5,100 | ~2,500 |
| Punctuality p99 under a 20k burst | ~3.5s | ~7.8s |
| Recovery of 20k stranded schedules | ~11s | ~35s |
| Health peak finished-but-unpruned (of 100k fired) | ~700 | ~600 |

Postgres capacity is lower here because each fire is three sequential write
round-trips (claim, mark started, complete) to a container over the loopback;
the point is the per-dialect *shape*, not the absolute number.

---

## Query-level profiling

`scheduler-query-benchmarks.test.ts` profiles the individual repository queries
against a large, realistically-mixed corpus (default 100k `scheduled_task`, 50k
`scheduled_job` rows: mostly terminal history, a slice of pending/due, some
running/expired). For each hot query it reports **latency p50/p95/p99** (via the
real repository method) and the **`EXPLAIN` plan**, flagged INDEX vs FULL SCAN.

A FULL SCAN line is an optimization candidate? It is reported (and listed under
"OPTIMIZATION CANDIDATES"), not asserted, since the fix is a judgement call. Hard
assertions cover only correctness and a loose latency ceiling / throughput floor.

### Running

```sh
N8N_SCHEDULER_BENCHMARK=1 pnpm --filter n8n test:sqlite scheduler-query-benchmarks
N8N_SCHEDULER_BENCHMARK=1 pnpm --filter n8n test:postgres:integration:tc scheduler-query-benchmarks
```

Sizes are overridable: `N8N_SCHEDULER_QUERY_TASK_ROWS`, `_JOB_ROWS`, `_ITERS`,
`_BATCH`, `_WRITE_BATCH`, `_WRITE_JOB_BATCH`.

### Observed (local, laptop-class, 100k tasks / 50k jobs)

Reads — latency p99 (ms) and plan:

| Query | SQLite | Postgres | Plan |
|-------|--------|----------|------|
| `ScheduledTask.getMetricSnapshot` | ~9 | ~12 | **FULL / Seq Scan** |
| `ScheduledTask.claimDueTasks` (select) | ~5 | ~6 | index (runAt partial) |
| `ScheduledTask.findExpiredLeases` | <1 | ~1 | index (leaseExpiresAt partial) |
| `ScheduledTask.deleteFinishedOlderThan` (select) | ~1.5 | ~15 | index (finishedAt partial) + status filter |
| `ScheduledJob.claimDue` | ~1.5 | ~3.5 | index (nextRunAt partial) |

Writes — throughput (rows/sec): task `insertIgnoringDuplicates` ~100k / ~34k,
job `insertMany` ~33k / ~17k, `advanceMany` ~127k / ~49k (SQLite / Postgres).

### Optimization findings

1. **`getMetricSnapshot` does a full table scan on both dialects.** There is no
   index supporting `WHERE status IN ('pending','running')`, so the Prometheus
   scrape scans the whole table, and its cost grows with total history (dead
   tuples on Postgres), not just the working set. It's still fast at 100k (~10ms)
   but scales linearly — at 1M rows expect ~100ms per scrape. Options:
   - split into two `COUNT(*)` reads, each hitting a partial index
     (`WHERE status = 'pending'` / `= 'running'`) for index-only counts; or
   - add a partial/covering index keyed on `status` (the `due` count and
     `oldestPendingAgeMs` still need `runAt`, so a `(status, runAt)` partial index
     on the live statuses is the strongest single change); or
   - accept the scan but keep retention aggressive so the table stays small.

2. **`advanceMany`'s CASE update is unusable at its default chunk on SQLite.** It
   builds one `WHEN id = ? THEN ?` branch per row; SQLite caps expression depth at
   1000, so even a few hundred branches error (`Expression tree is too large`).
   The method's default `chunkSize` is 1000 — fine on Postgres, but callers must
   pass a small chunk (~200) on SQLite. Options: make the default dialect-aware,
   or rewrite the bulk advance as an `UPDATE ... FROM (VALUES ...)` join.

3. **`insertMany` is not safe for large batches on SQLite.** It neither chunks the
   insert (bounded by the ~32k bind-parameter ceiling) nor the read-back
   `name IN (...)` (an IN list past ~1000 terms hits the same expression-depth
   cap). Provisioning normally inserts few jobs, so this is latent, but a bulk
   activation would break on SQLite. Option: chunk both the insert and the
   read-back inside `insertMany`.

4. **Minor:** `deleteFinishedOlderThan` on Postgres applies the terminal-`status`
   `IN` as a post-index Filter on top of the `finishedAt` index (p99 ~15ms). A
   `(finishedAt)` index already covers ordering; a `(status, finishedAt)` partial
   index would let retention avoid the recheck, if it ever becomes hot.

Config levers worth testing alongside the above: SQLite already runs WAL; larger
`cache_size` / `mmap_size` mainly help the scan in finding (1). On Postgres,
keeping autovacuum aggressive on this high-churn table bounds the dead tuples that
inflate the finding-(1) scan.
