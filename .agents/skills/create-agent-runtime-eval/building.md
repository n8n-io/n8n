# Building a runtime case

LangTracer is the home of a runtime case. You build it there with the
LangTracer MCP tools, not as a file on disk:

```
create_test_case → scrub_test_case → update_test_case (rows, scenarios,
agentRun, tags) → review → add to the suite
```

The order matters. Each step uses the output of the one before it.

**Pending L2/L3.** Today `create_test_case` and `update_test_case` do not
carry `agentRun`, `seed.dataTables[].rows`, `expectations`, `userTurns`, or
`sessions`. Until they do, write those parts in the local smoke-run file
([calibrating.md](calibrating.md#run-locally-smoke-test)), and copy them into
the LangTracer case when L2/L3 land.

## 1. Snapshot → `seed.agents`

Map the snapshot to one seed entry: `{ id, config, skills }`.

- `id` ← `snapshot.agentId`. The scrub replaces it later.
- `config` ← `snapshot.config`. `skills` ← `snapshot.skills`.
- Drop the capture metadata: `threadId`, `runId`, `projectId`, `configHash`,
  `reason`, `turnRunId`, `seq`, `truncated`, `hasPayload`, `skillCount`.
- Keep `[redacted]` credentials. The restore blanks them, and the model
  resolver binds real keys. The resolver also adds the model credential types
  the case needs. Declare at most one credential of each model type.
- **Node tool credentials** are an object keyed by credential type, never the
  bare string `"[redacted]"`:
  `"credentials": { "whatsAppApi": { "id": "[redacted]", "name": "WhatsApp account" } }`.
  The snapshot often has the bare string. Find the type in the node's
  definition.
- **The `n8n_chat` integration** takes `"credentialId": ""`. Other
  integrations keep `"[redacted]"`.
- **Drop `config.tasks`.** The seed refuses it. Note in the case
  `description` that the Agent had tasks, so a reader knows they are missing.
- Add the case-level `complexity` (`simple`, `medium`, or `complex`).

Create the case with `create_test_case`:

- `seed: { "mode": "inline", "agents": [ … ] }`.
- `setKind: "regression"`, and no `suiteId`. The case joins the suite only
  after review ([calibrating.md](calibrating.md#publish)).
- `sourceThreadId` and `sourceRunId` (the snapshot run), so the case links to
  its source.
- Do not set `synthetic: true`. The case holds real prose, so it stays marked
  `containsUserData`.

Record the case id. Every later step edits this case.

## 2. Scrub

Run `scrub_test_case` with the case id. It keeps the id and stores the
originals in `metadata.scrubbedFrom`.

**Pending L1.** Until L1 lands, `scrub_test_case` does not rewrite
`seed.agents`. Rewrite the Agent by hand with the rules below, and write it
back with `update_test_case` (`seed`).

The rules (from the C1 rewrite spec):

- **Keep the shape, change the facts.** Same sections, rules, lists, step
  numbers, and CAPS emphasis. Never trim a rule. Edge sections (health,
  hand-off, consent) are often what you test.
- **One rename map per Agent. Build it first.** Business name, people, places,
  products, tool names, table names, column names, legal terms, currency.
  Apply it everywhere at once: instructions, tool names and descriptions,
  `$fromAI` keys and descriptions, column ids, filter keys,
  `cachedResultName`, fixed values, skill bodies, `guidance` topics.
- **Keep the domain, change the business.** A fitness studio stays a fitness
  studio, with a new name, city, currency, hours, and prices.
- **Translate everything to English**, identifiers too. Keep "answer in the
  customer's language" rules.
- **Replace contact values in node parameters**: phone numbers (`+1555 01xx`),
  emails (`example.com`), chat and channel ids, numeric ids of 10+ digits.
- **MCP URLs:** a private host becomes `https://mcp.example.com/<slug>`. Keep a
  public vendor host. Keep `transport` and the auth type.
- **Keep exactly:** `model`, `memory` (except `episodicMemory.guidance`
  topics, which you rewrite), `config.config`, node types, versions,
  operations, filter conditions, `providerTools`, `personalisation`,
  `[redacted]` values.
- **Skill ids go through the rename map too.** An id can carry a real name
  (`skill_acme_returns`). Replace it the same way in `config.skills[].id`, the
  `skills` map keys, and every mention in the instructions. The ids must still
  match between `config.skills[]` and the `skills` map.
- **Instructions that name a tool the Agent doesn't have** stay as written.
  The user built it that way. Don't write a scenario that needs that tool.

## Check the rewrite

Do this after every scrub, by hand or by L1.

- **Leaks:** build a list of the originals (names, ids, numbers, URLs, table
  names, non-English identifier words). Search the case for each one. Zero
  hits. Match whole words. Match short tokens (4 letters or fewer)
  case-sensitively, or `Ana` hits every `analysis`. Then read the whole case
  once for real-world detail.
- **Structure:** compare the keys and types of every leaf before and after.
  Same tools, same rule count, same skill names, same array lengths.
- **Names line up:** every tool name in the instructions exists in `tools`.
  Every `dataTableId.value` equals a `seed.dataTables[].id`, and its
  `cachedResultName` equals that table's `name`.
- **Originals** are in `metadata.scrubbedFrom`, with the rename map.

Hand the rename map and the new values (hours, prices, contacts) to the next
steps. Scenarios must use them.

## 3. Seed tables and rows

For every Data Table the Agent's tools use, add a `seed.dataTables` entry:

- `id` equals the tool's `dataTableId.value`. The restore remaps it.
- `name` equals the tool's `cachedResultName`.
- Columns use `string`, `number`, `boolean`, or `date`. Map a node schema's
  `dateTime` to `date` in the seed. Keep `dateTime` in the node.
- `rows` are **synthetic**. Never copy rows from a trace. Write the fewest rows
  that make the scenarios meaningful, including the edge rows you grade (for
  example, one inactive package the Agent must not list).

Before each scenario, every seed table is reset to its seed rows. Use a
scenario's `seedDataTables` only when that scenario needs different rows.

Dates: if the instructions have date rules ("only items from this week",
"remind 2 days before"), put seed dates far from today, for example years
before or after. Then the rule gives the same answer on any run date. Write
the expectations so they hold either way (see Scenarios).

Write the tables with `update_test_case` (`seed`). **Pending L2** for
`rows`: LangTracer stores seed tables as schema only today.

## 3b. Workflow tools

A tool with `"type": "workflow"` calls a sub-workflow. The snapshot has the
reference, not the workflow. Write a synthetic one in `seed.workflows`:

- The first node is an Execute Workflow Trigger (`n8n-nodes-base.executeWorkflowTrigger`)
  with the inputs the tool passes.
- No Wait node and no human-in-the-loop node. The run can't resume.
- Not an Engine v2 workflow. Test runs refuse those.
- Its `name` equals the tool's `workflow`.
- The tool's `workflowId` is absent, or equals this seed workflow's `id`.
  Never keep the snapshot's real workflow id.
- Keep it small. Outbound calls (HTTP, Gmail, …) go through the LLM mock, so
  say what they return in `dataSetup`.
- It may use seed Data Tables. The restore remaps the table ids inside seed
  workflows too.

## 4. Scenarios

Write 1–3 scenarios. Each tests one behavior the user built the Agent for.

- `name`: unique in the case. No ` › ` in a name or an expectation: the
  harness uses it as a key separator. The case is refused otherwise.
- `description`: required. One line on what the scenario tests.
- `dataSetup`: the world prompt. Keep two parts apart:
  - What the user knows: who they are, and any marker their first message
    carries (for example `[Customer WhatsApp number: ...]`, the same marker
    the instructions use).
  - What only the backend knows. Label it: "Mock world for <tool> (the user
    has not seen this data): …". This stops the simulated user from quoting
    data it can't know.
- **Channel metadata.** Direct mode has no channel. A Telegram chat id or
  sender name, for example, does not exist. If the instructions need one, put
  an explicit marker in the opening message through the goal or `dataSetup`.
- `userTurns`: `{ goal, maxTurns }` (default 6, max 20). The goal guides the
  simulated user. Write it as a person: who they are, what they ask, in what
  order, when they agree or refuse, and when to stop. Omit `userTurns` for a
  single opening message. **Pending N3.**
- `sessions`: 1–5 threads for the same user, each with its own `goal`,
  `maxTurns`, and `expectations`. Use it for episodic memory. A scenario has
  `userTurns` or `sessions`, not both. **Pending N3.**
- `expectations`: see the main [SKILL.md](SKILL.md#write-expectations-that-grade-the-agent).
- `successCriteria`: optional, one or two sentences, not graded.

Tool outbound calls go through the LLM mock. Data Tables are real. Say in
`dataSetup` what a mocked tool returns when the scenario depends on it.

Things the run doesn't have:

- **Knowledge files** (`find_file`, `search_text`, `read_file`) can't be
  seeded. An Agent that relies on them runs without documents. Say so in
  `dataSetup`. Grade what it should do without them: say it can't confirm,
  refer to a person, not invent a rule. Don't grade an answer that needs a
  document.
- **Tools the instructions name but the Agent lacks.** Don't rely on them.
- **Date-dependent rules.** The run date changes. Write expectations that hold
  on any date, for example "does not present the March item as new", not
  "lists 2 items from this week".
- **A mock for provider web search.** `anthropic.web_search` and
  `openai.web_search` run live and can't be mocked. Tag the case
  `web-search-live`. Don't put search results in `dataSetup`. Grade the
  process and self-consistency only: it searched when it needed to, it cites
  the source and the time, its own numbers agree with each other, and it
  invents nothing. Never grade a live fact (a price, a headline).
- **Fresh MCP reads after a write.** The MCP mock caches results by exact
  arguments. A read after a write, with the same arguments, returns the cached
  result. Don't write expectations that depend on re-reading what the Agent
  just wrote. Grade the write call instead.

Write the scenarios with `update_test_case` (`scenarios`, the full set,
matched by name). **Pending L3** for `expectations`, `userTurns`, and
`sessions`.

## 5. `agentRun`

```json
"agentRun": {
  "mode": "direct",
  "keepMemory": true,
  "configOverrides": { "memory": { "episodicMemory": { "enabled": false } } }
}
```

- `mode: "direct"` is required. It needs `seed.mode: "inline"`.
- `agent`: the seed id of the Agent under test. Default: the first seeded
  Agent.
- `keepMemory`, `configOverrides`: see
  [Memory cases](SKILL.md#memory-cases).
- `configOverrides` can't set credentials or models. Keys that start with
  `credential` or end in `Model`, and `model` and `modelsByDifficulty`, are
  refused. The resolver owns them.

Write it with `update_test_case`. **Pending L2** for `mode` and `agent`,
**L3** for `keepMemory` and `configOverrides`.

Direct mode rejects assistant-only fields: `conversation`,
`processExpectations`, `outcomeExpectations`, `messageBudget`, `promptVersion`,
`credentialFixture`, and `seed.messages`, `seed.projects`, `seed.priorRuns`,
`seed.recordedRuns`.

## 6. Tags

Always `agent-runtime`. Then one tag per component the case exercises:
`data-tables`, `mcp`, `skills`, `web-search`, `web-search-live` (provider
web search, see Scenarios), `memory`, `episodic`, `multi-turn`. Add the `business_domain`. Tags let a run select part of the
suite. Set them with `update_test_case` (`evalTags`; the export writes them as
the case's `tags`).

## Validate

Check the case against the schema before the local smoke run. It takes about
a second and needs no instance. Save the case to a scratch file, then run this
from `packages/@n8n/instance-ai` in an n8n checkout that has N1–N4 (the stack
head):

```bash
pnpm exec tsx -e "
import { readFileSync } from 'node:fs';
import { EvalTestCaseSchema } from './evaluations/harness/schema';
import { remapSeedArtifactIds } from './evaluations/harness/conversation-seed';
for (const file of process.argv.slice(1)) {
  const parsed = EvalTestCaseSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
  if (!parsed.success) { console.log('FAIL', file, JSON.stringify(parsed.error.issues.map(i => i.path.join('.') + ': ' + i.message))); process.exitCode = 1; continue; }
  if (parsed.data.seed) remapSeedArtifactIds(parsed.data.seed);
  console.log('ok  ', file);
}
" /path/to/case.json
```

It catches unknown keys, a bare `"[redacted]"` node credential, an `n8n_chat`
`credentialId` that isn't `""`, rows that don't fit the columns, a missing
`description` or `complexity`, ` › ` in names, and duplicate seed ids. It does
not run anything. The local smoke run is next
([calibrating.md](calibrating.md#run-locally-smoke-test)).
