# n8n Hub — Code Review

**Branch:** `feat/n8n-hub-hackathon`
**Reviewer:** Code Review Subagent
**Date:** 2026-05-10

## Verdict

**Yellow light — solid hackathon scaffolding with no critical security defects, but a handful of fixable correctness/UX bugs and one misleading API description that needs to be fixed before this is shown to anyone outside the team.** The architecture is clean (single service, narrow DTOs, careful authorization through `CredentialsService.getOne`), the SDK proxy is well-designed including the thenable guard, and secret-leakage is correctly enforced both in code and tests. Most of the criticism below is for ergonomics, documentation accuracy, and known shortcuts already enumerated in the production handoff. The most pressing issues are: (1) two computed properties on the Vue list item that are defined but never rendered, (2) a `hasCredential` filter whose documented semantics do not match its behavior, and (3) the `nodeType` extra-field is typed onto the summary but never populated by the backend.

---

## A. Correctness findings

### A.1 `ExecuteNodeService` (`packages/cli/src/executions/execute-node.service.ts`)

**Strengths**

- The 2-node synthesis is correct: `Manual Trigger → Action` with pinned `[{ json: {} }]` data, `startNodes: [{ name: 'Trigger', sourceData: null }]`, and a pre-built `nodeExecutionStack` so the engine fires the Trigger immediately. The output extraction at line 288–292 reads `resultData.runData.Action[0].data.main[0]` and maps `json` — exactly what we'd want.
- Credential authorization is enforced correctly: `credentialsService.getOne(req.user, req.credentialId, false)` (line 90–94) goes through `getSharing` with `credential:read` scope and throws `NotFoundError` if the user lacks access. There is no path that runs a node with a credential the user can't see.
- The credential-type allow-list check (line 101–117) is the right guard against trying to bind a Slack credential to a Gmail node.
- Metadata persistence failures are swallowed with `logger.warn` (line 270–276) — correct, because the execution itself already succeeded and surfacing a metadata write error to the caller would be misleading.

**Potential issues**

- ⚠ Line 127–133: `actionTypeVersion` resolution falls back to `1` when `description.version` is an array (e.g. `[1, 2, 3]`) and `defaultVersion` is missing. Some nodes ship without `defaultVersion`, and `[1, 2, 3]` will hit the final `: 1` branch — which may pick an obsolete version. Using `Math.max(...description.version)` would be safer. Low-risk in practice (most multi-version nodes have `defaultVersion`), but worth a follow-up.
- ⚠ Line 222–223: `workflowRunner.run()` returns the executionId, then `getPostExecutePromise(executionId)` is awaited. If the execution completes and is cleaned out of `activeExecutions` before the promise is requested, `getExecutionOrFail` (in `active-executions.ts`) throws. This is unlikely for non-trivial executions but could surface for very fast Set-like nodes in a CI sandbox with aggressive cleanup. Not seen in the test suite — would only show up under load.
- ⚠ The synthetic workflow has `active: false`, `isArchived: false`, `activeVersionId: null`. None of these are persisted as a real workflow row (the execution writes only an `ExecutionEntity` referencing this in-memory `IWorkflowBase`), so this is fine — but it's worth a one-line comment because a future reader will wonder.
- ⚠ Test at line 197–211 asserts `executionMetadataService.save` was called with exact metadata. If `EXECUTION_CALLER_METADATA_KEYS` keys ever change shape (e.g. from `'caller.kind'` to `'callerKind'`), this test fails — which is the right kind of brittleness, but means the keys are effectively part of the public API.

**No bugs found.** The synthesis is semantically equivalent to running a single node.

### A.2 `n8n_search_tools` tool (`packages/cli/src/modules/mcp/tools/n8n-search-tools.tool.ts`)

**Strengths**

- The discriminator parser (`expandNodeIntoOperations`, line 354–400) is genuinely defensive: handles (a) nodes with `resource` + per-resource `operation`, (b) nodes with only `operation`, (c) bare nodes with neither, (d) `displayOptions` filtering, (e) resource discriminators whose options come from `loadOptions` (falls through to single-result with empty schema). The fallback at line 240–248 ("schema unavailable") prevents the catalog from silently dropping a hit when the parser can't resolve the node type.
- `displayedFor` (line 467–513) correctly handles `show`/`hide` semantics: every show-key with a known value must match, every hide-key with a known value that *all* match means hidden. Unknown context keys are treated as "compatible" which is the right conservative default.
- `fetchCredentialsByType` (line 273–307) projects credentials to `{ id, name }` only and applies a strict local filter on `c.type === type` to defend against the `getMany` LIKE-substring matcher accidentally including unrelated types. The `getMany` call passes `includeData: false` and `includeScopes: false` — secrets cannot leak.
- One round-trip per credential type (line 284–303) is justified in the comment and bounded by node cardinality (1–2 types).

