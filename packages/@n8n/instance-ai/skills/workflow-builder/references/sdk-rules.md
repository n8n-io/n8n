# SDK Rules

Use this reference before writing or repairing TypeScript SDK code for
`workflows(action="create"|"update")`.

## Imports And Expressions

- Do not use web search to learn workflow SDK syntax or node type IDs. Use this
  reference, the `nodes` tool's search/type-definition results, and
  `workflows(action="create"|"update")` validation errors.
- Always import SDK factories directly: `workflow`, `node`, `trigger`,
  `sticky`, `placeholder`, `newCredential`, `ifElse`, `switchCase`, `merge`,
  `splitInBatches`, `nextBatch`, `languageModel`, `memory`, `tool`,
  `outputParser`, `embedding`, `embeddings`, `vectorStore`, `retriever`,
  `documentLoader`, `textSplitter`, `fromAi`, and `expr`.
- Use `expr('{{ $json.field }}')` for n8n expressions. Variables must be inside
  `{{ }}`.
- Do not use TypeScript-only syntax the parser cannot consume, especially
  `as const`.
- Use string literals directly for discriminator fields such as `resource` and
  `operation`.
- Do not specify node positions. The layout engine handles positions.

## Builder Pattern

Use `workflow('local-id', 'Workflow Name').add(startTrigger).to(nextNode)`.
Do not use `new WorkflowBuilder()`, `workflow([...])`, `connect(...)`, or helper
factories like `manualTrigger()` or `set()`.

For a linear workflow, define nodes first, then compose with `.add(...).to(...)`:

```typescript
import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

const startTrigger = trigger({
	type: 'n8n-nodes-base.manualTrigger',
	version: 1,
	config: { name: 'Manual Trigger' },
});

const setFields = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Set Fields',
		parameters: {
			mode: 'manual',
			assignments: {
				assignments: [
					{
						id: 'message',
						name: 'message',
						value: 'Hello from n8n',
						type: 'string',
					},
				],
			},
		},
	},
});

export default workflow('example-workflow', 'Example Workflow').add(startTrigger).to(setFields);
```

For branches, use SDK connection methods: IF uses `.onTrue()` / `.onFalse()`,
Switch uses `.onCase(index, target)`, Merge inputs use `.input(0)`,
`.input(1)`, and linear chains use `.to(nextNode)`.

## Node Configuration Safety Rules

- Fetch `nodes(action="type-definition")` before configuring nodes. Generated
  definitions and `@builderHint` annotations are the source of truth.
- Use live `nodes(action="explore-resources")` for resource locator, list, and
  model fields when credentials are available.
- If a configuration is unclear after reading the definition, ask for
  clarification or use placeholders. Do not guess.
- Parameter precedence is: user value > live resource/tool result >
  node `@builderHint` / default. If the user gave a concrete value, preserve it.
  Otherwise resolve it with tools or leave it as a placeholder.

## Credentials And Resources

- Use `newCredential('Name', 'id')` only for an explicit existing credential.
- Use `newCredential('Suggested Name')` when no exact credential is selected;
  `workflows(action="create"|"update")` preserves valid credentials and mocks
  unresolved ones.
- Always wrap credentials in the credential property names from the node type
  definition, for example `credentials: { slackApi: newCredential('Slack') }`.
  Do not set `credentials` directly to `newCredential(...)`.
- When editing round-tripped workflow code, remove `position` arrays and replace
  raw credential objects with `newCredential(...)`.
- The credential-selection guidance above applies to outbound service calls. For
  inbound triggers such as Webhook or Form Trigger, keep authentication at its
  default `none` unless the user explicitly asks to authenticate inbound traffic.
- Resource IDs with more than one candidate: If `explore-resources` returns more
  than one match and the user did not name a specific one, use
  `placeholder('Select <resource>')`.
- Never invent credential IDs, API tokens, resource IDs, Slack channels,
  Telegram chat IDs, email addresses, bearer tokens, or sample user data.
