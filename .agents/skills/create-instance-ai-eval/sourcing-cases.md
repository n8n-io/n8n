# Sourcing cases from real conversations (LangTracer + LangSmith)

The strongest cases encode a **real** failure, not an invented premise. But the
case you keep is always one you **wrote**: a real thread tells you what to test,
and you author the case — prompt, workflow, seed and all — from what you learned.
That is what makes the committed fixture durable and free of anyone's personal
data. The [scrub recipe](#scrubbing-a-real-workflow-into-a-synthetic-seed) below is
that path, and it's the default.

Replaying a thread at run time (`seed.mode: "replay"`) is a **secondary mode**: a
local check that the failure is real, not something to commit. See
[Replaying a thread first](#replaying-a-thread-first-the-secondary-mode).

Two connections make either possible:

- **LangTracer — discover.** It analyses Instance AI conversations and clusters
  them into **capability-gap themes** ("what fails, at scale"). Use it to find
  high-frequency real failures worth encoding, instead of guessing a failure mode.
- **LangSmith — verify.** Eval runs and production conversations land in LangSmith
  as traces. When a finding or a flaky result is ambiguous, read the trace to
  confirm what happened — which tool calls fired, and their payloads.

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
   [Push to a lang-tracer suite](SKILL.md#push-to-a-lang-tracer-suite). An `inline`
   seed rides along with the case. Exception: a `replay` case is refused and listed
   under `skipped:` — it's reconstructed from a trace at run time, so it dies when
   that trace is pruned and has no durable home; that's exactly why step 4 turns the
   confirmed failure into a durable synthetic case.

## Was the workflow handed over? (sourcing an `attach` opening)

Whether the opening turn carries `attach` is a **fact about the thread**, not a
judgement call — and guessing wrong makes the case harder than reality. Read it two
ways, depending on when the thread was imported:

- **Recorded.** Turn 0 of `get_conversation` carries
  `resourceAttachments: [{ "type": "workflow", "id": "…" }]`. That's the editor
  hand-off verbatim. Only kind and ids are stored, never the workflow's name.
- **Inferred**, for threads imported before n8n traced it. The tell is an opening turn
  whose `userMessage` is **empty** — the editor's context block is stripped before the
  trace, so a hand-off where the user typed nothing leaves a blank record. Corroborate
  with an early `workflows[get]` on a workflow the user never named.

Then use the id to recover the workflow itself: find the tool call whose *input*
carries that `workflowId` (usually `workflows[get]`, `full: true`) — its **output** is
the workflow, nodes and connections and parameters, and that is what you scrub into
`seed.workflows`. The id alone is only a join key; it addresses the user's own
instance, so it is worthless by itself.

Two things to expect:

- **The agent may never have read it.** Then you have an id and no content, and the
  workflow is yours to write — keep the topology plausible for the complaint.
- **The opening often has no text at all.** Keep it that way; see the empty-opening
  note in [`case-shapes.md`](case-shapes.md).

## Scrubbing a real workflow into a synthetic seed

A seeded case carries a workflow inside it, and that file is committed and runs for
as long as the case lives. So the workflow has to be **written, not copied**: read
the real one, then author a stand-in that keeps its technical shape and none of its
personal data. One careful pass, with a person reading it, and the committed fixture
is clean from the start — nothing further down the line will clean it up for you.

### What to look for

Identifying data hides in more places than the obvious ones:

- **Parameters** — email addresses, phone numbers, channel names, folder paths,
  spreadsheet / document / table ids, internal hostnames, and any token someone
  pasted into a header or a query string. A token sitting in a parameter is not a
  credential, so nothing strips it for you.
- **Free text inside the workflow** — sticky notes and node notes, string literals in
  a Code node, sample rows in a Set node. Sample rows are often real records.
- **The workflow's own name**, which often carries a company or a person
  ("Acme lead sync", "Chase invoices — Dana"). This repo is public, so a real
  customer's name must not appear anywhere in a case; use a placeholder like
  `Acme Corp`.
- **The earlier messages you seed alongside it** — someone's own wording, their name,
  their employer, links they pasted. Write those turns yourself, in a user's voice.
- **Recorded tool calls, if you keep any.** Measured on a real thread, this is where
  the leaks actually were — the workflow was clean, while the outputs of
  `workflows[list]` / `get` / `get-as-code` and `data-tables[list]` carried a live
  credential id, the project id, the person's entire workflow inventory, table schemas
  down to every column name, and a webhook id. Each `toolCallId` also carries the
  source run id. Read the messages: a regex pass over that seed caught one category out
  of about eight.

Provenance is the one thing worth keeping: note the source thread id in the case's
`description` so anyone can find the original later. An id points at the conversation
without carrying any of it.

### Which version of the workflow to start from

Take the workflow as it stood when the turn you're testing began, not the state it
ended the thread in.

- **The assistant built it.** `list_conversation_workflow_builds` lists each build
  with a `seq` and `turnRunId`, so you can find the one just before your turn, and
  `get_conversation_workflow_build` returns it. Its `contentStatus` says what you
  actually get: `stored-json` is ready to work with; `compilable-source` means only
  the builder's code was kept, which
  [`parseSeedWorkflowCode`](../../../packages/@n8n/instance-ai/evaluations/harness/parse-seed-workflow.ts)
  turns back into a workflow; `unrecoverable` and `unrecoverable-intermediate` mean
  there is nothing to read. About one build in five has no stored JSON, so don't
  assume. And don't reach for a **later** build instead — that one is the workflow
  after the fix, so the case would test the repair rather than the problem.
- **The person already had it.** When the editor hands a workflow to the assistant,
  the assistant looks it up by id — so the workflow you want is the *result* of the
  `workflows[get]` call whose input mentions that id.
- **Nothing was stored.** Older threads pre-date this being kept at all, and the read
  says so in a `note` rather than returning an empty list. An empty answer never means
  "there was no workflow". Two ways out: replay the thread locally and take the
  workflow the harness rebuilds from the trace (see below), or write the stand-in
  yourself — the simplest set of nodes that can still show the problem. Hand-authored,
  there's no original to compare against, so the before-you-ship checks are the only
  safety net left.

### What to keep, and what to replace

Keep the technical shape, since that is what the case tests. Replace the values that
point at a real person, company or account.

| Keep exactly as it is | Safe to replace |
|---|---|
| node `type` and `typeVersion` | URLs, hostnames, webhook paths |
| how the nodes are wired (`connections`), and the node names it refers to | email addresses, people's names, channel names |
| parameter names, and the shape of an expression (`={{ $json.url }}`, `$('Prepare rows')`) | spreadsheet / document / data-table ids |
| settings that change behaviour: `batchSize`, `resource` / `operation` / `mode`, the shape of a condition | sticky notes, node notes, Code-node text, sample data |

**Swap like for like** — a URL stays a URL, an id keeps the same look and length.
That's not only about readability:

- Loading a seed checks every node for `id`, `name`, `type`, a numeric `typeVersion`,
  a two-number `position` and a `parameters` object, and rejects the whole seed if one
  is missing. So don't delete fields while you're in there.
- Ids get swapped for fresh ones by a plain search-and-replace across the seed.
  Anything under 8 characters is rejected outright, and a short id that squeaks
  through is exactly how you end up rewriting unrelated text that happens to contain
  it.

On one node that comes out as: the host, the id and the key change; the expression,
the reference to another node and the parameter names don't.

```jsonc
// before
"url": "=https://acme-internal.example/v2/orders/{{ $('Get order').item.json.orderId }}",
"headerParameters": { "parameters": [{ "name": "X-Api-Key", "value": "sk_live_9f2c8b…" }] }

// after
"url": "=https://api.example.com/v2/orders/{{ $('Get order').item.json.orderId }}",
"headerParameters": { "parameters": [{ "name": "X-Api-Key", "value": "sk_test_placeholder" }] }
```

**Trim as you go.** The seed is one field on the case, with a 256KB ceiling —
`load_skill` bodies alone can account for most of it. Trimming has a rule of its own:
**keep the shape here too.** Filtering a list output changes what the agent believes
exists, and a `{ "note": "…" }` where a result belongs invents a shape no tool ever
returns. Shortening the text inside a block is fine; to get rid of a call, drop the
whole tool-call block. If you keep a build-workflow call, its `output.workflowId` has
to match a workflow the seed declares — see [`case-shapes.md`](case-shapes.md).

### Three easy mistakes

**Renaming a node.** A node's name is how the rest of the workflow points at it — the
wiring is keyed by name, and expressions call it by name (`$('Old Name')`). It can
also turn up in recorded builder code and in the prose. Miss one reference and the
workflow quietly stops working, which is the kind of over-cleaning that leaves the
case testing nothing. Node names are rarely identifying on their own, so the default
is to leave them be. If you do rename one, `grep -c 'Old Name' <case>.json` should
come back 0. (Workflow names are a different story: each run gets its own copy with a
`[seed …]` suffix, and a seed declaring two workflows with the same name is refused,
because there's no way to tell which one a mention refers to.)

**Replacing the value the case is about.** In
`http-keep-generic-credential-unknown-service`, the host `queue.fal.run` matters
precisely because n8n has no built-in credential for it — swap in a well-known host
and the case tests the opposite thing. Same with the invented column names in
`flags-unverified-sql-identifiers`. Expectations quote values too ("posts to
`#growth`", a particular model name), so a replacement has to be made in both places,
or the expectation loosened the way others already are for values that don't matter
("an unset or placeholder value is acceptable — it's something to fill in at setup,
not a build mistake"). Knowing what the case asserts is part of scrubbing it, which
is why this is a person's job and not a script's.

**Tidying up a node's version.** Split In Batches v2 lists its outputs as
`['loop', 'done']`; v3 lists them as `['done', 'loop']`. Same two outputs, opposite
meaning — so bumping the version quietly sends the loop the other way while the wiring
still looks untouched. Leave versions as the conversation had them.

### Check that only values changed

Compare the JSON you started from with the workflow you put in the case:

```bash
leaves() { jq -r '{nodes,connections} | paths(scalars) as $p | "\($p|map(tostring)|join("."))\t\(getpath($p)|tojson)"' | sort; }
diff <(leaves < original-workflow.json) <(jq '.seed.workflows[0]' <case>.json | leaves)
```

`leaves` prints one line per value in the file, so the diff is a plain list of what
you changed. Every line should be a value you meant to replace. A line mentioning
`type`, `typeVersion`, `connections` or a behaviour setting means the shape moved, not
just the values; a line on one side only means something was added or dropped. Keys
that aren't part of the graph (`settings`, `meta`, `pinData`) are ignored, so the
original compares cleanly against the trimmed version.

This is the third of
[Before you ship a seeded case](case-shapes.md#before-you-ship-a-seeded-case--three-checks).
The other two — the problem is still there, and the case fails without the seed — are
what catch a clean-up that kept the shape but lost the point.

### What the harness already handles

You don't need to do these by hand:

- **Credential references on nodes are dropped as the seed loads.** The case's own
  `credentials[]` decides what the assistant can see, and a credential's display name
  goes with the reference.
- **Data tables are columns only.** The seed format has no place for rows, and a
  `rows` key is rejected rather than quietly removed — so table contents can't come
  along by accident.
- **A seed workflow is only `id`, `name`, `nodes` and `connections`.** Pinned example
  data, instance metadata and settings never travel.
- **Ids and workflow names are per run.** Ids are replaced with fresh ones and names
  get a `[seed <8hex>]` suffix, with mentions updated in the prose — though not inside
  node definitions or recorded tool calls.

Everything else in the seed is yours to check.

### Replaying a thread first (the secondary mode)

Scrubbing takes work, and sometimes you want to know the failure is real before you
put that work in. That's what `seed.mode: "replay"` is for: give it a thread id and
the harness rebuilds the conversation from its trace at run time, then drives the
turn you care about. Nothing about the thread lands in the repo — the case holds only
the id.

Treat it as a local check, not a case. The trace it depends on ages out in about two
weeks, so a committed replay case stops working; and it stands up someone's real
conversation on the eval instance, which is exactly what scrubbing exists to avoid.
So run it, confirm the failure, then scrub the workflow it hands you into a seeded
case that will still be there next quarter. Details and limits in
[`case-shapes.md`](case-shapes.md).

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
