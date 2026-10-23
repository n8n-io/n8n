# n8n-test — workflow testing PoC

> **Throwaway proof of concept.** Demo-only, never merged, no tests for the
> harness itself. Specs: [`n8n-test-poc.md`](../../.agents/specs/n8n-test-poc.md) (v1),
> [`n8n-test-poc-v2.md`](../../.agents/specs/n8n-test-poc-v2.md) (v2).

Test an n8n workflow like code: a `workflow.json` executes through the **real
n8n engine** (real `WorkflowExecute`, real `nodes-base` node implementations)
inside a vitest test, with HTTP intercepted by nock.

```ts
import { runWorkflow } from 'n8n-test';

nock('https://test-endpoint.com').get('/test').reply(200, { data: 'Hello world' });

const output = await runWorkflow(workflowJson);

expect(output['test-output']).toBe('Hello world');
```

## Run the demo

```bash
# One-off prerequisite: the engine and nodes load from built dist
pnpm exec turbo run build --filter=n8n-core --filter=n8n-nodes-base

pnpm --filter n8n-test demo
```

Three tests run against [`demo/workflow.json`](demo/workflow.json): happy day
(200 → output asserted), unhappy day (500 → `runWorkflow` rejects), and input
seeding (the trigger item flows through a cross-node expression).

## How it works

`runWorkflow(workflowJson, input?)` reuses the loader components from
`packages/core/nodes-testing/` (the same machinery behind `NodeTestHarness`):
real node types load once per process, the trigger node's stack item is seeded
with `input`, `WorkflowExecute.processRunExecutionData` runs the graph in
`trigger` mode, and the last executed node's first item `json` comes back.
A node error rejects (n8n's default `onError=stopWorkflow`, i.e. "throw" mode).

## v2: `mockNode`

Swap any named node's execution for a canned result while everything else runs
real — several per workflow if you like, and with both external dependencies
mocked a test needs no nock at all:

```ts
import { clearNodeMocks, mockNode, runWorkflow } from 'n8n-test';

const http = mockNode(workflowJson, 'Http request', { data: 'canned response' });
const sub = mockNode(workflowJson, 'Execute sub-workflow', { subworkflowOutput: 'sfoutput' });

const result = await runWorkflow(workflowJson);

expect(result.subworkflowOutput).toBe('sfoutput');
// The handle captures what the mocked node received.
expect(sub.input()?.['test-output']).toBe('canned response');
```

Mocks register against the workflow *object* (the JSON is never mutated), the
last mock per node name wins, and `clearNodeMocks()` belongs in `afterEach`.
The star use-case is the Execute Sub-workflow node, which cannot run for real
under the harness — `demo/workflow-with-subworkflow.test.ts` asserts both
directions.

## v2: run it from a plain git repo (the CI story)

`pnpm --filter n8n-test bundle` produces a self-contained npm tarball
(`n8n-test-0.2.0.tgz`): our sources plus the vendored `core/nodes-testing`
loader components, with their `../dist/*` imports rewritten to `n8n-core/dist/*`
deep requires. It runs against **released npm** `n8n-core` / `n8n-workflow` /
`n8n-nodes-base` — no monorepo, no build, vanilla vitest.

The demo repo
[geemanjs/n8n-workflow-testing-demo](https://github.com/geemanjs/n8n-workflow-testing-demo)
holds an exploded project package export (`manifest.json` + `projects/**`),
installs the tarball from its release, and runs the workflow tests on every PR.

## Gotchas for the real feature

Feasibility is proven, but these are the edges the production version must own:

- **`additionalData` is a minefield.** The PoC uses a mock proxy like
  `NodeTestHarness` does, and truthy auto-mocks divert the engine: a mocked
  `encryptedRunnerIdentity` gets *decrypted as credentials*, `evalLlmMockHandler`
  reroutes request helpers, `ssrfBridge`/`parentCallbackManager`/
  `currentNodeParameters` must be explicitly `undefined`, and the waiting-URL
  bases must be real strings. The real feature wants a first-class
  `createTestAdditionalData()` factory in `n8n-core`.
- **Execution mode changes trigger semantics.** In `manual` mode the engine
  *runs* trigger nodes (ManualTrigger emits a fresh empty item, discarding
  seeded input); every other mode passes input through. The PoC runs in
  `trigger` mode — so, precisely: every node executes for real *except* the
  trigger, whose event is what `input` seeds.
- **Credentials are silently impossible.** The stub credentials helper decrypts
  everything to `{}`, so a credentialed node doesn't fail — it sends
  unauthenticated requests (verified: `httpBasicAuth` sent `Basic Og==`). The
  real feature needs credential injection, or a loud failure.
- **Built-dist prerequisite.** `core/nodes-testing` imports `packages/core/dist`,
  and node classes lazy-load from `nodes-base/dist` — the harness cannot run
  from a cold checkout.
- **One DI Container.** The consumer's vitest config must externalize
  `@n8n/di`/`@n8n/config`/`@n8n/constants`/`n8n-workflow`
  (`createVitestConfigWithDecorators`) or `Container.get()` silently returns
  undefined inside the engine.
- **TS7 (tsgo) vs `vitest-mock-extended`.** The harness class's mock typings
  only compile inside nodes-base's own program; this package excludes
  `node-test-harness.ts` and avoids mock-object arguments in its own code.
- **JSON literal widening.** A raw `workflow.json` import doesn't satisfy
  `IWorkflowBase` (`position` tuples, connection `type`, `executionOrder`
  literals) — the loose `WorkflowJson` type exists so test files stay cast-free.
  The real feature should ship that type.
- **Set node guards property names.** Assignments named like prototype members
  (e.g. `caller`) are rejected with "security concerns" — the demo field is
  `invokedBy` for that reason.
- **Only `throw` error mode is handled.** `continue` / `continueErrorOutput`
  change the result shape; a real `runWorkflow` needs a richer result object.
- **nock is the PoC seam.** It intercepts the HTTP Request node fine today, but
  the SSRF-hardened request helper in `n8n-core` is the sturdier production
  interception point — mocking there would also catch non-HTTP-module clients.
- **Speed is a non-issue.** The lazy loader brings node-type load to ~1s per
  process; the full demo suite runs in under 3s.
- **(v2) Code nodes and sub-workflows need mocking.** Task-runner-backed nodes
  (the Code node) and Execute Sub-workflow call engine capabilities a test
  harness cannot provide; `runWorkflow` refuses them with a clear message —
  `mockNode()` is the answer for both.
- **(v2) Released-engine drift is the real prebake tax.** Three shims were
  needed to run on npm releases: `vitest-mock-extended`'s CJS build cannot be
  `require`d outside Vite's pipeline (hence the plain `additionalData` object);
  the `@n8n/di`/`@n8n/decorators` pins must match released `n8n-core`'s own
  dependency versions or npm installs a second copy and the DI container
  splits; and workflow node `typeVersion`s must exist in the released
  `nodes-base` — a workflow exported from a newer n8n than the test runtime
  reads as "type unknown". The real feature needs a version-compatibility
  story, not a pin.
