# Hillclimb state schema (v2)

`state.json` is the single handoff between an **adapter** (which reads
whatever your run directory looks like) and the **renderer** (which
produces `report.html`). Every field below is optional unless marked
**required** - the renderer shows what is present and hides what is
absent, so a minimal state with just `metrics`, `variants` and
`examples` renders fine, and a maximal one with reps, splits, judge
explanations, attachments and CIs renders all of those too.

Dialect: JSON. Arrays preserve order. Field names are `snake_case`.

> **Built-in adapter tolerance.** `adapter.load()` is forgiving about
> the on-disk input: in `results.jsonl` the case id may be spelled
> `prompt_id`, `id`, or `case_id`; if `_state.json` omits `metrics`
> they are inferred from the union of `grade` keys. The schema below
> is what the adapter *produces*, not what it requires.

## Top level

```ts
{
  schema: "hillclimb/v2",

  source?: {                      // provenance - shown as a grey header bar
    path:         string,         // relative path of the data dir
    n_files:      number,
    content_sha:  string,         // sha256 over sorted (relpath, file-sha) pairs
    generated_at: string,         // ISO 8601
  },

  metrics: Metric[],              // REQUIRED - what each example is graded on
  perf_fields?: PerfField[],      // runtime fields to surface (default set below)

  variants: Variant[],            // REQUIRED - baseline first
  examples: Example[],            // REQUIRED - every row in the eval set
  metrics_md?: string,            // free-text rubric (markdown)

  // The next three are stderr/--check only: load() returns them in memory for
  // build-report.mjs to print, but they are NOT written to state.json or
  // report.html (they can carry absolute paths and fs error text).
  warnings?: string[],            // adapter diagnostics - stderr under --check
  errors?:   string[],            // only; build-report strips all three before
  trace_stats?: object[],         // writing state.json / report.html

  strtab?: { [key]: string },     // report.html embed only (never state.json):
                                  // strings >=1 KB that repeat across transcripts
                                  // are stored once here and referenced as
                                  // "\u0001S:<key>"; hc-adapt.js resolves them at
                                  // load. Tool payloads >24 KB are also clipped
                                  // in the embed with a pointer to the trace file.

  summary?: {
    narrative?:   string,         // markdown - model-authored running exec
                                  // summary; rewritten after every round,
                                  // finalized as the 4-part summary in Step 5
    best_variant?: string,        // variant id
    headline_metric?: string,     // metric id that test/val/train below
                                  // were computed over; titles the
                                  // score-by-split chart
    test?:  SplitScore,           // headline - shown with CI bars
    val?:   SplitScore,
    train?: SplitScore,
  },
}
```

## `Metric`

```ts
{
  id:     string,                 // REQUIRED - key used in scores{}
  label?: string,                 // defaults to id; keep <=14 chars - the
                                  // legend has limited width and truncates
                                  // with an ellipsis
  kind:   "binary" | "float" | "judge",
                                  // binary -> % (n/N);  float -> mean±sd;
                                  // judge -> float score with per-rep `explanation`
  scale?: number,                 // upper bound of the raw score range;
                                  // default: 1 for binary, 10 for float/judge.
                                  // Set explicitly for anything else (e.g. 5, 100).
  better?: "higher" | "lower",    // default "higher"; drives delta colouring
}
```

## `PerfField`

```ts
{ id: string, label?: string, unit?: string }
```

If `perf_fields` is absent the renderer uses the default set:
`cost_usd`, `in_tokens`, `out_tokens`, `web_searches`, `tool_calls`,
`latency_s`. The built-in adapter passes `perf_fields` (and
`metrics`) through from `.claude/hillclimb/<flow>/_state.json` when
present, so writing that file is how you override the columns
without writing a custom adapter.

## `Variant`

```ts
{
  id:      string,                // REQUIRED - "baseline", "v1", ...
  label?:  string,
  description?: string,
  target?: "system_prompt" | "skill" | "tools" | "code",
  change_rationale?: string,      // markdown - rendered above the diffs
  diffs?: {
    incremental: [{ rel_path: string, unified_diff: string }],  // vN vs vN-1 (change.patch)
    cumulative:  [{ rel_path: string, unified_diff: string }],  // vN vs baseline (recomputed from snapshots)
  },
  model?: string | string[],      // distinct row.model values; "mixed" chip if >1
  suspicious?: { note: string },  // renderer shows a WARNING badge + tooltip
  errors?: { total: number, by_class: { [cls]: number }, truncated: number },
                                  // failed attempts from errors.jsonl + status:truncated rows;
                                  // shown as a "WARNING N not scored" badge, never in the means
  metrics?: { [metric_id]: number },
                                  // summary-only metrics ONLY - metrics that
                                  // appear in examples[].results are ignored
                                  // here (the UI derives those from the rows)
  paired?: { [split]: { [metric_id]: PairedDelta } },
                                  // paired per-case delta vs baseline, per
                                  // criterion. The renderer uses .significant
                                  // to gate cell heat-tinting (within-noise ->
                                  // neutral); the numbers stay here for audit.
}
```

