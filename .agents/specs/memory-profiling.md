# Local backend memory profiling

## Scope

Provide one recorder for interactive development and agent workflows. Record
process metrics through the existing Prometheus endpoint. Capture allocation
profiles through Node Inspector. Keep native `.prom`, `.heapprofile`, and
`.heapsnapshot` payloads. Connect them through a versioned session manifest.

The implementation lives in `packages/quality/efficiency/memory/session/`.
The [recording guide](../../packages/quality/efficiency/memory/session/README.md)
defines commands, settings, units, artifacts, and exit codes.

## Entry points

- Root: `pnpm --silent profile:memory <command>`.
- Full development instance: `pnpm dev:profile`.
- Backend development: `packages/cli$ pnpm run dev --inspect-memory`.
- Replay: `packages/cli$ pnpm run inspect-memory-snapshot --filePath=<file>`.
- Shared skill: `.agents/skills/profile-memory/SKILL.md`.

Commands are `record`, `report`, `compare`, `serve`, `status`, `mark`, `pause`, `resume`, `stop`, and
`snapshot`. JSON recording requires a duration and does not open a browser.
Readiness follows startup and warm-up. The duration covers measurement only.
Use the same renderer for a live session and a saved session. Choose available
viewer ports so recordings can open side by side.
Use `localhost` for generated viewer, backend, and editor URLs.
Keep the profiler URL in the launch output. Disable terminal clearing in the
profiling compiler watcher.

Profiling launches inherit database settings from the environment. Support SQLite
and PostgreSQL. Document PostgreSQL setup and explicit environment-file loading
in the recording guide. Exclude database process memory from the profile.

The backend dev command starts the backend and compiler. It uses the existing
editor build. The root `dev:profile` command also starts the frontend dev server.
Choose available ports and configure the frontend proxy for the backend port.
Expose `editorUrl` in status. Wait for both servers before readiness. Point the
viewer link at the editor dev server. Stop both owned servers when recording
finishes. A recording pause leaves both servers running. Exclude frontend memory.
Keep an unbounded interactive viewer open after a
startup failure so the developer can read the error and log location.

## Collection and lifecycle

Measure one backend process and its V8 isolate. Exclude compiler and viewer
memory. Track restarts as separate segments. Save profiles during recording.
Bound startup checks, scrapes, and Inspector requests. Preserve partial artifacts
on failure or interruption. Stop owned processes. Leave attached processes running.

Attach mode requires an Inspector endpoint or an explicit metrics-only choice.
HTTP Inspector discovery can follow restarts on a fixed port. Capabilities and
process coverage must remain visible. Metrics-only mode cannot verify runtime
and configuration, so controlled comparisons reject it.

Use sampling profiles of live objects by default. Offer allocation-churn mode as
an explicit option. Save source locations with each checkpoint. Keep snapshots
explicit because they pause the backend. Use DevTools for detailed object graphs
and retention paths. The viewer can summarize standalone V8 files.

Allow repeated recording intervals within one live session. In the viewer,
**Stop recording** pauses capture and **Start recording** resumes it. **Finish
session** finalizes the recording and stops owned servers. Keep the CLI `stop`
command as final shutdown. Expose `pause` and `resume` commands for agents.
Stop metrics collection, request tracking, and allocation sampling during a
pause. Store interval identity on samples, requests, and allocation checkpoints.
Count the requested duration from active capture time. Preserve pause times in
the manifest. Report comparison limits for recordings with pauses.

## Viewer dashboard

Place recording controls and the layout edit button at the top right of the header.
Show status as a non-interactive badge with a colored dot. Add icons to the header
buttons. Use a divider to separate the layout edit button from recording controls.
Show a spinner beside the backend waiting message until readiness or startup failure.
Keep the waiting icon static when the browser requests reduced motion.
Keep marker and snapshot tools in a dashboard card. Hide recording controls in replay mode.
Place the full-width graph first and the full-width API request table directly below it.
Place marker and snapshot tools beside allocation sites in the middle.
Place statistics, recorded markers, capture details, and saved files at the bottom.
Keep the same reading order on narrow screens. Preserve saved custom layouts.

