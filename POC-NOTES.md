# Toolsets POC — notes

Gmail-only toolset POC for `@n8n/agents`.

## Architecture choices

### Schema format
Reuse the existing `$fromAI(...)` zod machinery. The toolset uses
`generateZodSchema` from [`from-ai-parse-utils.ts`](packages/workflow/src/from-ai-parse-utils.ts)
directly: per filtered `INodeProperties`, build a `FromAIArgument`
(name → key, n8n type → fromAI type, displayName/description → description),
call `generateZodSchema`, assemble `z.object({...})`. No handrolled JSON
Schema converter, no `$fromAI(...)` placeholder strings — we own the
parameter object end-to-end.

### Invocation
Direct call to `createNodeAsTool` / `makeHandleToolInvocation` from outside
an executing node turned out to be hard (they close over engine-internal
state). Instead the toolset reuses the existing
[`EphemeralNodeExecutor.executeInline`](packages/cli/src/node-execution/ephemeral-node-executor.ts#L300)
that the node-tool chain (`run_node_tool`) already uses. Same path: build
`{ nodeType, nodeTypeVersion, nodeParameters: { resource, operation, ...args }, credentialDetails, inputData, projectId }`,
hand to the executor, get back a `NodeExecutionResult`. Engine handles
context construction, credential decryption, retries.

This is a free win — the CLI already had the exact primitive we needed.
The original "construct a one-node Workflow + WorkflowRunner.run()" plan
is unnecessary.

### Agent integration shape
**Auto-load (Option α).** Each attached app surfaces as a single dispatcher
tool whose input is `{ action, name?, args? }` where `action` ∈
`list_operations | describe_operation | invoke_operation`. No discovery
`load_toolset()` step. Wired in
[agents.service.ts:attachAppToolsets](packages/cli/src/modules/agents/agents.service.ts).

The tool's outer schema is loose by design — per-operation schemas only
materialize after `describe_operation`. The dispatcher validates `args`
against the per-operation zod schema inside `invoke_operation` to give
proper errors if the model passes the wrong shape.

### Persistence shape
[`AgentJsonAppRef`](packages/@n8n/api-types/src/agents.ts) + Zod schema
in [`agent-json-config.ts`](packages/cli/src/modules/agents/json-config/agent-json-config.ts):
```ts
{ kind: 'gmail'; credentialId: string; credentialName: string }
```

### Scope gating
No-op for POC. Gmail credential's six static scopes cover all 26 operations.

## Files added / changed

**New**
- `packages/cli/src/modules/agents/toolsets/gmail-toolset.ts` — operation registry + dispatcher tool factory.
- `packages/frontend/editor-ui/src/features/agents/components/AgentAppsListPanel.vue` — Apps section in the agent builder.
- `packages/frontend/editor-ui/src/features/agents/components/AgentAppsModal.vue` — Add App modal.

**Modified**
- `packages/@n8n/api-types/src/agents.ts` — `AgentJsonAppRef` + `apps` on `AgentJsonConfig`.
- `packages/cli/src/modules/agents/json-config/agent-json-config.ts` — Zod schema mirror.
- `packages/cli/src/modules/agents/agents.service.ts` — `attachAppToolsets` injection in `injectRuntimeDependencies`. Constructor gains `NodeTypes`.
- `packages/cli/src/modules/agents/__tests__/{agents-service-reconstruct-gating,agents-service-sync,agents.service}.test.ts` — extra `mock<NodeTypes>()` arg in constructor calls.
- `packages/frontend/editor-ui/src/features/agents/types.ts` — re-export `AgentJsonAppRef`.
- `packages/frontend/editor-ui/src/features/agents/constants.ts` — `AGENT_APPS_MODAL_KEY`.
- `packages/frontend/editor-ui/src/features/agents/module.descriptor.ts` — register the modal.
- `packages/frontend/editor-ui/src/features/agents/components/AgentConfigTree.vue` — insert `apps` row above `tools`.
- `packages/frontend/editor-ui/src/features/agents/views/AgentBuilderView.vue` — section dispatcher + add/remove handlers.

## Demo path

1. Open the agent builder.
2. In the sidebar tree there's a new **Apps** entry above **Tools**.
3. Click it → "Add app" → modal with Gmail.
4. Pick an existing `gmailOAuth2` credential → Add. *(Inline cred creation is intentionally skipped for the POC — create one in the Credentials view first if none exist.)*
5. Open the agent's chat. Prompt: "list the gmail operations available, then send a test email to me@example.com with subject 'POC' and body 'hi'".
6. Agent should call `gmail({ action: 'list_operations' })` → 26 operations returned, then `gmail({ action: 'describe_operation', name: 'message:send' })` → schema, then `gmail({ action: 'invoke_operation', name: 'message:send', args: {...} })` → `EphemeralNodeExecutor` runs the Gmail node, email lands.

## TODO: generalize spots

All marked in code with `// TODO: generalize`. Inventory:

- **[gmail-toolset.ts]** Whole module is Gmail-specific. Make it a generic factory taking an `INodeTypeDescription` + a per-node manifest blob.
- **[gmail-toolset.ts]** Hardcoded Gmail manifest text.
- **[gmail-toolset.ts]** `buildOperationRegistry` assumes the n8n convention of a top-level `resource` + `operation` selector. Other layouts (e.g. nodes scoped by `mode`) need different bucketing.
- **[gmail-toolset.ts]** `nodePropertyTypeToFromAIType` doesn't model `resourceLocator` or `multiOptions`. They get treated as plain strings/json — agent gets a callable shape but loses richness.
- **[gmail-toolset.ts]** `zodSchemaToJson` is a trivial walker for the POC. Replace with `zodToJsonSchema` from `@n8n/agents/utils/zod` once we want full fidelity in `describe_operation` output.
- **[agents.ts api-types]** `AgentJsonAppRef.kind` is `'gmail'` literal. Will widen to a string union as the catalog grows.
- **[agent-json-config.ts]** Zod schema mirrors the literal — same widening.
- **[agents.service.ts attachAppToolsets]** `if (app.kind === 'gmail') ...` hardcoded. Replace with a registry keyed by `kind`.
- **[AgentAppsModal.vue]** Single hardcoded Gmail entry. Needs a catalog list + per-app credential type derivation.
- **[AgentAppsModal.vue]** Inline credential creation skipped. Wire `uiStore.openNewCredential()` + auth-change listener (see `NodeCredentials.vue` for reference).
- **Scope gating** — no-op today. Per-operation `requiredScopes: []` slot exists in spirit; needs an authored mapping when a real gating need lands.

## Open architectural questions surfaced during build

1. **Execution history pollution.** Every `invoke_operation` call goes through `EphemeralNodeExecutor.executeInline`. I haven't audited whether that creates a visible execution row. If yes, an agent that calls Gmail 50 times during a conversation will pollute the user's execution history. Worth checking before this lands as anything more than a POC — probably want a `suppressPersistence` flag, or to use a different execution path for toolset invocations.

2. **Schema fidelity in `describe_operation`.** The current `zodSchemaToJson` produces a thin shape. Some Gmail operations have `collection`/`fixedCollection` params that flatten to `'object'` with no nested structure — the model can technically still pass them through, but won't know the inner shape. Real fix is to plug `zodToJsonSchema` in. Cheap, just didn't do it for the POC.

3. **Catalog for `list_operations`.** Today the tool description string contains the manifest *and* tells the agent to call `list_operations` first. This is two ways to find out the same thing. Decide whether the manifest stays in the tool description (cheap, always seen) or is gated behind `list_operations` (saves tokens, costs a turn).

4. **One tool per app vs. one tool total.** With many apps attached, the agent's tool list grows linearly. Once we have 5+ apps it might be worth a single `apps` tool that takes `appName` as the first arg, collapsing the surface. Not urgent for one app.
