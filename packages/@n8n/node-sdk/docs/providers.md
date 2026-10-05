# Provider contracts

For how this part fits in n8n, see [architecture.md](architecture.md).

A provider gives one capability to a root node through an n8n `ai_*` connection. The UI calls
it a sub-node. The manifest format has no separate provider kind: a provider is an action whose
`output` is the capability (`x-n8n-supply`), and a root node is an action with a
`provider.input(kind)` input field.

| Kind         | Capability                      | n8n connection     | Input field name |
| ------------ | ------------------------------- | ------------------ | ---------------- |
| `chatModel`  | `ChatModel`: `chat(request)`    | `ai_languageModel` | `model`          |
| `memory`     | `Memory`: `load()`, `save()`    | `ai_memory`        | `memory`         |
| `tool`       | `Tool`: definition and `call()` | `ai_tool`          | `tools` (a list) |
| `embeddings` | `Embeddings`: `embed(texts)`    | `ai_embedding`     | `embedding`      |

The capabilities are provider-neutral (`ChatRequest`, `ChatReply`, `ToolCall`). Each provider
maps its own API in its node folder, so every root node runs with every provider.

## A provider

```typescript
export const openAiChatModel = openAi.provider('chatModel', {
	action: 'OpenAI Chat Model',
	summary: 'An OpenAI chat model for an AI node.',
	provides: 'chatModel',
	input: { model: t.modelId('openai'), temperature: t.num().optional() },
	async provide({ input, http }) {
		return { model: input.model, chat: async (request) => /* http.request(...) */ };
	},
});
```

- `provider()` makes a per-item action whose `output` is the capability and whose `run()` is
  `provide()`. `lintContract` rejects a provider with another cardinality.
- n8n calls `supplyData()`, not `execute()`. The host runs the action as one item: the
  parameters resolve against item 0 of the root node, and a failure always reaches the root.
- The capability sends requests with the `http` of the provider, so the credential, the
  egress check, and the retries of the provider apply.
- The host records each capability call as a run of the provider (`addInputData` and
  `addOutputData`), as the legacy sub-nodes do.
- `t.modelId(provider)` marks a model ID of the model catalog (models.dev). The generated module
  types it as `ModelOf<provider>`. The build declares `ModelCatalog` from the catalog, so `tsc`
  rejects a model ID that the provider does not offer.

## A root node

```typescript
input: {
	model: provider.input('chatModel'),
	tools: t.arr(provider.input('tool')).optional(),
	prompt: t.str(),
}
```

- Each `provider.input()` field becomes an n8n input of its connection type: a single field has
  `maxConnections: 1`, a list takes any number. The field is not a parameter.
- `run()` gets the capabilities in `input`. The host reads them once per run.
- A value that is not a contract capability of the kind (for example a legacy LangChain model)
  fails the run with a clear message.
- `lintContract` checks: one field per kind, the field name of the table, top-level fields
  only.
- A prompt action uses the reply helpers of the root export: `replySchema` as input,
  `replyOutput` with `deriveOutput: ({ schema }) => replyOutputOf(schema)`, and
  `promptReply(model, input)` in `run()`. A node that calls `chat()` itself uses
  `promptMessages`, `assertFinished`, `isReplySchema` and `parseReply`.

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
the results of its method calls, in order. A provider fixture lists `calls` of its
capability; `output` holds their results, and `routes` answer the HTTP requests of the calls.