Use ECharts for the memory chart. Serve its browser bundle locally. Let the
library select axis ticks and numeric ranges. Format memory and elapsed time
with units. Support hover details, slider zoom, and responsive resizing. Vertical
scrolling over the chart scrolls the page without changing the zoom. Break memory
lines at capture gaps and process changes. Show the original elapsed time by
default. Offer a filter that removes recording pauses and scrape gaps from the
displayed time axis. Keep saved timestamps unchanged.

Let developers favorite endpoint patterns by API type, method, and route template.
Show favorite calls on the graph with endpoint labels and timing.
Draw a vertical line at each pinned call's start time across the memory plot.
Use the same color for the line and its request event.
Select a call to inspect nearby samples and a checkpoint from the same interval and process.
Keep all captured calls in the request table and raw artifact. Persist favorites
in browser storage. A saved recording uses the same controls.
Use borderless pins for endpoint favorites and borderless start-time buttons.
Search all displayed request columns without case sensitivity. Highlight matching
text. Show durations as whole milliseconds. Keep saved values unchanged.

Use GridStack for a configurable card dashboard. Serve its bundle and styles
locally. Add a builder mode for moving, resizing, removing, and restoring cards.
Support pointer and keyboard controls. Lock the layout outside builder mode.
Close empty rows automatically. Show a subtle alignment grid in builder mode.
Persist the layout in browser storage and provide a reset action. Browser storage
is scoped to the viewer origin. A viewer on another port has separate settings. Keep cards
available only when their data applies. Preserve removed cards for restoration.
Use a single column on narrow screens.

## Reports and agents

### API requests

Enable a request middleware only for profiling launches. Cover configured internal
and public API prefixes. Publish request start and completion through a Node
diagnostics channel. The recorder subscribes through Inspector and writes events
outside the backend. Record method, route template, status, duration, process,
and time. Exclude headers, query strings, bodies, and parameter values.

Keep all events in `requests.ndjson`. Bound report and viewer request history.
Show request spans on the memory timeline. Let the developer select a request
to focus nearby samples and an allocation checkpoint. Explain that time overlap
does not prove allocation ownership. Detach subscriptions when recording ends.
Attach mode reports whether the backend enabled request tracking.

Write schema version `1` JSON with explicit units. Keep progress on stderr and
one final result on stdout. Write status atomically. Expose readiness, controls,
backend URL, process identity, and capabilities without terminal input.

Record commit, dirty state, runtime, OS, architecture, selected configuration,
launch mode, workload, and sampling settings. Exclude warm-up from statistics.
Use disjoint endpoint windows of up to five samples. Compare equivalent sessions.
Reject missing data, gaps, restarts, and incompatible settings. Set no default
regression threshold for manual workloads. Explain uncertainty and process scope.

The skill recommends a bounded baseline before relevant edits. It explains the
expected impact and run time. It requests permission only if profiling is not
already authorized. It reuses permission for that scope. If declined, it
continues the implementation and reports the missing measurement.

## Implementation TODO

- [x] Root CLI and backend dev/replay entry points.
- [x] Full development command with frontend routing and process cleanup.
- [x] API middleware, request artifacts, timeline association, and focused checks.
- [x] Favorite endpoints and a library chart with optional gap filtering.
- [x] Repeatable start/stop controls with capture intervals and agent commands.
- [x] Configurable card dashboard with persistent layouts and builder controls.
- [x] Bounded collection, warm-up, status, markers, and early stop.
- [x] Inspector sampling and native profile checkpoints.
- [x] Raw scrapes and streamed timeline.
- [x] Attach mode, restart segments, and process ownership.
- [x] Local live/replay viewer and standalone V8 summaries.
- [x] Optional snapshot control with streamed file writes.
- [x] JSON and Markdown reports, comparisons, and source-map lookup.
- [x] Shared skill and agent discovery guidance.
- [x] Complete focused tests, lint, and real-backend verification.

Reproducible scenario runners, automatic regression thresholds, and a custom
retainer explorer remain follow-up work. The existing MemLab helper supports
manual deeper analysis without a new analysis engine.