**Potential issues**

- ⚠ **MISLEADING DESCRIPTION (Important):** Line 57 advertises `hasCredential` as "When true, only return nodes where the user has a matching credential". The actual implementation in `node-catalog.service.ts:290–292` filters where the *node declares at least one credential type*, regardless of whether the user has one. An LLM consuming this description will believe `hasCredential: true` will surface only actionable nodes, but will see nodes with empty `userCredentials` arrays. **Either change the description to "only return nodes that require a credential" or actually intersect with the user's credentials.** This is the single most impactful documentation fix.
- ⚠ Line 540–547: `idParts.join('.')` builds the id as `<nodeId>.<resource>.<operation>` where `nodeId` already contains a dot (e.g. `n8n-nodes-base.slack`). The test at line 272 asserts `^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$` — 4 dot-separated segments. This is correct, but is at odds with the description at line 75 which gives the example `"slack.message.send"` (3 segments). The id-parsing receiver (`parseToolId` in the execute tool) handles both shapes via `KNOWN_NODE_PACKAGE_PREFIXES`, so this works end-to-end, but the description should be updated to use the actual 4-segment form (e.g. `n8n-nodes-base.slack.message.send`) so LLMs don't synthesize incorrect ids.
- ✅ The `inputSchema` builder (line 583–609) correctly skips `resource`/`operation` discriminators (already known from id), `UI_ONLY_PROPERTY_TYPES` (resourceLocator, resourceMapper, button, etc.), and `loadOptionsMethod` (dynamic UI loaders). Tests at line 306–338 verify each exclusion.

**No race conditions, no off-by-one.**

### A.3 `n8n_execute_tool` tool (`packages/cli/src/modules/mcp/tools/n8n-execute-tool.tool.ts`)

**Strengths**

- `parseToolId` (line 94–140) is well-thought-out: (1) check for known package prefixes (`n8n-nodes-base.`, `@n8n/n8n-nodes-langchain.`), (2) consult the catalog parser for the *longest matching prefix* (handles hypothetical dotted node names), (3) fall back to "first segment is node name". The third step is the workhorse for the common case `slack.message.send`.
- All four shapes (`slack.message.send`, `slack.postMessage`, `set.json`, `n8n-nodes-base.set.json`, `@n8n/n8n-nodes-langchain.agent.run`) have dedicated tests at line 89–237.
- Catcher at line 220–238 wraps any thrown error into a structured `error` payload — the MCP caller never sees a raw exception.

**Potential issues**

- ⚠ Line 142–152: `parsedFromTrailing` silently drops trailing segments beyond 2 ("Any segments beyond that are ignored"). A typo like `slack.message.send.extra` resolves to `(resource=message, operation=send)` with no warning. Defensible (no node uses sub-operations today) but could mask user errors.
- ⚠ Line 198–200: `...(dryRun ? { dryRun } : {})` only forwards `dryRun` when truthy. An explicit `dryRun: false` from the caller is treated the same as omitting it. This is benign (the default behavior is the same) but worth knowing if anyone ever needs to distinguish them.

**The Step-2 parser-consultation is correctly tested** (line 334–358) — when the catalog knows about `n8n-nodes-base.slack`, `slack.message.send` resolves to `slack` (not to `slack.message`, which would be a non-existent node). The `getNodeType` mock is asserted to have been called.

### A.4 `n8n_list_credentials` tool (`packages/cli/src/modules/mcp/tools/n8n-list-credentials.tool.ts`)

**Strengths — Secret leakage check passes.**

- `projectCredential` (line 57–59) is a strict `{ id, name, type }` projection — it does not spread the input object. Lines 195–197 use this projection.
- `credentialsService.getMany` is invoked with `includeScopes: false, includeData: false` (line 188–191). These are the two flags that gate decrypted-data and scope-info inclusion.
- The test at `n8n-list-credentials.tool.test.ts:117–134` asserts the output strictly equals `['id', 'name', 'type']`: `expect(Object.keys(c).sort()).toEqual(['id', 'name', 'type'])`. The corresponding test in `n8n-search-tools.tool.test.ts:461–492` checks the same invariant for `userCredentials`.
- Conclusion: **zero secret leakage** at both the implementation and test level.

