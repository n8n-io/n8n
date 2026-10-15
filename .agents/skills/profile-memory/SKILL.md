---
name: n8n:profile-memory
description: >-
  Records and compares local backend memory with the repo profiling commands.
  Use before changes to cache lifetime, retained references, large payloads,
  streaming, concurrency, or startup dependencies that can affect memory.
  Also use to investigate backend memory growth or analyze a saved recording.
---

# Profile backend memory

Recommend a short before-and-after recording when the change has a credible
memory effect. Explain the expected effect, local instance, workload, and run
time. Request profiling permission if the task does not already authorize it.
Reuse permission already granted for that scope. If the user declines, continue
the implementation and report that its memory effect was not measured.

Collect the baseline before editing the relevant behavior. If the implementation
already changed, use an isolated baseline checkout. Preserve the user's working
tree. Use equivalent data and the same machine, runtime, launch mode, workload,
warm-up, duration, and sampling settings.

## Record

Run from the repository root. The checkout needs current backend build outputs.
Use a persistent process tool so you can drive the workload while recording.

For frontend hot reload, run `pnpm --silent dev:profile` with the recording
options below. Read `editorUrl` from status. The command starts the backend,
compiler, and frontend. It measures the backend.

```bash
pnpm --silent profile:memory record --duration 120s --warmup 30s --workload workflow-execution --no-open --json --output .context/memory-profiles/before
```

Choose a representative workload and name it with `--workload`. Wait until this
command returns `ready: true` before you start the workload:

```bash
pnpm --silent profile:memory status --session .context/memory-profiles/before --json
```

Add markers with `mark --session <directory> --label <action> --json`. Stop early
with `stop --session <directory> --json`. Use `pause` and `resume` with the same
session argument to suspend and restart capture without stopping servers. The
duration counts active capture time. Pauses make a controlled comparison
ineligible. Each command writes machine-readable output. Use a new output directory for each recording. Use `--help --json` to
discover defaults and units.

To attach, add `--url <backend-url> --inspector <Inspector-http-or-ws-url>`.
Stopping the recording leaves an attached backend running. For a separate local
instance, select its data directory through `N8N_USER_FOLDER`. Keep sensitive
values in environment variables. Do not reset or seed an existing instance
without authorization.

Heap snapshots pause the backend and need extra memory. Capture one only as an
explicit diagnostic action with `snapshot --session <directory> --json`.
Normal recording does not force GC. Use `--churn` only when allocation turnover
is relevant, and use the same mode for both recordings.

## Compare

After the change, repeat the same workload and settings in a new `after`
directory. Then run:

```bash
pnpm --silent profile:memory compare .context/memory-profiles/before/session.json .context/memory-profiles/after/session.json --json
```

Read `comparable` and `issues` before interpreting changes. The comparison sets
no regression threshold. Repeat the workload if variation prevents a clear
conclusion. Use `report --input <session.json> --json` to inspect allocation sites.

Report the measured process coverage, peak and endpoint memory changes, relevant
allocation sites, artifact paths, and uncertainty. Distinguish allocation sites
from retention paths. Do not claim a reduction from one noisy run or equate
sampled JavaScript memory with total RSS. Note gaps and process restarts.

For viewer commands, file formats, and snapshot analysis, read the
[recording guide](../../../packages/quality/efficiency/memory/session/README.md).
