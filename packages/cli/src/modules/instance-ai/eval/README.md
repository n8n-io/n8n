# Instance AI eval mocking — the two-layer model

Workflow evaluation and simulated verification mock external services at two
distinct layers. They answer different questions and must not be mixed.

## Wire level — `mock-handler.ts`

Mocks the **raw HTTP response a service sends over the wire**. The node then
executes for real: its routing, pagination, response parsing, and
post-processing (e.g. `simplify` options) all run against the mocked body.

- Shape source: fetched API documentation (`api-docs.ts`) + endpoint quirks.
- Used when a node executes against intercepted HTTP.

## Node-output level — pin data / simulation fixtures

Mocks the **items a node emits** after its own post-processing. The node never
executes; the data is pinned onto it.

- Shape source: `__schema__` preview schemas shipped next to each node
  (`packages/nodes-base/nodes/<Node>/__schema__/v<version>/<resource>/<operation>.json`),
  resolved through n8n-core's `resolveOutputSchemaPath`/`loadOutputSchema` and
  `LoadNodesAndCredentials.createOutputSchemaLookup()`. Prompt building and
  parsing live in `@n8n/workflow-sdk` (`mock-data/`).
- Used by: Phase 1.5 bypass pin data (`pin-data-generator.ts`) and in-product
  simulated verification (`@n8n/instance-ai`
  `generate-simulation-fixtures.service.ts`).

## Data Tables — real tables, prepared per scenario

Data Table nodes are neither mocked nor pinned. A Data Table lives inside n8n,
so the node runs for real: it applies its own filters, sets `pairedItem`, and
sees the rows the same run wrote before it. A pinned read could do none of
these things.

Before each scenario, `prepareDataTables` in `execution.service.ts`:

1. Finds every Data Table that the workflow's enabled Data Table nodes bind,
   by id or by name, in the workflow's own project.
2. Skips the tables in `seededDataTableIds`. The CLI already filled them with
   the rows from the scenario's `seedDataTables`.
3. Asks the mock model for the starting rows of the other tables, in one call
   (`data-table-rows.ts`). The prompt has the scenario, the Phase 1 context and
   node hints, and each table's real columns.
4. Empties each table and inserts its rows.

Rows in a table that the workflow writes use the value formats of the
workflow's write nodes, because such a table only holds rows that the workflow
wrote. A node whose table does not exist runs as it is and fails, as it would
for a user. A failure to prepare the tables is a framework issue.

The CLI queues the runs that bind one table on one lane (`workflowDataTableKeys`
in `harness/seed-tables.ts`), so two scenarios never reset each other's rows.

## Credential connection tests — a separate, opt-in surface

A credential's connection test is neither of the two layers above: it is issued
by the credential type's own `test` block, not by a node executing, so nothing
in `mock-handler.ts` or the pin-data path sees it. Eval credentials carry
placeholder tokens, so those tests fail for real — and the product refuses to
apply a workflow setup card whose credential failed one
(`isCredentialComplete` → `isCredentialTestedOk` in the frontend). That makes
"the simulated user completed the setup card" unreachable without help.

`bypassCredentialTest` on `POST /eval/thread-credential-allowlist` names
credential ids whose test the credential adapter resolves as successful without
contacting the provider (`instance-ai.adapter.service.ts`, `test()`). Two
properties are deliberate:

- **Only `test()` is synthesized, never `isTestable()`** — the product still
  runs its real test-invocation path; only the network result is substituted.
  Faking testability would skip the code we want covered.
- **The result is indistinguishable from a real pass.** No marker reaches the
  agent: a hint that a test was bypassed makes it hedge about the credential,
  which is the behaviour the cases using this exist to rule out. The harness
  records the bypass on its own side (`credential-test-bypassed` proxy decision
  stat) so a case can assert it deterministically.

The bypass is queried per test rather than snapshotted into the adapter: the
harness registers ids mid-run, when the simulated user creates a credential on
a card, long after the run's context was built.

## Agents a workflow calls

A Message an Agent node, or its tool version, runs another agent in-process, so
no HTTP mock reaches it by itself. In an eval run the workflow eval gives that
agent the Agent eval's seams (`prepareCalledAgent` in `execution.service.ts`):
its node and workflow tools, streamable-HTTP MCP servers and fallback web search
are mocked, and each mocked call is recorded under the calling node. The agent's
own model call stays real, so its model needs a credential with a real key. The
eval runs the agent's draft and turns off its memory, vector stores, SSE MCP
servers and chat integrations. A sub-agent keeps only the MCP servers its calling
agent also has; the eval turns off the others and adds a warning.

## Agent model catalogs

The eval credential allowlist also marks Agent Builder sessions as evaluations.
Model catalog requests return one deterministic fake model for each provider.
The lookup still checks that the user can use the stored credential in the project.
It does not decrypt the placeholder credential or contact the model provider.
Production sessions continue to use live model catalogs.

## The rule

`__schema__` describes a node's **output**, not the service's wire format —
nodes reshape responses (simplify, field mapping, envelope unwrapping) before
emitting items. Therefore:

- Never feed `__schema__` into wire-level mock generation.
- Never let API docs override an available `__schema__` for node-output mocks.
- Never reach for a credential bypass to make a *node execution* succeed — that
  is the wire level's job. The bypass only answers the credential's own test.