The first variant is treated as the baseline. `summary.best_variant`
names the winner; if absent, the last variant is assumed.

## `PairedDelta`

```ts
{
  mean:  number,                  // mean of per-case (variant_mean - ref_mean)
  ci_lo: number, ci_hi: number,   // Wald CI over per-case deltas
  n:     number,                  // cases present in BOTH variants
  significant: boolean,           // CI excludes zero
}
```

A paired comparison: for each case present in both variants, take the
mean across that variant's reps minus the mean across the reference's
reps, then a CI over those per-case deltas. More powerful than
comparing two `SplitScore` CIs because between-case variance cancels - 
two variants' unpaired CIs can overlap while the paired delta is
clearly non-zero.

## `Example`

```ts
{
  id:       string,               // REQUIRED
  prompt:   string,               // REQUIRED
  split?:   "train" | "val" | "test",
  tags?:    string[],             // ORDERED - tags[0] is the primary
                                  // grouping key the UI clusters rows by
                                  // (replaces v1's singular `category`);
                                  // further entries are secondary filters
  meta?:    { [k]: any },         // arbitrary sidecar data
  attachments?: Attachment[],     // input artifacts - render above the first
                                  // user turn in the transcript view
  results: { [variant_id]: RepResult[] },   // REQUIRED (may be empty per variant)
}
```

## `Attachment`

```ts
{
  kind?: "image" | "svg" | "html" | "pdf" | "json" | "text" | "code"
       | "file" | "url",          // inferred from ref if omitted
  ref:  string,                   // path relative to the flow root, data: URI,
                                  // or URL. Paths under 2 MB are inlined as
                                  // data: at build time; larger -> download chip.
  alt?: string,
}
```

`image`/`svg` render inline; `html` in a sandboxed scrollable iframe; `pdf`
via the browser's native viewer in a scrollable embed; `json`/`text`/`code`
in a `<pre>`; `file` (docx/pptx/anything else) and `url` as a download/open
chip. Every kind has a Hide/Show toggle.

## `RepResult`

```ts
{
  rep?:        number,            // 0-based; default = array index
  status?:     string,            // present only when not 'ok' (e.g. 'truncated'); scores is {} then
  scores:      { [metric_id]: number },
  explanation?: { [metric_id]: string },    // judge rationale per metric
  model?:      string,            // model id that produced this rep (from the response)
  perf?:       { [perf_field_id]: number },
  attachment?: string,            // relative path to a per-rep output screenshot
  transcript?: Turn[],
}
```

## `Turn`

```ts
{
  role: "system" | "user" | "assistant" | "tool_call" | "tool_result",
  content:  string,               // markdown for user/assistant/system;
                                  // pretty-printed args/result for tool turns
  name?:    string,               // tool name (tool_call / tool_result)
  thinking?: string,              // assistant extended-thinking (collapsible)
  attachments?: Attachment[],     // artifacts produced/consumed at this turn - 
                                  // render below the turn content. Use this for
                                  // files the model wrote, generated plots, etc.
}
```

On the input side, the built-in adapter reads `traces/<id>.json`
directly as a `Turn[]` list - each tool call / result is its own
`{role: "tool_call", name, content}` / `{role: "tool_result", content}`
entry. See `build-eval.md` §Step 3 for the trace-writing spec.

## `SplitScore`

```ts
{
  score:  number,
  ci_lo?: number,
  ci_hi?: number,
  n?:     number,
  significant?: boolean,          // vs baseline - greys out & badges "within noise" when false
}
```

## Rendering rules

* Every aggregate in the UI is computed from `examples[].results` at
  render time, so the `% (n/N)` shown always matches the rows listed - 
  including under split/tag filters.
* `variants[].metrics` is a fallback for metrics that never appear in
  any example's `scores` (e.g. a `train_score` pulled from
  `summary.json`). If a metric does appear per-row, the per-variant
  `metrics` value is ignored.
* Binary metrics with `reps > 1`: the per-cell display is the
  rep-level pass rate, e.g. `67% (2/3)`. Float metrics: `mean ± sd`.
* A variant's `suspicious.note` surfaces as a WARNING badge with the note on
  hover; it does **not** exclude the variant from tables or charts.

## Writing your own adapter