**Potential issues**

- ⚠ Line 213–221 (`pickTypeFilter`): when `nodeType` is provided but resolves to nothing, the code drops the filter and returns *all* credentials. The intent is documented in the comment at line 169–175, but an MCP client expecting `nodeType: 'unknown'` to return `[]` could be surprised. The documented behavior in the tool description (line 19–20: "if it cannot be resolved the filter is ignored and all credentials are returned") is honest, but it does mean an LLM hallucinating a wrong nodeType gets the full credential list back. Not a security issue (the credentials projection is still safe), but a UX wrinkle.

### A.5 SDK proxy (`packages/@n8n/sdk/src/proxy.ts`)

**Strengths**

- **The thenable guard works.** Walking through `await n8n.slack` mentally: L1 access for `slack` returns `makeL2('slack')` — a callable proxy wrapping `callable: async (args) => dispatch(...)`. When JS checks `.then` on that proxy, the L2 trap (line 154–161) calls `isReservedKey('then')` → true → `Reflect.get(target /* the function */, 'then', receiver)` → `Function.prototype.then` is `undefined`, so `.then` resolves to `undefined`. JS sees no thenable → `await` resolves to the proxy itself (a function), no dispatch fires. Tested at `proxy.test.ts:191–206`.
- L2/L3 ambiguity (`n8n.set.json` vs `n8n.slack.message.send`) is solved by making L3 itself callable AND indexable (line 128–141). Calling `slack.message.send(...)` dispatches with `resource=message, operation=send`; calling `slack.message(...)` would dispatch with `operation=message`. The behavior matches the documented design.
- `dispatch` (line 33–88) does HTTP-status-aware error classification: 400 → `N8nValidationError` with the parsed body preserved, non-2xx → `N8nError` with the raw text.
- Single-item unwrap at line 83–85 — `output: [{...}]` becomes `output: {...}` — is the right ergonomic default and is tested at proxy.test.ts:81 AND the "multi-item arrays stay arrays" case at proxy.test.ts:170–188.

**Potential issues**

- ⚠ `buildNodeType` (line 26–31) treats *any* dot in the service name as "fully qualified". The test at proxy.test.ts:208 uses `'@n8n/nodes-langchain.openAi'` — which works. But a hypothetical service like `'my.dotted.service'` would also be treated as fully-qualified and not get the `n8n-nodes-base.` prefix. Documented in the comment, defensible.
- ⚠ The proxy's caller-controlled `baseUrl` is the SSRF surface for the caller's own environment — but the SDK runs in the caller's process and only fires `fetch(baseUrl + '/rest/executions/node')`. This is identical to the trust model of any HTTP client library: the application embedding the SDK decides where it points. Not a server-side SSRF.
- ⚠ `N8nValidationError` body parsing at proxy.ts:60–67 has a typo guard: `.catch(() => ({}))` returns an empty object, then `isRecord(body) && typeof body.error === 'string'` extracts. If the server returns `{ message: ... }` instead of `{ error: ... }`, the fallback works. Good.

### A.6 `executions.controller.ts:executeNode`

**Strengths**

- `@GlobalScope('node:execute')` (line 184) — scope decorator is present.
- `executionUrl` only built when `executionId && host` are both truthy (line 200–202). Dry-runs omit `executionUrl` correctly (test at executions.controller.node.test.ts:81).

**Potential issues**

- ⚠ `body.parameters as INodeParameters` (line 192) is a cast from the Zod-validated `Record<string, unknown>` to `INodeParameters` (a type alias for `IDataObject`). Both are structurally equivalent — `IDataObject` is `{ [key: string]: GenericValue | IDataObject | GenericValue[] | IDataObject[] }`. The cast is essentially a no-op but does sidestep TypeScript's strict subtype check. Not unsafe, but if `INodeParameters` ever narrows, this could mask issues. Could be replaced with a runtime parse but the marginal value is low for a hackathon.
- ⚠ The `_res: Response` argument is unused (line 187). The decorator system requires the `req, res, body` shape for routing, but the underscore is the right convention to silence the linter. Fine.

