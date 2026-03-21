# n8n-nodes-blocked

Demo community node that makes network requests **without** declared
permissions. Identical code to `n8n-nodes-nonblocked`, but omits
`permissions` — so the sandbox blocks the request.

See [SANDBOXING.md](../../packages/core/src/execution-engine/SANDBOXING.md).