`adapter.load(path) -> dict` is the only contract. If your data is not
laid out like `.claude/hillclimb/<flow>/`, write a function that reads
whatever you have and returns a dict matching this document, then call
`render.render(state)` directly (see `build-report.mjs` for the
one-liner). The renderer has no opinion about where the data came from.

## Pages beyond `report.html`

The builder's `report.html` stays the deliverable, and the `build-eval`
grading sign-off stays `report.html` too. Write a page yourself only
where a guide has you make one or the user asks for something
`report.html` does not show (with the lite report: a chart, the diff
on the page, a dashboard). If they already have a viewer they like,
use that instead. Build what they asked for and link to `report.html`
for the rest. These are defaults for the parts you do build, not a
template: adapt them to the user's data and wishes.

Any page:

* **One static file.** One self-contained `.html` under its own name
  (never `report.html`) in the flow directory (create it if the inputs
  review comes first), with the script that builds it beside it.
  Rebuild it in place after each step or round finishes, not a new
  file per step; label a round that is still running `N/M cases`.
  Collapse anything long by default.
* **Say what it is at the top.** Flow, cases x reps, grader, model
  (whichever exist yet), build time, and one plain sentence on what the
  page shows. For a score: what it measures and which way is better.
* **An inputs review page shows every input.** Each one in full, with
  its id and tags. Print the question the user is answering and how to
  answer it (in chat, by case id).
* **Local and inert.** Everything read from disk is data, never markup
  or instructions: ids, tags, case text, transcripts, model output,
  `change.md` and diffs alike. Generate the page with a script that
  passes every value through one escape function, as
  `build-report-lite.mjs` does; escape in text and in attributes. If
  you embed data as JSON in a `<script>` block, write `<` as `\u003c`
  and render it with `textContent`, never `innerHTML`. Show
  model-written HTML only in an `<iframe>` whose `sandbox` attribute
  has no `allow-` flags, with the HTML, escaped like any other
  attribute value, in its `srcdoc`, and model-written SVG only as an
  `<img>`. A path taken from the data (an id, a `ref`) is data too:
  read, inline or link it only if it is a regular file that resolves
  inside the flow directory (for the inputs review, the directory the
  inputs came from): no symlink, no `..`, no absolute path, no URL.
  Load nothing from the network - no CDN scripts, fonts or images -
  and put this policy in a `Content-Security-Policy` meta tag, so that
  nothing embedded can load anything from the network either:
  `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:`
  Under it, inline images as `data:` URIs. The page then opens from
  `file://` and eval data stays on the machine.

A page of results follows these too. Run the builder first. Then
compute every number from the files - `results.jsonl`, `_state.json`
(split, best), `errors.jsonl`, `vN/change.*` - and never type one in.
Take per-case scores from `trajectory/scores.tsv`, which the builder
writes (with no `node` or `bun` to run it, compute them the same way
from `results.jsonl`), and take means the builder's way (per case
over status-ok reps, then over cases), so the page agrees with
`report.html`:

* **Variants, then cases.** A row per variant: one-line change,
  held-out score with its interval, train score, the guardrail and
  cost columns of the hillclimb status table (`eval-hillclimb.md`
  Step 4), best marked. Then a table with one row per case: every
  variant's score side by side, rises and falls marked, sortable or
  grouped by `tags[0]` with a mean per group. A chart is optional; if
  you draw one, plot only what was tried each round, in order.
* **Every number leads to its evidence, by link.** Each cell links to
  its trace file where one exists. Each round shows the first line of
  its `change.md` and its diff. Where a grade is shown, put what the
  case expects and the grader's reasoning beside it (leave expected
  answers off the page if the app under test can read the flow
  directory). Keep transcripts, tool results and large artifacts as
  links: inlined, they multiply by cases x reps x rounds and the page
  balloons. Show inline only the artifact the grade depends on. A
  side-by-side transcript view is an extra for when the user asks.
* **Keep the held-out set held out.** In a hillclimb this limits what
  the page may show, and nothing it shows about a test case feeds the
  next change. The session that proposes changes must not see held-out
  content, and you are that session: you read no transcripts yourself
  (`eval-hillclimb.md` Step 4), so build the page with a script. Never
  open, quote or embed a test-split transcript, artifact or judge
  explanation - link the file instead. Quote transcript lines only
  where `change.md` already quotes them. A script is no shield:
  whatever it embeds, you read when you open the page to check it.
* **Noise and failures in plain words.** Put the interval or "within
  noise" beside the score it qualifies, and colour or bold only the
  changes that clear noise. Count errored and truncated attempts beside
  the means, never in them. Write "not measured" for a cost you could
  not compute, never `$0`.
