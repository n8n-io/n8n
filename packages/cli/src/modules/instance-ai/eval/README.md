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

## The rule

`__schema__` describes a node's **output**, not the service's wire format —
nodes reshape responses (simplify, field mapping, envelope unwrapping) before
emitting items. Therefore:

- Never feed `__schema__` into wire-level mock generation.
- Never let API docs override an available `__schema__` for node-output mocks.
- Never reach for a credential bypass to make a *node execution* succeed — that
  is the wire level's job. The bypass only answers the credential's own test.