### A.7 SDK example (`packages/@n8n/sdk/examples/oneonone-prep.ts`)

- ✅ Uses scoped `as unknown as DemoApi` cast at line 40 — only place it appears, well-documented. Codegen will eliminate it.
- ✅ `asArray` (line 42–45) handles the dual shape `T | T[] | undefined` returned by the unwrap-single-item normalization. Defensive.

### A.8 `searchNodesStructured` in `NodeCatalogService`

**Strengths**

- Properly deduplicates by `hit.id` across multiple queries (line 282, 287–288).
- `STRUCTURED_SEARCH_LIMIT = 5` is documented as matching the LLM-facing search tool.
- `hasCredential` filter at line 290–292 checks node declarations (not user-side matches) — **this is what the implementation does, but the MCP tool description contradicts it (see A.2 above).**

**Potential issues**

- ⚠ The `getNodeSchema` builder (line 358–443) emits a synthetic `default` operation when there is no resource discriminator. Tools / clients that compose ids from this output will get `<nodeId>.default` — which `parseToolId` does NOT have a special case for and will treat as `(operation='default')`. The node code never has an `operation: 'default'`, so this would fail at runtime. Either:
  - Don't emit `.default` for nodes with no operation discriminator (just emit no operations, or special-case the id to be `<nodeId>` only), OR
  - Have `parseToolId` strip a trailing `.default`.

  Today no test exercises this end-to-end via the REST endpoint → SDK → execute path, so this is latent. Likely fine for hackathon since the REST `getNodeSchema` is the lower-traffic surface, but worth following up.

### A.9 GlobalExecutionsListItem.vue

