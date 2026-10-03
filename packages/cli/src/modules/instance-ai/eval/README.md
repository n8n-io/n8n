# Instance AI eval mocking — the two-layer model

Workflow evaluation and simulated verification mock external services at two
distinct layers. They answer different questions and must not be mixed.

## Wire level — `mock-handler.ts`

Mocks the **raw HTTP response a service sends over the wire**. The node then
executes for real: its routing, pagination, response parsing, and
post-processing (e.g. `simplify` options) all run against the mocked body.

- Shape source: fetched API documentation (`api-docs.ts`) + endpoint quirks.
  A node contract adds what it declares (`contract-response.ts`): the raw body
  schema of a `request` or `list` action, or, for a `run()` action that
  reshapes the body in code, its output schema labelled as the shape the mock
  must NOT return. The output tells the mock which raw fields the node needs.
- Used when a node executes against intercepted HTTP.

## Design time — `design-time-mock.service.ts`

An eval build thread also sends HTTP before any scenario runs: resource
lookups (`explore-resources`, the node-contract lookups of a build) and
verification runs (`executions run`/`run-step`, the verification inside
`build-workflow`). Eval credentials carry placeholder tokens and cases name
hosts that do not exist, so these calls fail for real. In a thread the harness
pinned with `POST /eval/thread-credential-allowlist`, they go to the wire-level
mock instead. The mock is one per thread, so a repeated request gets the same
answer. Its context is the user's request, so a looked-up resource has the
fields the case names. Other threads get no mock. The same layer serves both
build arms, so the change is arm-neutral.

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

- Never feed `__schema__` into wire-level mock generation. A contract output
  goes in only as the shape that the body must not have (see above).
- Never let API docs override an available `__schema__` for node-output mocks.
- Never reach for a credential bypass to make a *node execution* succeed — that
  is the wire level's job. The bypass only answers the credential's own test.
