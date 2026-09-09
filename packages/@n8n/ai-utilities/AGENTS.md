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
