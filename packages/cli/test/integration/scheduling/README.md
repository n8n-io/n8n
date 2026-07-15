# Durable scheduler benchmarks (CAT-3623)

Performance benchmarks for the durable scheduler, run against **both** SQLite
(single-writer) and Postgres (SKIP LOCKED, dead-tuple churn) so the two can be
compared on the same numbers. They inform the
[minimum-interval policy and conservative SQLite cadences](https://linear.app/n8n/issue/CAT-3623)
decision.

They live here — `scheduler-benchmarks.test.ts`, next to the other scheduling
integration tests — rather than in `@n8n/performance` or `@n8n/benchmark`, on
purpose (see below).

## The KPIs

| KPI | Operator question | What it reports | Pass condition |
|-----|-------------------|-----------------|----------------|
| **1 · Capacity** | How many schedule fires per second can one node handle? | sustained fires/sec end-to-end (claim → mark started → complete), translated to "N schedules every X s" | every fire ran once; ≥ floor |
| **2 · Punctuality** | Will my jobs fire on time when many come due at once? | how late each fire was vs its due time, p50/p95/p99, under a due-at-once burst | whole burst fired; p99 under the 30 s late-dispatch warning |
| **3 · Recovery** | If a node dies mid-run, how fast does its work resume? | wall-clock to recover a stranded (crashed-node) backlog | all recovered exactly once; within the time budget |
| **4 · Health** | Does the scheduler's table stay bounded (no DB bloat)? | peak live rows under sustained churn vs total fired | table stays ≤ one batch; fully drained; retention keeps up |

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
| `N8N_SCHEDULER_BENCHMARK_CHURN_CYCLES` | 20 | churn cycles (KPI 4) |
| `N8N_SCHEDULER_BENCHMARK_CHURN_BATCH` | 5000 | fires per cycle (KPI 4) |
| `N8N_SCHEDULER_BENCHMARK_CHURN_MIN_FPS` | 50 | churn floor (fires/sec) |

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
- **Health** staying bounded is what lets retention briefly fall behind without
  the DB bloating (Postgres dead tuples / SQLite file growth).

## Observed numbers (local, laptop-class, default workload)

Indicative only — hardware-dependent. Captured for orientation, not as thresholds.

| KPI | SQLite | Postgres |
|-----|--------|----------|
| Capacity (fires/sec, one node) | ~5,300 | ~2,400 |
| Punctuality p99 under a 20k burst | ~3.5s | ~7.1s |
| Recovery of 20k stranded schedules | ~11s | ~28s |
| Health peak rows (of 100k fired) | 5,000 | 5,000 |

Postgres capacity is lower here because each fire is three sequential write
round-trips (claim, mark started, complete) to a container over the loopback;
the point is the per-dialect *shape*, not the absolute number.
