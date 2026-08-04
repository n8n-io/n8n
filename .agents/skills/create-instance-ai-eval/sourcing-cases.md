# Sourcing cases from real failures (LangTracer + LangSmith)

The strongest cases encode a **real** failure, not an invented premise. Two
connections help you find one and confirm it — and neither is usually the
durable artifact. You author a synthetic case from what you learn (reach for
`seed.mode: "replay"` only per [`case-shapes.md`](case-shapes.md)).

- **LangTracer — discover.** It ingests real Instance AI conversations and
  clusters them into **capability-gap themes** ("what fails, at scale"), and
  stores each analysed conversation. Use it to find high-frequency real failures
  worth encoding, instead of guessing a failure mode.
- **LangSmith — verify.** Eval runs and prod conversations land in LangSmith as
  raw traces. When a finding or a flaky result is ambiguous, read the raw trace
  to confirm exactly what happened — which tool calls fired, and their payloads.

## Connect the LangTracer MCP

The hosted instance exposes a streamable-HTTP MCP at `<base>/api/mcp`, authed
with an `lt_…` bearer (kept in `.env.local`: `LANGTRACER_API_KEY`; the hosted
base is the `LANGTRACER_URL` value). Register it the way your harness registers
MCP servers — e.g. in Claude Code:

```bash
claude mcp add --scope local --transport http langtracer-hosted \
  "<hosted-base>/api/mcp" --header "Authorization: Bearer $LANGTRACER_API_KEY"
```

`--scope local` keeps the key out of committed config. MCP servers load at
session start, so reconnect to pick it up. (The LangSmith MCP is usually already
connected.)

## Discover → verify → encode

1. **Scan cluster themes** — `list_cluster_runs` / `get_latest_cluster_run`
   return capability-gap themes with a `label`, `summary`, and `mechanism`: the
   real, recurring failure modes.
2. **Pull the conversations** — `list_conversations` (e.g. `verdict:"bad"`,
   `analyzed:"yes"`) → `get_conversation` (raw trace) + `get_conversation_analysis`
   (findings). `get_linear_ticket_context` links a thread to its ticket. To target
   **execution failures**, add `funnelDrop:"05"` (built + launched an execution
   that never *succeeded*). **Caveat: the funnel drop is a *conversion* signal, not
   a build-quality one** — most `funnelDrop:"05"` threads are healthy builds that
   correctly routed to credential setup, or the user simply abandoned, so the drop
   alone tells you nothing about the build. **Pair it with `verdict:"bad"`** to
   filter down to threads where the analyser actually flagged a build/execution
   defect (in one sample: 131 raw drops → 18 once `verdict:"bad"` was added).
3. **Verify before trusting a finding.** The analyser keys off tool-call *spans*
   (was `build-workflow` called on this turn?), which it reads reliably — but a
   content-dependent claim ("invented ID", "missing node") can be wrong when it
   couldn't see the built workflow. Confirm against the raw trace before building
   a case around it.
4. **Encode a durable synthetic case** — turn the confirmed failure into an
   authored case ([SKILL.md](SKILL.md), [`case-shapes.md`](case-shapes.md)). The
   failure mode is the anchor; the conversation is yours to write, in the user's
   voice.
