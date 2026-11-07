# AGENTS.md

This package holds n8n's AI nodes: chat models, LLMs, embeddings, rerankers,
vector stores, and vendor nodes.

## Bounding AI response sizes

When you build a model, embeddings, or vendor client whose SDK accepts a custom
fetch or transport, bound its response size through `@n8n/ai-utilities`. Do not
use the SDK default transport. An uncapped client lets a hostile endpoint
stream an unbounded or compressed body and exhaust the heap.

See "Bounding AI response sizes" in
[`../ai-utilities/AGENTS.md`](../ai-utilities/AGENTS.md) for which wrapper to
use, the `N8N_AI_MAX_RESPONSE_SIZE` setting, and the SDKs that expose no seam.
