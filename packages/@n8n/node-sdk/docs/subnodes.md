# Sub-node contracts

A sub-node supplies one capability to a root node through an n8n `ai_*` connection. The
contract format has no separate sub-node kind: a sub-node is an action whose `output` is
`supplied(kind)`, and a root node is an action with a `supplied(kind)` input field.

| Kind         | Capability                      | n8n connection     | Input field name |
| ------------ | ------------------------------- | ------------------ | ---------------- |
| `chatModel`  | `ChatModel`: `chat(request)`    | `ai_languageModel` | `model`          |
| `memory`     | `Memory`: `load()`, `save()`    | `ai_memory`        | `memory`         |
| `tool`       | `Tool`: definition and `call()` | `ai_tool`          | `tools` (a list) |
| `embeddings` | `Embeddings`: `embed(texts)`    | `ai_embedding`     | `embedding`      |

The capabilities are provider-neutral (`ChatRequest`, `ChatReply`, `ToolCall`). Each provider
maps its own API in its node folder, so every root node runs with every provider.

## A sub-node

```typescript
export const openAiChatModel = openAi.subnode('chatModel', {
	action: 'OpenAI Chat Model',
	summary: 'An OpenAI chat model for an AI node.',
	supplies: 'chatModel',
	input: { model: modelId('openai'), temperature: num().optional() },
	async supply({ input, http }) {
		return { model: input.model, chat: async (request) => /* http.request(...) */ };
	},
});
```

- `subnode()` makes a per-item action whose `output` is `supplied(kind)` and whose `run()` is
  `supply()`. `lintContract` rejects a sub-node with another cardinality.
- n8n calls `supplyData()`, not `execute()`. The host runs the action as one item: the
  parameters resolve against item 0 of the root node, and a failure always reaches the root.
- The capability sends requests with the `http` of the sub-node, so the credential, the
  egress check, and the retries of the sub-node apply.
- The host records each capability call as a run of the sub-node (`addInputData` and
  `addOutputData`), as the legacy sub-nodes do.
- `modelId(provider)` marks a model ID of the model catalog (models.dev). The generated module
  types it as `ModelOf<provider>`. The build declares `ModelCatalog` from the catalog, so `tsc`
  rejects a model ID that the provider does not offer.

## A root node

```typescript
input: {
	model: supplied('chatModel'),
	tools: arr(supplied('tool')).optional(),
	prompt: str(),
}
```

- Each `supplied()` field becomes an n8n input of its connection type: a single field has
  `maxConnections: 1`, a list takes any number. The field is not a parameter.
- `run()` gets the capabilities in `input`. The host reads them once per run.
- A value that is not a contract capability of the kind (for example a legacy LangChain model)
  fails the run with a clear message.
- `lintContract` checks: one field per kind, the field name of the table, top-level fields
  only.

## Typed flow SDK

The generated module gives a provider factory that returns `Provider<In, Ctx, kind>`, and the
root field type `Provider<NoInfer<In>, NoInfer<Ctx>, kind>`. A provider of another kind, and a
legacy `provider()`, fail `tsc`. A contract provider in `node({ providers })` fails too, because
a legacy root node cannot run it.

A derived module types a legacy provider by its connection type, e.g.
`Provider<In, Ctx, "ai_languageModel">`, and a legacy root node takes its providers in
`providers`, one slot for each `ai_*` input. A derived root node takes only derived providers.

```typescript
ai.prompt({
	name: 'Summary',
	model: openAi.chatModel({ name: 'GPT', model: 'gpt-5-mini' }),
	prompt: (item) => item.text,
});
```

## Fixtures

A root fixture records each capability in `supplied` (by input field): its data members and
the results of its method calls, in order. A sub-node fixture lists `calls` of its
capability; `output` holds their results, and `responses` holds the HTTP responses of the calls.