5. **Push it to a curated suite** (don't commit the JSON) with
   `eval:langtracer-push` — see
   [Push to a lang-tracer suite](SKILL.md#push-to-a-lang-tracer-suite). Exception:
   seeded cases (any `seed` mode) can't be pushed — the case-write API has no
   `seed` field, so the push lists them under
   `skipped:`. And a `replay` case shouldn't be committed either — it dies when
   its trace is pruned or deleted — so it has no durable home; that's exactly why
   step 4 turns the confirmed failure into a durable synthetic case.

## Scrubbing a real workflow into a synthetic seed

A reviewed real conversation becomes a durable `inline` seed by being scrubbed
**once, at authoring time, with a human reading it** — that is what makes the
committed artifact synthetic by construction, with no run-time gate to trust.
Nothing downstream saves you: the harness strips node credentials on restore and
never seeds data-table rows, but message text, tool-call bodies, node parameters and
sticky notes are restored **verbatim**. What you paste is what runs.

### Get the pre-anchor workflow

Scrub the state the live turn opened on — the last build **before** your anchor turn,
not the thread's final state.

- **The agent built it.** `list_conversation_workflow_builds` returns one row per
  workflow per turn with `seq` / `turnRunId`, so you can identify that pre-anchor
  build; `get_conversation_workflow_build` then returns its content. Read
  `contentStatus` — about one SDK-source build in five stored no JSON, so coverage is
  not a given: `stored-json` is ready to scrub, `compilable-source` means the recorded
  SDK source survived whole and compiles with
  [`parseSeedWorkflowCode`](../../../packages/@n8n/instance-ai/evaluations/harness/parse-seed-workflow.ts),
  and `unrecoverable` / `unrecoverable-intermediate` have nothing to give. **Never
  substitute a later final build** — that is a different workflow state, and the case
  would test the repair rather than the defect.
- **The user brought it.** The editor handed the workflow over and the agent resolved
  it by id, so the workflow is the *output* of the `workflows[get]` call whose input
  carries that id.
- **Nothing recoverable.** A thread imported before build persistence existed has no
  rows at all, and the read says so in a `note` rather than returning an empty list —
  an empty answer is never "the user had no workflow". Hand-author the smallest
  topology that can exhibit the complaint instead. The scrub rule below then has
  nothing to diff against, so the pre-ship checks carry the whole load.

### The rule: scrub values, never shape

| Must survive untouched — this *is* the test | Fair to replace |
|---|---|
| node `type` and `typeVersion` | URLs, hostnames, webhook paths |
| `connections` topology, and the node `name`s that key it | emails, person names, channel names |
| parameter *keys*, and expression structure (`={{ $json.url }}`, `$('Prepare rows')`) | spreadsheet / document / data-table ids |
| structural values: `batchSize`, `resource` / `operation` / `mode`, condition shape | sticky notes, node notes, Code-node literals, sample data |

**Replace type-preserving** — a URL stays a URL, an id keeps its shape and length.
Two reasons beyond readability. Restore validates every node (`id`, `name`, `type`,
numeric `typeVersion`, a two-number `position`, an object `parameters`) and refuses
the whole seed if one is missing, so don't drop fields while you are in there. And
the id remaps are blind whole-document `replaceAll`s: seed workflow and data-table
ids under 8 characters are refused outright, and a short-but-legal token is precisely
how you rewrite an unrelated substring.

**Trim while you scrub.** The seed is one case field — drop `load_skill` bodies and
any tool output the history doesn't need (the storage ceiling is 256KB serialized).
Keep the tool-call blocks the story needs, and keep each one's `output.workflowId`
matching a workflow the seed declares, per [`case-shapes.md`](case-shapes.md).

### Three traps

**Node names are references.** A rename has to reach every `connections` key, every
`$('Old Name')` in an expression, and every mention inside recorded SDK source and
prose — miss one and the workflow silently breaks, which is the over-scrub that makes
the eval pointless. Default to **not renaming**; a node name is rarely identifying on
its own. If you must, `grep -c 'Old Name' <case>.json` has to return 0. (Seeded
*workflow* names are rewritten per run by the harness, which deliberately leaves node
names and tool-call payloads alone for the same reason — and refuses two seeded
workflows that share a name, because the rewrite can't tell which mention means
which.)

**Sometimes the value IS the test.** `queue.fal.run` is load-bearing in
`http-keep-generic-credential-unknown-service`: the case exists because that host has
no dedicated n8n credential, so swapping it for a household hostname grades the
opposite steering. Same for the guessed column identifiers in
`flags-unverified-sql-identifiers`. Expectations also quote values — "posts to
`#growth`", a specific model name — so a replacement has to land in both places, or
be hedged the way the corpus hedges values that aren't the point ("an unset or
placeholder value is acceptable — it's a value to fill in at setup, not a build
mistake"). Scrubbing safely means knowing what the case asserts, which is why this is
a human step and not a blind pass.

**`typeVersion` is not tidying.** Split In Batches v2 declares
`outputNames: ['loop', 'done']`; v3 declares `['done', 'loop']`. Same two outputs,
opposite meaning — so "modernizing" a seeded node's version silently rewires the loop
while the topology stays byte-identical. Leave every version at what the conversation
had.

### The check: only string leaves moved

Diff the `workflowJson` you started from against the workflow you authored into the
case:

```bash
leaves() { jq -r '{nodes,connections} | paths(scalars) as $p | "\($p|map(tostring)|join("."))\t\(getpath($p)|tojson)"' | sort; }
diff <(leaves < original-workflow.json) <(jq '.seed.workflows[0]' <case>.json | leaves)
```

Every line in the diff must be a value you replaced on purpose. A `type`,
`typeVersion`, `connections.*` or structural-parameter line means you moved shape
rather than values; a path on one side only means you dropped or added a leaf.
Non-graph keys (`settings`, `meta`, `pinData`) are ignored, so a raw build JSON
compares cleanly against the trimmed seed workflow. This is the third of
[Before you ship a seeded case](case-shapes.md#before-you-ship-a-seeded-case--three-checks);
the other two — the defect still bites, and the case fails without the seed — are what
catch a scrub that kept the shape and lost the point.

### What the harness already handles

Don't redo these by hand:

- **Node credentials are stripped on restore.** The case's `credentials[]` plus the
  thread's credential pin own that view, and a credential's display name goes with it.
- **Data tables are schema-only, always.** The seed schema has no `rows` field, and a
  `rows` key is refused rather than stripped — so row values, the most sensitive part
  of a trace, cannot ride along by accident.
- **Ids and workflow names are per-run.** Seeded workflow ids are remapped and names
  take a `[seed <8hex>]` suffix, with mentions rewritten in prose and `workflowName`
  fields — but not inside `workflows[].nodes` or tool-call payloads.

Everything else in the seed is yours to sanitise.

## Sourcing a regression baseline (successful builds)

The discover→verify→encode flow above hunts **failures**. The complementary need
— a broad **regression baseline** of things that already work — is sourced the
opposite way: from conversations where a workflow was **built and executed
without errors**. Use `list_conversations` with the **conversion-funnel** filter:

- `funnelStep: '03'` = built a workflow, `'04'` = launched an execution, `'05'` =
  execution succeeded, `'06'` = published (each step is a strict subset — also
  reached every earlier step). For "built + executed cleanly" cases, **`'05'`** is
  the signal; add `language: 'eng'` to keep prompts English.
- The result is large — it spills to a file. Triage by first prompt:
  `jq -r '.data[] | "\(.threadId)\t\(.firstUserPrompt[0:180])"'`. Skip "The
  execution failed…" debugging threads (they didn't cleanly build) and off-topic
  app-build requests.
- Author a **build case** per selected thread (prompt in the user's voice,
  grounded in the real `firstUserPrompt`; note the source thread id in
  `description`). These are `regression`-kind cases whose value is coverage of a
  working capability, not a currently-red gap — you rarely need `get_conversation`
  when the first prompt already specifies the build. Terse prompts almost always
  need a multi-turn director note (see [`case-shapes.md`](case-shapes.md)).

## Two practical notes on `get_conversation_analysis`

- **It hands you draft cases.** The response's
  `aiAnalysis.structured.extractedCases[]` are pre-drafted candidates — each with
  `expectedBehavior`, `proposedCheck`, and `failurePattern` that map almost 1:1
  onto `outcomeExpectations` / `processExpectations`. Start from these rather than
  a blank case (still verify against the raw trace per step 3, and rewrite the
  prompt in the user's voice). `verdict` and `findings` sit alongside them.
- **The payload is large** — tens of thousands of characters, enough to exceed a
  tool's token cap and be spilled to a file. The useful part is
  `aiAnalysis.structured`; `jq` into that (or into `.extractedCases`) rather than
  reading the whole blob.
