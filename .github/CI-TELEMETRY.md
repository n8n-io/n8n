# CI Telemetry

Pipeline: **GitHub Actions → Webhook → n8n → BigQuery**

## Standard Data Points

All telemetry includes these fields for correlation:

```typescript
// Git context
git.sha         // GITHUB_SHA (first 8 chars)
git.branch      // GITHUB_HEAD_REF ?? GITHUB_REF_NAME
git.pr          // PR number from GITHUB_REF

// CI context
ci.runId        // GITHUB_RUN_ID
ci.job          // GITHUB_JOB
ci.workflow     // GITHUB_WORKFLOW
ci.attempt      // GITHUB_RUN_ATTEMPT

// Runner detection
runner.provider // 'github' | 'blacksmith' | 'local'
runner.cpuCores // os.cpus().length
runner.memoryGb // os.totalmem()
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
| Build stats | `.github/scripts/send-build-stats.mjs` | Per-package build time, cache hits |
| Container stack | `packages/testing/containers/telemetry.ts` | E2E startup times |

## Secrets

```
BUILD_STATS_WEBHOOK_URL
BUILD_STATS_WEBHOOK_USER
BUILD_STATS_WEBHOOK_PASSWORD  # Alphanumeric + hyphens only (no $!#@)
```

## Adding New Telemetry

1. Copy data point helpers from `send-build-stats.mjs`
2. Create n8n workflow: Webhook (Basic Auth) → Code (flatten) → BigQuery
3. Add secrets to GitHub
