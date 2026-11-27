# Building a runtime case

The order matters. Each step uses the output of the one before it.

```
snapshot → seed.agents → scrub → check the rewrite → seed rows
         → scenarios → agentRun → tags
```

## 1. Snapshot → `seed.agents`

Map the snapshot to one seed entry: `{ id, config, skills }`.

- `id` ← `snapshot.agentId`. The scrub replaces it later.
- `config` ← `snapshot.config`. `skills` ← `snapshot.skills`.
- Drop the capture metadata: `threadId`, `runId`, `projectId`, `configHash`,
  `reason`, `turnRunId`, `seq`, `truncated`, `hasPayload`, `skillCount`.
- Keep `[redacted]` credentials. The restore blanks them, and the model
  resolver binds real keys. The resolver also adds the model credential types
  the case needs. Declare at most one credential of each model type.

With L1: create the case in LangTracer with `create_test_case`, with no suite
and without `synthetic: true`. It holds real prose, so it stays marked
`containsUserData`. Scrub it there (step 2), then copy the scrubbed seed into
your disk file. Open question for L1/L2: whether the push updates this case or
makes a new one. Until that is settled, delete this working case after the push,
so the suite holds one copy.

Before L1: skip `create_test_case`. Rewrite on disk.

## 2. Scrub

**Pending L1.** `scrub_test_case` rewrites `seed.agents`. Until L1 lands, it
does not touch seeds. Rewrite the Agent by hand, with the rules below.

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
- **Skill ids must match** between `config.skills[]` and the `skills` map.

## Check the rewrite

Do this after every scrub, by hand or by L1.

- **Leaks:** build a list of the originals (names, ids, numbers, URLs, table
  names, non-English identifier words). Search the case for each one. Zero
  hits. Then read the whole case once for real-world detail.
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

**Pending L2** to push rows to LangTracer. They run locally today.

## 4. Scenarios

Write 1–3 scenarios. Each tests one behavior the user built the Agent for.

- `dataSetup`: the world prompt. What the tables hold, what each mocked tool
  returns, and any system marker the first message carries (for example
  `[Customer WhatsApp number: ...]`). Use the same marker as the instructions.
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
  [Memory cases](SKILL.md#memory-cases). **Pending N4.**

Direct mode rejects assistant-only fields: `conversation`,
`processExpectations`, `outcomeExpectations`, `messageBudget`, `promptVersion`,
`credentialFixture`, and `seed.messages`, `seed.projects`, `seed.priorRuns`,
`seed.recordedRuns`.

## 6. Tags

Always `agent-runtime`. Then one tag per component the case exercises:
`data-tables`, `mcp`, `skills`, `web-search`, `memory`, `episodic`,
`multi-turn`. Add the `business_domain`. Tags let a run select part of the
suite.

## Validate

Author the file at
`packages/@n8n/instance-ai/evaluations/data/agents/<slug>.json`. Do not commit
it. From `packages/@n8n/instance-ai`:

```bash
pnpm exec tsx -e "import { loadAgentEvalTestCasesWithFiles } from './evaluations/data/agents/index.ts'; const m = loadAgentEvalTestCasesWithFiles('<slug>'); if (m.length !== 1) throw new Error('found ' + m.length); console.log(m[0].fileSlug)"
```

The loader is strict. It fails on unknown keys, on rows that don't fit the
columns, and on a scenario with no expectation.
