# Avalara n8n Fork — Change Reference

This document describes the Avalara-specific changes layered on top of the n8n
upstream and why each one exists.

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `automation` | Holds the avalara CI workflow files. Never diverges from upstream master except for `.github/workflows/avalara.*` and `scripts/run-avalara-actions-local.sh`. |
| `master` | Fast-forward mirror of `upstream/master`. No avalara changes here. |
| `avalara-dev` | Primary development branch. Based on `upstream/master` + all avalara features. PRs targeting avalara customisations go here. |
| `latest-release` | Mirror of the latest upstream `release/2.X.X`. No avalara changes. |
| `avalara-release` | `latest-release` + the avalara feature delta ported from `avalara-dev`. This is what ships. |

---

## CI Pipeline (`.github/workflows/avalara.yml`)

Runs on a schedule (06:00 and 18:00 Pacific) and on manual dispatch.

### Jobs

```
start
  ├── sync_automation      → rebase automation branch from upstream master
  ├── sync_master          → fast-forward master from upstream
  ├── sync_avalara_dev     → merge upstream/master into avalara-dev, build, unit tests
  ├── build_latest_release → reset latest-release from upstream release/2.X.X, build, unit tests
  └── build_avalara_release→ reset avalara-release from upstream release/2.X.X
                             + apply avalara delta from avalara-dev, build, unit tests
```

### Patch Application (`build_avalara_release`)

The avalara delta is computed as:

```bash
git diff upstream/master..origin/avalara-dev \
  -- ':(exclude)pnpm-lock.yaml' ':(exclude)*.lock' \
  > avalara-feature.patch
```

The lockfile is excluded because the release branch lockfile is shaped for the
release deps; applying master-shaped lockfile hunks almost always conflicts. The
lockfile is regenerated after patching so the release branch keeps its dep
versions while picking up any avalara manifest changes.

The patch is applied with `--3way` (3-way merge fallback) and `--whitespace=fix`.

#### Fix: skip deletions of files absent from the release branch

Some files are deleted in `avalara-dev` relative to master (e.g. test files
added to master after the release was cut and then removed in avalara-dev). When
those files never existed on the release branch, `git apply` errors with
`does not exist in index` even though the desired end-state is identical — the
file is already absent.

The fix scans the patch for deleted files and checks each against the release
branch index before applying:

```bash
APPLY_ARGS=(--3way --whitespace=fix)
DELETED_IN_PATCH=$(awk '/^diff --git/{f=$3; sub(/^a\//,"",f)} /^deleted file mode/{print f}' "$PATCH")
if [ -n "$DELETED_IN_PATCH" ]; then
  while IFS= read -r f; do
    if ! git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
      echo "  Skipping deletion of file absent from release branch: $f"
      APPLY_ARGS+=(--exclude="$f")
    fi
  done <<< "$DELETED_IN_PATCH"
fi
git apply "${APPLY_ARGS[@]}" "$PATCH"
```

The same logic is mirrored in `scripts/run-avalara-actions-local.sh` for local
testing without CI.

---

## Feature: `N8N_MIN_SCHEDULE_INTERVAL_SECONDS`

Prevents workflows from scheduling cron triggers that fire faster than a
configured minimum interval. Useful for multi-tenant or shared environments
where excessively frequent schedules can saturate the job queue.

### Configuration (`packages/@n8n/config/src/configs/workflows.config.ts`)

```typescript
@Env('N8N_MIN_SCHEDULE_INTERVAL_SECONDS')
minScheduleIntervalSeconds: number = 0;
```

Set to `0` (default) to disable. Set to a positive integer (e.g. `300` for
5 minutes) to enforce that minimum across all scheduled workflows on the
instance.

### Enforcement (`packages/core/src/execution-engine/scheduled-task-manager.ts`)

`ScheduledTaskManager` receives `GlobalConfig` as its 4th constructor argument
(added to the DI-injected service). At the start of `register()`, before the
cron job is created, it calls `enforceMinScheduleInterval`:

```typescript
private enforceMinScheduleInterval(expression: string, timezone: string): void {
    const minSeconds = this.globalConfig.workflows.minScheduleIntervalSeconds;
    if (minSeconds === 0) return;

    const tempJob = new CronJob(expression, () => {}, undefined, false, timezone || 'UTC');
    const [d1, d2] = tempJob.nextDates(2);
    const intervalSeconds = d2.diff(d1).as('seconds');

    if (intervalSeconds < minSeconds) {
        throw new UserError(
            `Schedule interval too short: expression fires every ${intervalSeconds}s but the minimum is ${minSeconds}s`,
        );
    }
}
```

A temporary `CronJob` is created with `start: false` to compute the two next
firing dates without starting any timers. The interval is derived from those
two dates. If it falls below the configured minimum, a `UserError` is thrown
before any cron registration occurs — so no partial state is left behind.

### Test file (`packages/core/src/execution-engine/__tests__/scheduled-task-manager.min-interval.test.ts`)

A standalone test file (not inside the upstream-synced
`scheduled-task-manager.test.ts`) so upstream merges cannot silently overwrite
the assertions. Uses the master-branch API:

- `ScheduledTaskContext` / `ScheduledTaskGroup` types
- `register()` (not `registerCron()`)
- `deregisterGroup()` in `afterEach`
- `hasGroup()` for the "no cron registered after a failed call" check
- 4-param constructor — no `errorReporter`

Three cases: enforcement disabled (`minSeconds = 0`), interval too short
(throws `UserError`), interval at or above minimum (succeeds).

### Affected test helper (`packages/nodes-base/test/nodes/TriggerHelpers.ts`)

`ScheduledTaskManager` now takes a 4th constructor argument (`GlobalConfig`).
The two call sites in `TriggerHelpers` pass `mock()` as the 4th argument so
the helper continues to satisfy the constructor signature without wiring up
real config.

---

## Local Testing

Run the full pipeline locally without Docker rebuilds:

```bash
bash scripts/run-avalara-actions-local.sh
```

The script mirrors the CI job sequence and applies the same patch-application
logic described above.
