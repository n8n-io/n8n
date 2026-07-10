# Agent Source Authoring

Use TypeScript as the editable Agent-core format. JSON is the persisted runtime
artifact and is produced by `build_agent`; do not hand-author raw Agent JSON for
new builds.

## Minimal source

```typescript
import { tool, fromAi } from '@n8n/workflow-sdk';
import { agent, customTool, skillRef, workflowTool } from '@n8n/workflow-sdk/agent';

const createIssue = tool({
  type: 'n8n-nodes-base.linearTool',
  version: 1,
  config: {
    parameters: {
      resource: 'issue',
      operation: 'create',
      title: fromAi('title', 'Concise issue title'),
      teamId: { __rl: true, mode: 'id', value: 'resolved-team-id' },
    },
    credentials: {
      linearOAuth2Api: { id: 'credential-id', name: 'Linear account' },
    },
  },
});

export default agent('Support triage')
  .model({ id: 'openai/gpt-5.2', credential: 'model-credential-id' })
  .instructions('Triage support requests and create actionable issues.')
  .memory({
    enabled: true,
    storage: 'n8n',
    observationalMemory: { enabled: true },
  })
  .tool(createIssue, {
    name: 'create_linear_issue',
    description: 'Create a Linear issue for engineering follow-up',
  })
  .tool(workflowTool('workflow-id', { name: 'notify_on_call' }))
  .tool(customTool('lookup_contract'))
  .skill(skillRef('support-policy'));
```

## Rules

- Discover node tools with `search_nodes`, then inspect each with
  `get_node_types`. Use the returned numeric version and exact parameter enum
  values. Never infer a node schema from general knowledge.
- A node-backed Agent tool must use the workflow SDK `tool(...)` factory and an
  explicit stable `.tool(instance, { name })` name. Do not use `node(...)`.
- In a tool's `config`, only `parameters` and `credentials` are valid. Workflow
  fields such as position, retry settings, notes, pin data, and subnodes fail.
- Credential values are explicit `{ id, name }` references returned by the
  credentials tool. Never use secrets, bare IDs, or `newCredential(...)`.
- Use `fromAi(...)` only for values the target Agent should choose at runtime.
  Resolve stable resource IDs with `get_resource_locator_options`.
- Use `.tool(workflowTool(id, options))`, `.tool(customTool(id, options))`,
  `.skill(skillRef(id))`, `.subAgent({ agentId, useWhen })`,
  `.subAgentSettings({ maxChildren, modelsByDifficulty })`, `.memory(config)`,
  `.providerTool(name, args)`, `.mcpServer(config)`, `.vectorStore(config)`, and
  `.configuration(config)` for their corresponding core fields.
- Workflow tools use the stable id returned by `list_workflows` and pass an
  explicit provider-safe `name` in `workflowTool(id, { name })`.
- Fresh Agents include `.memory({ enabled: true, storage: 'n8n',
  observationalMemory: { enabled: true } })` unless the user explicitly disables
  or changes memory. For any memory-specific request, load
  [memory.md](memory.md) before editing; `.memory()` has a typed first-class
  schema and is not an arbitrary extension object.
- Omitting `.model()` or `.instructions()` creates a valid editable draft.
- Do not put channels/integrations, recurring tasks, personalisation, published
  versions, custom-tool source, or skill bodies in Agent source. Use their
  first-class tools and UI flows.
- Do not call a workflow verifier after `build_agent`. A successful build is the
  verification boundary; use its `validation` result.
