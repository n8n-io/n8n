# CI Telemetry

Pipeline: **GitHub Actions → Webhook → n8n → ClickHouse**

The n8n workflow writes each metric to the ClickHouse table `qa.performance_metrics`
within seconds. It also writes the BigQuery table `qa_performance_metrics` until
that table is retired. Read the data from ClickHouse.

## Unified Payload Shape

All telemetry uses the same format:

```json
{
  "timestamp": "2026-03-16T12:00:00.000Z",
  "benchmark_name": "kafka-throughput-10n-10kb",
  "git":    { "sha": "abc12345", "branch": "master", "pr": null },
  "ci":     { "runId": "123", "runUrl": "...", "job": "test", "workflow": "CI", "attempt": 1 },
  "runner": { "provider": "blacksmith", "cpuCores": 8, "memoryGb": 16.0 },
  "metrics": [
    { "metric_name": "exec-per-sec", "value": 12.4, "unit": "exec/s", "dimensions": { "trigger": "kafka", "nodes": 10 } }
  ]
}
```

Container startup payloads also include:

```json
{
  "attempt_id": "uuid",
  "correlation": {
    "profile": "sqlite",
    "shard": "3",
    "worker": "2",
    "retry": 1,
    "restartReason": null
  },
  "stages": [
    {
      "name": "n8n-startup",
      "source": "local",
      "startedAt": "2026-03-16T12:00:00.000Z",
      "elapsedMs": 4200,
      "outcome": "failure",
      "errorMessage": "readiness failed"
    }
  ],
  "failure_phase": "n8n-startup"
}
```

`attempt_id` identifies one stack startup. Join all stage records and attached
Playwright startup evidence with this value. `outcome` is `success`, `failure`,
or `cancelled`. Stage durations are also sent as `stack-startup-stage` metrics
with `attempt_id`, `stage`, `source`, and `outcome` dimensions. `profile` is
resolved from the configured profile or stack shape. Other unavailable
correlation values stay `null`.

## Standard Context Fields

```typescript
git.sha         // GITHUB_SHA (first 8 chars)
git.branch      // GITHUB_HEAD_REF ?? GITHUB_REF_NAME
git.pr          // PR number from GITHUB_REF

ci.runId        // GITHUB_RUN_ID
ci.runUrl       // https://github.com/<repo>/actions/runs/<runId>
ci.job          // GITHUB_JOB
ci.workflow     // GITHUB_WORKFLOW
ci.attempt      // GITHUB_RUN_ATTEMPT

runner.provider  // 'github' | 'blacksmith' | 'local'
runner.cpuCores  // os.cpus().length
runner.memoryGb  // os.totalmem()
```

**Runner provider logic:**
```typescript
if (!process.env.CI) return 'local';
if (process.env.RUNNER_ENVIRONMENT === 'github-hosted') return 'github';
return 'blacksmith';
```

## Implementations

| Telemetry | Source | Metrics |
|-----------|--------|---------|
| Playwright perf/benchmark | `packages/quality/testing/playwright/reporters/metrics-reporter.ts` | Any metric attached via `attachMetric()` |
| Accessibility buckets | `packages/quality/testing/playwright/reporters/a11y-reporter.ts` | Per-bucket axe score, violated rules, violating elements |
| Build stats | `.github/scripts/send-build-stats.mjs` | Per-package build duration, cache hit/miss, run total |
| Docker stats | `.github/scripts/send-docker-stats.mjs` | Image size per platform, docker build duration |
| Dive image efficiency | `packages/quality/efficiency/images/image-efficiency.spec.ts` | Layer content size, estimated waste, efficiency score, and layer count through the shared Playwright reporter |
| Container stack | `packages/quality/environments/containers/telemetry.ts` | E2E stack startup times per service |

## Secrets

```
QA_METRICS_WEBHOOK_URL
QA_METRICS_WEBHOOK_USER
QA_METRICS_WEBHOOK_PASSWORD
```

## ClickHouse Table

`qa.performance_metrics` — schema:

```sql
timestamp        DateTime64(3, 'UTC')
benchmark_name   String
metric_name      String
value            Float64
unit             String
dimensions       String    -- JSON text: {"nodes": 10, "trigger": "kafka", "package": "@n8n/cli"}
git_sha          String
git_branch       String
git_pr           UInt32    -- 0 for a run with no pull request
ci_run_id        UInt64    -- 0 for a run outside CI
ci_run_url       String
ci_job           String
ci_workflow      String
ci_attempt       UInt16
runner_provider  String
runner_cpu_cores UInt16
runner_memory_gb Float64
```

A text column with no value holds `''`, and a number column holds `0`. No column
is NULL. The table has the `build-stats` and `container-telemetry` benchmarks
from 18 November 2026. Earlier rows of these two are in BigQuery only.

Query example:
```sql
-- Build duration trend by package (cache misses only)
SELECT toDate(timestamp) AS day, JSONExtractString(dimensions, 'package') AS package, avg(value)
FROM qa.performance_metrics
WHERE metric_name = 'build-duration'
  AND JSONExtractString(dimensions, 'cache') = 'miss'
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY day, package ORDER BY day;
```

## Adding New Telemetry

**From a script:**
```javascript
import { sendMetrics, metric } from './send-metrics.mjs';

// Fire-and-forget — best-effort telemetry, must never block CI.
sendMetrics([
  metric('my-metric', 42.0, 'ms', { context: 'value' }),
]).catch((err) => console.warn(`[metrics] send failed: ${err.message}`));
```

**From a Playwright test:**
```typescript
import { attachMetric } from '../utils/performance-helper';

await attachMetric(testInfo, 'my-metric', 42.0, 'ms', { context: 'value' });
```
