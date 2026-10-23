# Spec: `n8n-test` PoC — version 2

> Extends [`n8n-test-poc.md`](n8n-test-poc.md) (v1, feasibility proven on branch
> `ligo-workflow-testing-poc`). Same ground rules: throwaway spike on branch
> `ligo-workflow-testing-v2`, never merged, no tests for the harness itself.
> Source of intent: the "Hack - Workflow testing demo" Notion page, §Version 2.

## Objective

Two phases:

- **Phase A — `mockNode`.** Swap one named node's execution for a canned result
  while everything else runs real, with input capture for assertions. Star
  demo: mocking an Execute Sub-workflow node — which v1 proved cannot run for
  real under the test harness, so mocking it is both the honest and the useful
  move.
- **Phase B — the CI story v1 kept as talk-track.** A git repo holding an
  exploded project package export; a PR changing a workflow runs the workflow
  tests in a GitHub Action, fast; the reviewer watches the check go red → green.

## Public API additions (Phase A)

```ts
import { mockNode, runWorkflow } from 'n8n-test';

// Registers an override for the named node in this workflow. Does not mutate the JSON.
const sub = mockNode(workflowJson, 'Execute sub-workflow', { subworkflowOutput: 'sfoutput' });

const result = await runWorkflow(workflowJson);

expect(result.subworkflowOutput).toBe('sfoutput');
// What the mocked node received (first item's json) — the capture half of the API.
expect(sub.input()).toMatchObject({ data: 'Hello world' });
```

Multiple nodes in one workflow can be mocked independently — each call returns
its own handle, and with the HTTP node mocked too the test needs no nock at all:

```ts
const http = mockNode(workflowJson, 'Http request', { data: 'canned response' });
const sub = mockNode(workflowJson, 'Execute sub-workflow', { subworkflowOutput: 'sfoutput' });

const result = await runWorkflow(workflowJson);

expect(result.subworkflowOutput).toBe('sfoutput');
expect(sub.input()).toMatchObject({ 'test-output': 'canned response' });
```

Semantics:

- Matched by **node name** within the given workflow object; the override lives
  in a module-level registry keyed by the workflow object (WeakMap), applied at
  `runWorkflow` time — the JSON is never mutated.
- **Any number of nodes per workflow** may be mocked; mocking the same node name
  again replaces the previous override (last wins) and returns a fresh handle.
- The mocked node emits the canned object as a single item; the handle's
  `input()` returns the first item's `json` the node received (undefined until run).
- `clearNodeMocks()` is exported and called from the demo `afterEach` so mocks
  never leak between tests.
- Mechanism: at run time the target node's `type` is swapped for an in-process
  mock node implementation (registered alongside the loader's node types, the
  way `core/nodes-testing`'s `testData` node already is) whose `execute` records
  `getInputData()` and returns the canned item.

## Demo additions (Phase A)

- New `demo/workflow-with-subworkflow.json`: trigger → HTTP Request →
  Edit Fields → **Execute Sub-workflow** (last node). Kept separate from the v1
  `workflow.json` so the three v1 tests stay untouched — and because without a
  mock this workflow *cannot* run, which is exactly the story.
- New demo test `workflow with subworkflow mocked`, per the API sketch above.
- New demo test `workflow with every dependency mocked`: HTTP node **and**
  sub-workflow node both mocked, no nock in the test — node-level mocking
  standing on its own.

## Phase B — repo, artifact, Action

- **Demo repo** on James's personal GitHub (disposable): an **exploded project
  package export** (the Ligo `.n8np` layout untarred: `manifest.json`,
  `projects/<project>/workflows/*.json`), a `tests/` folder whose test files
  import workflow JSONs from that layout, a vanilla vitest setup, and one
  GitHub Action running on `pull_request`.
- **Prebaked artifact, npm runtime.** CI must be fast (~2-4 min), so the Action
  does NOT build the monorepo. Instead:
  - `n8n-test` is bundled locally (esbuild/tsdown) into a self-contained
    tarball: our `src/` **plus vendored `core/nodes-testing` components** (they
    are not in the published `n8n-core` npm tarball; their relative `../dist/*`
    imports get rewritten to `n8n-core/dist/*` deep requires).
  - The tarball is attached to a GitHub release on the demo repo; the demo
    repo's `package.json` installs it by URL, alongside **released npm**
    `n8n-core` / `n8n-workflow` / `n8n-nodes-base` / `nock` / `vitest`.
  - In a plain node_modules world the DI single-container problem disappears
    (everything loads as CJS dist), so the demo repo's vitest config is vanilla
    plus `reflect-metadata` setup.
- **Demo script:** PR changes the workflow's field mapping → check fails with a
  readable assertion diff → fix commit → green.

## Commands

```bash
# Phase A (monorepo, as v1)
pnpm --filter n8n-test demo

# Phase B (monorepo side)
pnpm --filter n8n-test bundle        # produce the self-contained tarball for the demo repo
```

## Success Criteria

1. Phase A: `pnpm --filter n8n-test demo` runs 5+ tests green, including the
   sub-workflow mock with an `input()` capture assertion and the multi-node
   test (HTTP + sub-workflow both mocked, nock-free); v1's three tests
   unchanged.
2. Phase A honesty check: running the sub-workflow demo workflow *without*
   `mockNode` rejects (it cannot execute for real) — asserted in a demo test.
3. Phase B: a real PR on the demo repo shows the workflow-test check failing on
   a broken workflow change and passing once fixed, in under ~4 minutes.
4. The README gains a v2 section: `mockNode` usage + how the demo repo is wired.

## Boundaries

- **Always:** keep monorepo changes inside `packages/n8n-test` (+ specs/plan);
  spike branch only.
- **Ask first:** anything that must run against the spike branch's n8n-core
  rather than released npm (that flips the CI strategy); creating anything
  under the n8n-io org; publishing anything to npm.
- **Never:** merge; expose secrets in the demo repo; real network calls in tests.

## Out of Scope

`replaceNode` / `fetchWorkflow`, non-throw error modes, credentials injection,
multi-item canned outputs, mocking by node type (name-only), npm publishing.
The SSRF-helper seam remains the documented production direction for HTTP
mocking; `mockNode` is orthogonal (node-level, not transport-level).

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Released npm `n8n-core` engine API drifts from master (v1 was built against master source) | High — bundle may not run | Validate the bundle against npm versions locally before creating the repo; if it fights back, fall back to a GitHub Actions cache of a built monorepo checkout (slower first run, fast after) |
| Vendored `nodes-testing` imports (`../dist/*` → `n8n-core/dist/*`) break if core ships an exports map | Med | Check `n8n-core` package.json `exports` up front; deep-require works today |
| Execute Sub-workflow node's parameters demand a real workflow reference before our mock swaps it | Low | The swap happens before the engine touches the node; parameters go unread by the mock implementation |

## Open Questions

- None blocking. Demo repo name and the npm version pin are picked during
  implementation (latest stable n8n release).
