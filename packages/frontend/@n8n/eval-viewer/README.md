# @n8n/eval-viewer

A local viewer for AI builder eval runs. The package is private. It is never published.

## Run it

```bash
# From the repository root. Each run folder is one arm; the first arm is the baseline.
pnpm eval:view pool-off-adv-h3 adv8-on

# The same, from the package
pnpm --filter @n8n/eval-viewer run view pool-off-adv-h3 adv8-on
```

`pnpm view` is a built-in pnpm command, so the package script needs `run`.

A run is a path (absolute, or relative to where you called pnpm) or a folder name in the eval
root. The eval root is `~/n8n-6071-evals`. Set `EVAL_VIEWER_ROOT` or `--root <dir>` to change it.

The command does these steps:

1. It extracts the data of each run to `<tmp>/n8n-eval-viewer/<runs>/` (`--out <dir>` changes this).
2. It builds the app with `vite build` when `dist/` is missing or older than the app source.
3. It serves the app and the data on `127.0.0.1` and opens the browser. Press Ctrl-C to stop it.

Options: `--port <n>` (default: a free port), `--no-open`, `--extract-only` (also `pnpm --filter
@n8n/eval-viewer extract <runs>`).

The command does not need an n8n build. It reads only the run folders.

### Why a local server

The app is a prebuilt Vite app plus JSON data, served by a small `node:http` server
(`src/cli/view.ts`). Browsers do not load module scripts from `file://`. One self-contained HTML
file would have to embed all transcripts. The server also gives the "Raw LLM debug page" link
without a copy of the 68 MB page: it serves only the debug pages that the extractor listed.

## Data sources

Per run folder (a pool folder holds symlinks to sub-folders of several runs):

| File                             | Level      | Used for                                                                                                                                                                         |
| -------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `summary.json`                   | run        | per-build metrics (`cases[].trials[]` by thread), case and run totals and medians, as `compare.py` reads them                                                                    |
| `*/eval-results.json`            | sub-folder | transcripts (`transcriptPerRun`, full tool input and output), `threadIds`, `buildErrorPerRun`, scenario runs by `workflowId` for the first-build metrics                         |
| `*/eval-rows.jsonl`              | sub-folder | one row per scenario run: scenario name, description, data setup, success criteria, verdict, judge reasoning and root cause, execution errors, expectations, final workflow JSON |
| `*/workflow-eval-llm-debug.html` | sub-folder | model steps per thread: timestamp, step time, raw usage, tool calls (parsed by the extractor, never embedded)                                                                    |

Matching rules:

- An iteration is one entry of `transcriptPerRun`. Its thread is `threadIds[i]`.
- Scenario rows match an iteration by thread id. Rows without a thread id match by case and
  `_iteration`.
- Metrics match by thread id in `summary.json`.
- Model steps match by the thread id in the debug page. The page lists the agent runs of a thread
  in order. A transcript turn lists its runs in `runIds`. The extractor gives each run to its turn.
- First-build metrics follow `firstbuild.py`: scenario runs link to a build by the `workflowId`
  of its `build-workflow` results.

A run folder without `summary.json` still shows transcripts, steps and verdicts, but no metrics.
Run `summarize.py` on it first.

## Derived values

The harness records no tool execution time (`performance.toolExecutionMs` is empty). The viewer
derives a tool window: the gap between the end of a model step (timestamp plus step time) and the
start of the next step of the same run. The window holds the tool run and harness overhead. When
one step made several calls, they share the window. The tool donut and the sunburst split it
evenly. A tool call in the last step of a run has no window. The UI labels all of these values as
derived.

Tokens per tool are also derived: a tool gets the input and output tokens of the model step that
called it, split evenly between the calls of that step.

## Schema

`src/schema.ts` defines the data with zod. The extractor writes:

- `index.json` (`ViewerIndex`): arms (one per run folder) with totals from `summary.json`, cases,
  and iteration summaries (metrics, first-build facts, scenario runs, expectations, tool stats).
- `iterations/<id>.json` (`IterationDetail`): turns with transcript items and model steps, and the
  final workflow JSON. The app loads one file when you open an iteration.

## Develop

```bash
pnpm --filter @n8n/eval-viewer test       # extractor unit tests
pnpm --filter @n8n/eval-viewer typecheck
pnpm --filter @n8n/eval-viewer lint
pnpm --filter @n8n/eval-viewer build:app  # the view command does this when needed
```

The package has no `build` script, so the repository build does not build the viewer.