**❌ Bug — dead code:** Lines 65–80 define `isSingleNodeExecution`, `singleNodeHeadline`, and `singleNodeCallerLabel` computeds. **None of them are referenced anywhere else in the file** (I grep'd the full 367 lines). The template was not updated to use them. Either the agent stalled mid-edit (consistent with the prod-handoff §3 note "Agent stalled mid-edit; visual smoke recommended") or this work was rolled back. The user-visible effect: single-node executions render exactly like workflow executions with no caller attribution — defeating Phase 5.2's goal. Production fix is to wire `singleNodeHeadline` into the workflow-name slot (when `isSingleNodeExecution.value` is true) and `singleNodeCallerLabel` into the sub-line.

Also: `singleNodeHeadline` reads `props.execution.nodeType`, but the backend never sets `nodeType` on the summary (only `caller` is plumbed in `attachCallerToSummaries`). So even if the computeds were wired up, the headline would always fall back to `caller?.name` then the i18n label. The `nodeType` extra field is in `SingleNodeExecutionSummaryExtras` (line 86 of `executions.types.ts`) but never populated. **The backend needs to read `EXECUTION_CALLER_METADATA_KEYS.nodeType` from metadata in `attachCallerToSummaries` and set it on the summary.**

---

## B. Security findings

### B.1 Credential listing — secret leakage check

- ✅ `n8n_list_credentials` returns strictly `{ id, name, type }`. Both the implementation (`projectCredential` at line 57–59) and the test (`Object.keys(c).sort() === ['id', 'name', 'type']` at line 132) enforce this.
- ✅ `n8n_search_tools` `userCredentials` field returns strictly `{ id, name }`. Tested at line 488–490 with `Object.keys(c).sort() === ['id', 'name']`.
- ✅ Both tools pass `includeData: false, includeScopes: false` to `credentialsService.getMany`.

**No secret leakage.**

### B.2 Authorization on `POST /executions/node`

- ✅ `@GlobalScope('node:execute')` decorator at `executions.controller.ts:184`.
- ✅ `ExecuteNodeService` validates credential ownership via `credentialsService.getOne(user, id, false)` (line 90–94). This routes through `getSharing` with `['credential:read']` scope and throws `NotFoundError` if the user has no path to the credential. **No credentials-as-someone-else.**
- ✅ The scope is registered in `GLOBAL_OWNER_SCOPES` at `global-scopes.ee.ts:128` but **NOT** in `GLOBAL_MEMBER_SCOPES`. This means only global owners can invoke `POST /executions/node` today. That's probably the right hackathon default (the endpoint is primarily for the MCP/SDK/CLI which a user must opt into), but should be verified against the product intent.

### B.3 Injection / `eval` / dynamic require

- ✅ No `eval()` in the new code.
- ✅ No dynamic `require()`.
- ✅ All DB queries go through TypeORM (`In(singleNodeIds)`, `executionMetadataRepository.findBy({...})`). The `IN`-clause is parameterized by TypeORM.

### B.4 SSRF

- ✅ Server-side: there is no user-controlled URL fetch on the execute path. The Action node may itself perform fetches (e.g. `httpRequest`), but that's a property of *that node*, not the new surface.
- ✅ Client-side (SDK): `baseUrl` is set by the *caller* of `createClient`, not by an attacker. This matches every HTTP client library's trust model. Document at `client.ts:9` confirms the intent.

### B.5 Rate limiting

- ⚠ As called out in the prod-handoff §3, the new endpoint has no rate-limiting. Acceptable for hackathon; must be added before broad rollout.

### B.6 Per-tool MCP scope enforcement

- ⚠ As called out in the prod-handoff §3, the OAuth grant includes the new scopes but the per-tool guard isn't there. Today, any authenticated MCP session gets all three new tools. Acceptable for hackathon; a 2-hour follow-up.

---

## C. Side-effects findings

### C.1 `isInteractiveExecution` sweep — verified safe

The helper returns `true` for `'manual'` OR `'single-node'`. Every replacement of `=== 'manual'` therefore preserves `manual` behavior verbatim — single-node piggybacks on the same code paths. Sites verified:

| File:line | Original | New | Effect |
|---|---|---|---|
| `workflow-runner.ts:294` | `=== 'manual'` | `isInteractiveExecution(mode)` | Single-node executions stay in-process (skip queue dispatch) |
| `execution-lifecycle-hooks.ts:537,641` | `=== 'manual'` | `isInteractiveExecution(this.mode)` | Single-node uses in-memory static-data handling like manual |
| `execution-lifecycle-hooks.ts:741` | `=== 'manual'` | `isInteractiveExecution(executionMode)` | Worker push hooks fire for both manual + single-node |
| `execution-lifecycle-hooks.ts:781` | `=== 'manual'` | `isInteractiveExecution(this.mode)` | Save-on-success behavior preserved |
| `credentials-helper.ts:400` | `=== 'manual'` | `isInteractiveExecution(...)` | Skip dynamic credential resolution for both modes |
| `core/execute-context.ts:214` | `=== 'manual'` | `isInteractiveExecution(this.mode)` | `logNodeOutput` parses string args same way |
| `core/supply-data-context.ts:373` | `=== 'manual'` | same | same |
| `core/utils/custom-data.ts:28,39` | `=== 'manual'` | same | Throw on bad custom data (not just log) |

**Verified by `packages/workflow/test/execution-modes.test.ts`** — every existing `'manual'` continues to return `true`. ✅

### C.2 `SUPPORTED_SCOPES` array order

- New: `['tool:listWorkflows', 'tool:getWorkflowDetails', 'node:execute', 'credential:read', 'tool:search']`
- The existing two scopes are still at indices 0 and 1.
- The MCP OAuth spec specifies scopes as a *set* (string-keyed), so order is immaterial in correct clients.
- ✅ Test at `mcp-oauth-service.test.ts:48–55` pins the exact order. Any future reorder must update the test (good safety net).

### C.3 MCP tool registration order

- New tools (`n8n_search_tools`, `n8n_list_credentials`, `n8n_execute_tool`) registered first (lines 130–166 of the modified `mcp.service.ts`), existing tools after.
- The MCP SDK stores tools in a `_registeredTools` record (insertion-order Object). Clients that iterate tools by index would see them in registration order — but `tools/list` returns them with names, so consumers should be matching by name.
- ✅ `mcp.service.test.ts:287–301` asserts the three new tools are registered.

### C.4 `ExecutionService.getExecution` and list metadata read

- `getExecution` only reads metadata for `execution.mode === 'single-node'` (line 188–191). Existing workflow-execution path is unchanged. ✅
- `attachCallerToSummaries` (line 481–512) batches the metadata fetch via `In(singleNodeIds)` and early-returns if `singleNodeIds.length === 0`. For workflow-only result sets, **zero extra queries fire.** ✅
- Worth re-benchmarking on the executions list once production volume of single-node executions exists, but the design is correct.

### C.5 Insights & workflow-statistics discriminators

- Both `isModeRootExecution['single-node'] = false` (statistics) and `shouldSkipMode['single-node'] = true` (insights) are correctly set. Single-node executions don't count as billable workflow runs and are skipped by insights. ✅

---

## D. Code quality findings

### D.1 Type safety

- ✅ No `as any` in production code I reviewed.
- ⚠ `executions.controller.ts:192` uses `body.parameters as INodeParameters` — see A.6.
- ⚠ Tests use `as never` and `as unknown as ...` casts for mock construction, which is acceptable per the AGENTS.md convention.
- ✅ `n8n-search-tools.tool.ts` defines explicit types `N8nSearchToolsItem`, `N8nSearchToolsJsonSchema`, `JsonSchemaProperty` for the returned structure. Good.

### D.2 Single responsibility / file size

- `n8n-search-tools.tool.ts` is 656 lines and does mix three concerns: tool factory, search dispatcher, and a small `displayOptions` evaluator. Could be split into `n8n-search-tools.tool.ts` + `node-property-expander.ts` (the `expandNodeIntoOperations` + `buildInputSchema` machinery is reusable across the REST `getNodeSchema` path too). Not urgent; the file is still readable.
- `node-catalog.service.ts` grew by ~180 lines; the new `searchNodesStructured` + `getNodeSchema` paths reasonably belong there.
- `execute-node.service.ts` is ~310 lines, single class, clearly factored into `execute` → `extractRunResult` + `persistCallerMetadata`. ✅

### D.3 Naming

- `extractRunResult` does both extraction AND status classification. Name is fine but description could be sharper.
- `isInteractiveExecution` is a great name — describes intent, not implementation.
- `buildNodeType` in `proxy.ts` is well-named.
- `parseToolId` is good. The shared parser in `@n8n/cli/src/commands/exec/parse-tool-id.ts` duplicates the logic from `n8n-execute-tool.tool.ts:parseToolId` but with a documented reason (CLI has no catalog access). Acceptable duplication.

### D.4 Comments

- The `displayedFor` and `valueMatches` functions in `n8n-search-tools.tool.ts` have explanatory comments for non-obvious choices (conservative "compatible" for unknown context keys). ✅
- The `Step 1/Step 2/Step 3` comments in `parseToolId` are exemplary. ✅
- Two redundant identical comments in `insights-collection.service.ts` and `workflow-statistics.service.ts` ("single-node executions (aliased to manual; see Phase 0.6 ...)"). Tolerable for traceability.
- The phantom Vue computeds (A.9) are *well-documented* — which makes their absence from the template even more conspicuous.

### D.5 Magic numbers / strings

- `MAX_RESULTS = 200`, `MAX_CREDENTIALS = 200`, `STRUCTURED_SEARCH_LIMIT = 5` — all named constants. ✅
- The MCP tool description string literals are inline (line 134 of search-tools, line 162 of execute-tool, line 108 of list-credentials). Could be moved to constants for i18n eventually, but MCP descriptions don't translate today.

### D.6 Error handling

- Errors at boundaries (tool handlers, controllers) caught and converted to structured error payloads. ✅
- `persistCallerMetadata` swallows internal errors with a logged warning — correct (the execution succeeded). ✅
- `searchN8nTools` and `listN8nCredentials` boundary handlers catch all errors. ✅
- `WorkflowRunner.run` errors propagate to the controller. The controller has no try/catch — relies on the global Express error handler. ✅

---

## E. Test quality findings

### E.1 ExecuteNodeService tests

- Behavior-focused (does the workflow get synthesized correctly, is the credential check enforced, is metadata persisted?). ✅
- The "exec equivalent" test at line 58–105 asserts the *shape* of `runArg.workflowData` (`nodes.length === 2`, names match, type matches) — a strong invariant.
- Mocking is reasonable: `nodeTypes`, `credentialsService`, `workflowRunner`, `activeExecutions`, `executionMetadataService`, `logger` all mocked via `jest-mock-extended`'s `mock<T>()`. No over-mocking.
- Error paths covered: unknown node type, mismatched credential, metadata persistence failure. ✅
- ⚠ No test for the happy-path `caller: undefined` case — covered indirectly by line 241–251.
- ⚠ No test that asserts `actionTypeVersion` correctly handles array `description.version`. See A.1.

### E.2 n8n-search-tools tests

- 11 distinct tests covering: tool creation, inputSchema shape, omitted UI-types, displayOptions filtering, dotted ids, bare nodes, no-credentials, secret leakage, hasCredential pass-through, telemetry success/failure. ✅
- Test at line 251–279 is excellent: it asserts the id matches a 4-segment regex, not just "an id exists".
- The schema-unavailable test (line 416–437) is the right defensive check.

### E.3 n8n-execute-tool tests

- Covers all four parser shapes + parser-consultation fallback (line 334–358). ✅
- The "passes caller metadata with kind=mcp" test at line 239–256 is a smart way to lock in the attribution-shape contract.

### E.4 n8n-list-credentials tests

- Secret-leakage test (line 117–134) is explicit and verbose — the right energy for a security-sensitive surface.
- "ignores unresolvable nodeType" test (line 151–167) locks in the documented fallback.
- One light spot: no test that asserts `getMany` is called with `onlySharedWithMe: false` and `includeGlobal: true`. These are subtle but matter for shared-credential cases. Could be added.

### E.5 SDK proxy tests

- Tests against `vi.stubGlobal('fetch', fetchMock)` — clean, no real network. ✅
- The thenable test at line 191–206 is the single most important test in this suite. ✅
- The dual-shape coverage (`n8n.set.json` vs `n8n.slack.message.send`) is explicit.

### E.6 CLI command tests

- 7 tests for `parseToolId`/`parseParamFlag` cover the documented cases. ✅
- `node-and-exec.test.ts` mocks the `N8nClient` with a `FakeN8nClient` class and the `node:fs` module — clean factory pattern.
- ⚠ Per prod-handoff §3, the agent stalled mid-test-writing; not all CLI command paths may have full coverage. From inspection the `credential/list.ts` change (client-side `--node-type` filter) has no targeted test.

### E.7 General

- Mocks are typed via `mockInstance(X)` from `@n8n/backend-test-utils` — gives full type contract without the proxy-mock cost.
- A few `as never` casts in handler-call positions (`tool.handler({...}, {} as never)`) — fine; the second argument is the MCP request context which the handlers ignore.

---

## F. Spec compliance table

Cross-referenced against `2026-05-10-n8n-hub-implementation-plan.md` task numbers and `production-handoff.md` §9.

| Phase | Task | Implemented | Notes |
|---|---|---|---|
| 0 | 0.1 single-node mode | ✅ | `'single-node'` added to `WorkflowExecuteModeList`; statistics + insights tables updated |
| 0 | 0.4 SDK scaffold | ✅ | `@n8n/sdk` package created; proxy, errors, auth, pull stub |
| 0 | 0.6 `isInteractiveExecution` sweep | ✅ | 8 call-sites swapped; 12-case `it.each` test |
| 1 | 1.1 ExecuteNodeService | ✅ | 270 lines, 9 tests, credential ownership + type-match enforced |
| 1 | 1.2 POST /node + scope | ✅ | `@GlobalScope('node:execute')` decorator present; Zod DTO validates body |
| 1 | 1.3 OAuth scopes expansion | ✅ | `SUPPORTED_SCOPES` extends from 2 → 5 |
| 1 | 1.5 REST parity (`/rest/nodes`) | ✅ | `NodesController` with `tool:search` scope |
| 2 | 2.1 `searchNodesStructured` | ✅ | New method on `NodeCatalogService` |
| 2 | 2.2 `n8n_search_tools` | ✅ | But see A.2 hasCredential description bug |
| 2 | 2.3 `n8n_execute_tool` | ✅ | All 5 parser shapes tested |
| 2 | 2.4 `n8n_list_credentials` | ✅ | Strict `{id, name, type}` projection |
| 2 | 2.5 MCP registration | ✅ | All three tools verified registered |
| 3 | 3.4–3.9 CLI commands | ⚠ | Commands landed (`node search`, `node get`, `exec run`, `credential list --node-type`). CLI uses `X-N8N-API-KEY` against `/rest/` — may fail (prod-handoff §5.4) |
| 4 | 4.1–4.2 client + proxy | ✅ | Including thenable guard |
| 4 | 4.3 SDK type codegen | ❌ | Deferred per prod-handoff §3 |
| 4 | 4.5 demo script | ✅ | `oneonone-prep.ts` |
| 5 | 5.1 caller in DTO | ✅ | `caller` field plumbed via `ExecutionMetadata` |
| 5 | 5.2 list view | ⚠ | **Vue computeds defined but NOT used in template — see A.9** |
| 5 | 5.3 detail view | ❌ | Not done per prod-handoff §3 |
| 5 | 5.4 direct-link URLs | ✅ | `executionUrl` returned from controller |
| 5 | 5.5 filter chip | ❌ | Deferred per prod-handoff §3 |
| 3 | 3.3 OAuth+PKCE for CLI | ❌ | Deferred per prod-handoff §3 |

---

## G. Recommended fixes (in priority order)

### Critical (block merge)

1. **`GlobalExecutionsListItem.vue:65–80` — dead computeds.** Either wire `singleNodeHeadline` and `singleNodeCallerLabel` into the template (the right fix — that's what Phase 5.2 promised), or remove them. As-is, single-node executions render indistinguishably from workflow runs in the list, which contradicts the production-handoff claim "UI: `GlobalExecutionsListItem.vue` distinguishes single-node executions". Pair this with populating `summary.nodeType` in `ExecutionService.attachCallerToSummaries` (read from `EXECUTION_CALLER_METADATA_KEYS.nodeType`).

2. **`n8n-search-tools.tool.ts:57` — misleading `hasCredential` description.** Either change the description to "When true, only return nodes that *declare* a credential type" (honest about the current behavior), or intersect with the user's credentials at the catalog level. The current state will mislead LLM consumers.

### Important (fix before broader rollout)

3. **`node-catalog.service.ts:368, 386, 421` — `<nodeId>.default` ids are unaddressable.** `parseToolId` doesn't know how to handle `.default`, so an LLM calling back with the id from `getNodeSchema` would fail. Either drop the synthetic operation (just emit no `operations`) or special-case `parseToolId`.

4. **`n8n-search-tools.tool.ts:75` — description example.** Change `"slack.message.send"` to `"n8n-nodes-base.slack.message.send"` to match the 4-segment id actually returned.

5. **`@n8n/cli/src/client.ts` — `X-N8N-API-KEY` against `/rest/` endpoints.** Verify whether the existing API-key auth strategy is mounted on `/rest/`. If not (per the production handoff's open question #1), the CLI cannot actually call the new endpoints. Confirm or implement.

6. **`@n8n/cli/src/commands/credential/list.ts` — client-side filter on `--node-type`.** Combined with `--limit N` the user could see zero matches when they have matching credentials. Either fetch unfiltered then filter then truncate, or fetch enough to satisfy the limit. Document the behavior or fix.

### Minor / nits

7. **`execute-node.service.ts:127–133`** — `actionTypeVersion` array fallback could pick wrong version. Use `Math.max(...description.version)` when `description.version` is array.

8. **`n8n-execute-tool.tool.ts:151`** — extra trailing segments silently dropped. Consider returning an error or warning in the telemetry payload.

9. **`proxy.ts:198–200`** — `dryRun: false` is dropped (treated same as unset). Forward unconditionally if it's defined.

10. **Two redundant comments** in `insights-collection.service.ts:49–51` and `workflow-statistics.service.ts:51–53`. Tolerable; both reference Phase 0.6.

11. **`n8n-search-tools.tool.ts` is 656 lines** with three concerns (factory, dispatcher, property-expander). Could be split.

12. **No test for `n8n_list_credentials` `getMany` options `includeGlobal: true, onlySharedWithMe: false`.** Add a small assertion.

13. **`ExecuteNodeService` test** — add a case where `description.version` is an array (locks in version-selection behavior).

---

## H. Things done well

The `ExecuteNodeService` is a model of careful service design: narrow request DTO, defensive credential validation, dry-run short-circuit *before* touching the engine, post-execution metadata persisted with a swallowed-warning rather than failing the whole request. The SDK proxy's thenable guard (`SDK_RESERVED_KEYS = {then, catch, finally}`) is exactly the kind of subtle correctness detail that an LLM-driven implementation usually gets wrong, and the test covering it is excellent. The `isInteractiveExecution` helper sweep is also notably disciplined — a single named helper, swept across 8 sites, with a 12-row `it.each` test that locks in the exact semantics. Across the board the credential-secret defenses are tight: explicit projections, asserted by tests that grep `Object.keys(c).sort()`.

The codebase has a real "minimum viable but not careless" energy — the hackathon scope was honored without crossing into shortcut-creep on the security-critical surfaces. The known shortcuts (per-tool MCP scopes, OAuth+PKCE for CLI, codegen) are documented in the production handoff, not hidden.
