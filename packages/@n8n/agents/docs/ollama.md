# Ollama

Agents can use the existing `ollamaApi` credential. Set its Base URL to the
Ollama server that the n8n backend can reach. The API key is optional. Set it
when a proxy requires bearer authentication.

After a credential is selected, model discovery calls `GET /api/tags` on that
server. It keeps the exact model names, including namespaces and tags.
`POST /api/show` supplies tool calling, thinking, and context window metadata.
Models that report no completion capability are excluded. A failed metadata
request does not remove a model from the installed list.

Ollama has no static model list or default model in Agents. An empty server
returns an empty list. A server failure returns an unavailable list. The public
model catalog does not add models to either list. Agents do not infer token
prices for Ollama models.

The runtime uses the existing OpenAI-compatible adapter at
`<base-url>/v1/chat/completions`. It supports generation, streaming, token usage,
tool calls, and JSON schema requests. Support for each feature depends on the
installed model and Ollama version. The server controls the active context size;
the context metadata describes the model's capacity.

```typescript
const agent = new Agent('local-assistant').model({
	id: 'ollama/gemma4:latest',
	baseURL: 'http://localhost:11434',
});
```

## Tests

The integration tests use Gemma 4 on `http://localhost:11434`. Install the model
before a live run. Run these commands from `packages/@n8n/agents`:

```sh
OLLAMA_TESTS=true pnpm test:integration src/__tests__/integration/ollama.test.ts --maxWorkers=1
OLLAMA_TESTS=true pnpm test:integration:record src/__tests__/integration/ollama.test.ts --maxWorkers=1
pnpm test:integration:replay src/__tests__/integration/ollama.test.ts --maxWorkers=1
```

Replay uses committed responses and blocks network access, including localhost.

API references: [model listing](https://docs.ollama.com/api/tags),
[native API](https://github.com/ollama/ollama/blob/main/docs/api.md), and
[OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility).
