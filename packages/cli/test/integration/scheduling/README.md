# Durable scheduler benchmarks (CAT-3623)

Two opt-in suites, run against **both** SQLite (single-writer) and Postgres
(SKIP LOCKED, dead-tuple churn), informing the
[minimum-interval policy](https://linear.app/n8n/issue/CAT-3623) decision.

- **`scheduler-benchmarks.test.ts`** — operator KPIs (capacity, punctuality,
  recovery, health).
- **`scheduler-query-benchmarks.test.ts`** — per-query latency and `EXPLAIN`
  plans for `ScheduledJobRepository` / `ScheduledTaskRepository`.

They live here beside the other scheduling integration tests, not in
`@n8n/performance` or `@n8n/benchmark`.

## KPIs

| KPI | Reports | Pass condition |
|-----|---------|----------------|
| **Capacity** | sustained fires/sec on one node (claim → start → complete) | every fire ran once; ≥ floor |
| **Punctuality** | lateness vs due time (p50/p95/p99) under a due-at-once burst | whole burst fired; p99 under the 30s warning |
| **Recovery** | wall-clock to drain a crashed-node backlog | all recovered once; within budget |
| **Health** | peak finished-but-unpruned rows while retention prunes concurrently | stays bounded; fully drained at end |

Concurrency per dialect: Postgres runs each worker as its own `DataSource`
(parallel claims kept disjoint by `FOR UPDATE SKIP LOCKED`). SQLite is
single-instance — its pooled driver funnels every write through one connection,
so workers share one `DataSource` and claims queue on that writer.

## Running

Set `N8N_SCHEDULER_BENCHMARK=1` (both suites are `describe.runIf`-skipped
without it) and reuse the scheduling-integration scripts, filtered by file name.

```sh
# SQLite
N8N_SCHEDULER_BENCHMARK=1 pnpm --filter n8n test:sqlite scheduler-benchmarks

# Postgres via testcontainers (needs Docker; on Colima add the socket override)
N8N_SCHEDULER_BENCHMARK=1 \
  TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock \
  pnpm --filter n8n test:postgres:integration:tc scheduler-benchmarks

# Postgres against a running instance (DB_POSTGRESDB_* set)
N8N_SCHEDULER_BENCHMARK=1 pnpm --filter n8n test:postgres scheduler-benchmarks
```

Default run: ~50s SQLite, ~110s Postgres (laptop-class). Results print to stdout
via `console.log`, one block per benchmark; nothing is written to disk. Vitest
buffers per-test logs, so capture with a redirect:

```sh
N8N_SCHEDULER_BENCHMARK=1 pnpm --filter n8n test:sqlite scheduler-benchmarks > bench.log 2>&1
grep -A20 'scheduler-benchmark ·' bench.log
```

The tables here and in `benchmark-baseline.md` are hand-captured from that stdout.

### Workload env vars

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
| `N8N_SCHEDULER_BENCHMARK_CHURN_RETENTION_LIMIT` | 1000 | rows pruned per retention sweep |
| `N8N_SCHEDULER_BENCHMARK_CHURN_RETENTION_INTERVAL_MS` | 100 | delay between retention sweeps |
| `N8N_SCHEDULER_BENCHMARK_CHURN_SAMPLE_INTERVAL_MS` | 50 | live/finished sampling interval |
| `N8N_SCHEDULER_BENCHMARK_CHURN_MAX_FINISHED_ROWS` | 5000 | ceiling on finished-but-unpruned rows |

## Reading the results (min-interval decision)

- **Capacity** ÷ schedule count = safe floor on the shared minimum interval; keep
  a wide margin. SQLite's single writer warrants more conservative cadences than
  Postgres despite its lower local-file latency.
- **Punctuality** p99 is the worst-case lateness in a thundering herd (e.g. all on
  `0 * * * *`); nearing the 30s threshold means the cadence is too tight.
- **Recovery** is the crash blast-radius. The reaper takes no row lock, so many
  concurrent recoverers duplicate work — prefer a modest reaper count.
- **Health** peak unpruned rows is the bloat signal (PG dead tuples / SQLite file
  growth); staying well below total fired proves retention keeps pace.

## Observed numbers (local, laptop-class, default workload)

Indicative only, hardware-dependent — for orientation, not thresholds.

| KPI | SQLite | Postgres |
|-----|--------|----------|
| Capacity (fires/sec, one node) | ~5,100 | ~2,500 |
| Punctuality p99 under a 20k burst | ~3.5s | ~7.8s |
| Recovery of 20k stranded schedules | ~11s | ~35s |
| Health peak unpruned (of 100k fired) | ~700 | ~600 |

Postgres capacity is lower because each fire is three sequential write
round-trips to a container over loopback; the point is the per-dialect shape.

## Query profiling

`scheduler-query-benchmarks.test.ts` runs each hot query against a large mixed
corpus (default 100k tasks / 50k jobs: mostly terminal history, some
pending/due, some running/expired) and reports latency p50/p95/p99 and the
`EXPLAIN` plan, flagged index vs full scan. A full scan is reported as an
optimization candidate, not asserted. Sizes override via
`N8N_SCHEDULER_QUERY_TASK_ROWS`, `_JOB_ROWS`, `_ITERS`, `_BATCH`, `_WRITE_BATCH`,
`_WRITE_JOB_BATCH`.

Reads — p99 (ms) and plan:

| Query | SQLite | Postgres | Plan |
|-------|--------|----------|------|
| `ScheduledTask.getMetricSnapshot` | ~9 | ~12 | index (runAt + leaseExpiresAt partials) |
| `ScheduledTask.claimDueTasks` | ~5 | ~6 | index (runAt partial) |
| `ScheduledTask.findExpiredLeases` | <1 | ~1 | index (leaseExpiresAt partial) |
| `ScheduledTask.deleteFinishedOlderThan` | ~1.5 | ~15 | index (finishedAt partial) + status filter |
| `ScheduledJob.claimDue` | ~1.5 | ~3.5 | index (nextRunAt partial) |

Writes — rows/sec (SQLite / Postgres): `insertIgnoringDuplicates` ~100k / ~34k,
`insertMany` ~33k / ~17k, `advanceMany` ~127k / ~49k.
