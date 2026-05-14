# @n8n/sdk

Beta TypeScript SDK for the n8n Hub. Exposes runtime access to ~480 nodes as `n8n.<service>.<resource>.<operation>(args)` via a JS Proxy that dispatches to `POST /rest/executions/node`. Build-time codegen of per-node `.d.ts` files is on the post-hackathon roadmap.

## Session tracking

Every request is tagged with a `caller.sessionId` so executions originating from the same SDK client are grouped together in the Hub executions UI. By default a random UUID is generated the first time you call `createClient(...)` and reused for the lifetime of that client. You can override it at the client level (e.g. to give a long-running job a stable, human-readable session identifier) or per call by passing `caller` directly to a node invocation.

```ts
import { createClient } from '@n8n/sdk';

const n8n = createClient({
  baseUrl,
  token,
  caller: { kind: 'sdk', name: 'my-app', sessionId: 'daily-digest-2026-05-13' },
});

// Per-call override wins over the client default:
await n8n.set.json({
  values: { hello: 'world' },
  caller: { kind: 'sdk', name: 'my-app', sessionId: 'one-off-debug' },
});
```
