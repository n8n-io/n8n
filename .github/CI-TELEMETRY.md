# CI Telemetry

Pipeline: **GitHub Actions → Webhook → n8n → BigQuery**

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
| Playwright perf/benchmark | `packages/testing/playwright/reporters/metrics-reporter.ts` | Any metric attached via `attachMetric()` |
| Build stats | `.github/scripts/send-build-stats.mjs` | Per-package build duration, cache hit/miss, run total |
| Docker stats | `.github/scripts/send-docker-stats.mjs` | Image size per platform, docker build duration |
| Container stack | `packages/testing/containers/telemetry.ts` | E2E stack startup times per service |

## Secrets

```
QA_METRICS_WEBHOOK_URL
QA_METRICS_WEBHOOK_USER
QA_METRICS_WEBHOOK_PASSWORD
```

## BigQuery Table

`qa_performance_metrics` — schema:

```sql
timestamp        TIMESTAMP NOT NULL
benchmark_name   STRING
metric_name      STRING NOT NULL
value            FLOAT64 NOT NULL
unit             STRING
dimensions       JSON                 -- {"nodes": 10, "trigger": "kafka", "package": "@n8n/cli"}
git_sha          STRING
git_branch       STRING
git_pr           INT64
ci_run_id        STRING
ci_run_url       STRING
ci_job           STRING
ci_workflow      STRING
ci_attempt       INT64
runner_provider  STRING
runner_cpu_cores INT64
runner_memory_gb FLOAT64
```

Query example:
```sql
-- Build duration trend by package (cache misses only)
SELECT DATE(timestamp), JSON_VALUE(dimensions, '$.package'), AVG(value)
FROM qa_performance_metrics
WHERE metric_name = 'build-duration'
  AND JSON_VALUE(dimensions, '$.cache') = 'miss'
GROUP BY 1, 2 ORDER BY 1;
```

## Adding New Telemetry

**From a script:**
```javascript
import { sendMetrics, metric } from './send-metrics.mjs';

await sendMetrics([
  metric('my-metric', 42.0, 'ms', { context: 'value' }),
]);
```

**From a Playwright test:**
```typescript
import { attachMetric } from '../utils/performance-helper';

await attachMetric(testInfo, 'my-metric', 42.0, 'ms', { context: 'value' });
```
