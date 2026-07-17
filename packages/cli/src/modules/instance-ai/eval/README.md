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

## The rule

`__schema__` describes a node's **output**, not the service's wire format —
nodes reshape responses (simplify, field mapping, envelope unwrapping) before
emitting items. Therefore:

- Never feed `__schema__` into wire-level mock generation.
- Never let API docs override an available `__schema__` for node-output mocks.
