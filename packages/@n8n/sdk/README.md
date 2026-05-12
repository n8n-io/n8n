# @n8n/sdk

Beta TypeScript SDK for the n8n Hub. Exposes runtime access to ~480 nodes as `n8n.<service>.<resource>.<operation>(args)` via a JS Proxy that dispatches to `POST /rest/executions/node`. Build-time codegen of per-node `.d.ts` files is on the post-hackathon roadmap.
