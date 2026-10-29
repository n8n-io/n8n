# AGENTS.md

`@n8n/ai-utilities` owns shared helpers that are specific to AI nodes, LLMs,
model configuration, and model output.

## Public subpaths

- `agent-config`
- `fromai-helpers`
- `generic-text-editor`
- `http-proxy-agent`
- `json-schema`
- `llm-output`
- `model-discovery`
- `node-catalog`
- `text-editor`
- `tokenizer`
- `web-search`

## Package boundary

- Put shared AI- or LLM-specific helpers in `@n8n/ai-utilities`.
- Put generic helpers and generic secret or PII redaction in `@n8n/utils`.
- Put workflow graph and traversal utilities in `n8n-workflow`.
- Keep domain logic in the package that owns that domain.

## Bounding AI response sizes

Every outbound AI client must bound the size of the response it buffers. A
hostile or misbehaving endpoint can stream an unbounded or highly compressed
body and exhaust the heap. The `http-proxy-agent` subpath applies the cap; it
counts decoded bytes, so a compressed body cannot expand past the limit. The
default is 100 MB, set through `N8N_AI_MAX_RESPONSE_SIZE` (0 disables it).

The general rule: never hand the SDK the raw transport. Give it the wrapper
that matches how the SDK takes one.

- The SDK accepts a `fetch`: pass `aiClientFetch`.
- The SDK builds requests itself (Ollama, Mistral): call `proxyFetch`.
- The SDK returns a Node stream (AWS Bedrock): build the client with
  `createBedrockRuntimeClient`, which installs a response-limited request
  handler for the stream.

Get `egressFilter` for `proxyFetch` from `this.helpers.getSecureEgressFilter()`.

Some SDK wrappers expose no such seam (Cohere, Google Gemini, Google Vertex,
HuggingFace). Do not hand-roll a limiter for these. Flag the gap for a
maintainer instead.
