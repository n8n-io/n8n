# Spec: `n8n-test` workflow-testing PoC

> Feasibility spike, demoed to the product team. Throwaway quality, spike branch
> only — never merged. Source of intent: the "Workflow testing demo" Notion page.

## Objective

Prove that an n8n workflow (`workflow.json`) can be executed **through the real
n8n engine** inside a vitest test, with its HTTP traffic intercepted by nock —
so workflows stored in a git repo can be tested like code.

- **User:** us (Ligo) first — validate feasibility and surface the sharp edges
  before pitching workflow testing as a feature. The product-team demo is the
  venue, not the point.
- **Demo script (local terminal only):** run `vitest` against a test file that
  imports a `workflow.json`; two tests pass — happy day (HTTP 200 → output
  asserted) and unhappy day (HTTP 500 → `runWorkflow` rejects).
- **Success looks like:** both tests green through the real engine, plus a
  written list of gotchas hit along the way (node loading, DI, error modes)
  to inform the real feature.

## Tech Stack

- TypeScript, pnpm workspace package inside the n8n monorepo
- `n8n-core` execution engine (`WorkflowExecute`) + real `n8n-nodes-base` node
  implementations, loaded via the existing `packages/core/nodes-testing/`
  components (`LoadNodesAndCredentials`, `NodeTypes`, `CredentialsHelper`)
- `nock@^14` for HTTP interception (already used by `node-test-harness`)
- `vitest` as the test runner

## Public API (the whole surface)

```ts
import { runWorkflow } from 'n8n-test';

// Executes workflowJson through the real engine.
// - `input` (optional) becomes the trigger node's output item; omitted → empty item.
// - Resolves to the last executed node's first item's `json`.
// - A node error (throw mode) rejects the promise with that error.
const output = await runWorkflow(workflowJson, input?);
```

## Commands

```bash
pnpm --filter n8n-test build          # tsc build of the package
pnpm --filter n8n-test demo           # vitest run demo/workflow.test.ts (the demo command)
```

## Project Structure

```
packages/n8n-test/
├── package.json           → name: n8n-test; deps: n8n-core, n8n-workflow, n8n-nodes-base, nock
├── src/
│   ├── index.ts            → exports runWorkflow
│   └── run-workflow.ts     → thin wrapper: load nodes once, build Workflow, run WorkflowExecute
├── demo/
│   ├── workflow.json       → the Notion sample workflow, retargeted to GET https://test-endpoint.com/test
│   └── workflow.test.ts    → the two demo tests (Notion "Sample test", made consistent)
└── vitest.config.ts
```

## Code Style

Match the monorepo (Biome + ESLint, tabs, single quotes). PoC pragmatism is
allowed inside `n8n-test` (e.g. `mock<IWorkflowExecuteAdditionalData>()` as the
harness does), but no `any`, and no changes to other packages beyond what
loading requires. Demo test file stays boilerplate-light — it is the artifact
on screen:

```ts
import workflowJson from './workflow.json';
import { runWorkflow } from 'n8n-test';
import nock from 'nock';
import { expect, test } from 'vitest';

test('workflow happy day', async () => {
	nock('https://test-endpoint.com').get('/test').reply(200, { data: 'Hello world' });

	const output = await runWorkflow(workflowJson);

	expect(output['test-output']).toBe('Hello world');
});
```

## Testing Strategy

- The demo tests **are** the deliverable; there are **no tests for the harness
  itself** (agreed PoC constraint).
- `vitest` runs them; `nock.disableNetConnect()` in setup so any un-mocked HTTP
  fails loudly.
- Error mode: only `throw` (n8n default `onError=stopWorkflow`) — a node error
  rejects `runWorkflow`; the unhappy-day test asserts with `rejects.toThrowError`.

## Boundaries

- **Always:** run through the real `WorkflowExecute` with real node types; keep
  the whole PoC inside `packages/n8n-test/` (plus this spec); keep the spike on
  its own branch.
- **Ask first:** any change to another package (e.g. exposing `core/nodes-testing`
  differently); adding dependencies beyond nock/vitest; expanding the demo's
  node set.
- **Never:** merge to master; publish the package; add credentials handling;
  wire GitHub Actions; build `mockNode`/`replaceNode`/`fetchWorkflow`.

## Success Criteria

1. `pnpm --filter n8n-test demo` runs both tests green in a terminal.
2. The happy-day test's assertion passes because the real Set node evaluated
   `{{ $json.data }}` against the real HTTP Request node's (mocked) response.
3. The unhappy-day test rejects with the HTTP Request node's error on a 500.
4. Un-mocked network calls are blocked (proof nock owns the traffic).
5. A "gotchas" list exists (in the PR/branch description) covering what the
   real feature must solve.

## Out of Scope (explicit)

CI/PR wiring (talk-track only), `mockNode`/`replaceNode`/`fetchWorkflow`,
credentials, non-throw error modes (`continue`, `continueErrorOutput`),
multi-item/multi-branch outputs, publishing. The SSRF-hardened request-helper
interception seam is the flagged **production direction** for mocking, but is
not built here.

## Open Questions

- None blocking. Deferred to the real feature: interception via the SSRF
  request helper, input semantics for non-manual triggers, multi-output shape.
