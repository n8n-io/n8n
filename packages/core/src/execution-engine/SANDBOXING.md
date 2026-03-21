# Sandboxed Node Execution

Community nodes that ship 3rd-party npm dependencies run inside a
[secure-exec](https://github.com/rivet-dev/secure-exec) V8 isolate —
a lightweight sandbox with deny-by-default permissions. No containers,
no VMs. All existing core and community nodes are completely unaffected.

## When the sandbox kicks in

```
node.execute() called
  │
  ├─ description.thirdPartyDeps is absent or false
  │    → run directly in host process (existing behavior, zero overhead)
  │
  └─ description.thirdPartyDeps === true
       → executeSandboxed() — V8 isolate with permission gating
```

The sandbox is **opt-in only**. A community node must explicitly set
`thirdPartyDeps: true` in its description to enter the sandboxed path.
Without this flag, nothing changes.

## Community node configuration

A node that uses 3rd-party deps declares two fields on its description:

```typescript
description: INodeTypeDescription = {
  // ... standard fields ...

  // Required — triggers sandboxed execution
  thirdPartyDeps: true,

  // Optional — declares what capabilities the sandbox should allow
  permissions: {
    network: { allowedHosts: ['api.example.com'] },
    filesystem: { paths: ['/tmp/data/'], readonly: true },
    childProcess: { allowedCommands: ['ffmpeg'] },
    env: { allowedKeys: ['API_KEY'] },
  },
};
```

Every permission defaults to **denied**. If `permissions` is omitted
entirely, the node runs in a fully locked-down isolate where only
`require()` for its own shipped dependencies works.

## Instance-level configuration

Resource limits are **not** declared by node developers — they are
operational settings controlled by the n8n administrator:

```
┌──────────────────────────────────────────────┐
│  Per-isolate defaults (hardcoded, MVP)       │
│                                              │
│  memoryLimitMb     = 64 MB                   │
│  cpuTimeLimitMs    = 10,000 ms               │
│                                              │
│  Future: configurable via env / n8n config   │
└──────────────────────────────────────────────┘
```

## What gets serialized into the isolate

The V8 isolate is a separate execution context — it cannot access n8n's
host-side objects directly. Before execution, we serialize a bridge
payload and inject it as a JSON literal in the generated isolate code:

| Data                | How it's passed                             | Cost              |
|---------------------|---------------------------------------------|-------------------|
| Input items (`.json`) | `deepCopy()` → JSON literal in isolate code | Scales with data size — largest cost for big payloads |
| Node parameters     | Pre-resolved per item via `getNodeParameter()` | One loop over param keys × items |
| Node metadata       | Name + type string                          | Negligible        |
| Node source code    | `readFileSync()` from disk                  | Single file read  |
| Result              | `JSON.stringify()` streamed back via stdout marker | Same cost as input — scales with output size |

The execution context (`this` inside `execute()`) is **not** serialized.
Instead, a minimal shim is generated that exposes bridged methods:
`getInputData()`, `getNodeParameter()`, `getNode()`,
`helpers.httpRequest()`, `helpers.returnJsonArray()`, etc. These operate
on the pre-serialized data, so there is no cross-isolate call overhead
during execution.

**Cost summary:** the dominant cost is JSON serialization of input/output
data. For typical workflow items (small JSON objects) the overhead is
negligible (~1-5ms). For large payloads (MB-scale binary or deeply
nested JSON) it becomes the bottleneck.

## Reference community nodes

Two example nodes live in `community-nodes/` at the repo root. They
share **identical code** (a single URL property, `https.get()`) — the
only difference is whether `permissions` is declared.

### Non-Blocked Demo (`n8n-nodes-nonblocked`)

Demonstrates the **happy path**: same `https.get()` call, but with
permissions that allow it.

- `thirdPartyDeps: true` — triggers sandbox
- `permissions.network.allowedHosts: ['jsonplaceholder.typicode.com']` —
  allows outbound HTTPS to that host only
- All other capabilities (filesystem, childProcess, env) remain denied

### Blocked Demo (`n8n-nodes-blocked`)

Demonstrates **deny-by-default**: identical code, but no `permissions`.

- `thirdPartyDeps: true` — triggers sandbox
- No `permissions` — everything is denied
- The `https.get()` call fails with `EACCES`, proving the sandbox blocks
  undeclared capabilities

## Testing locally

```bash
# 1. Build the example nodes
cd community-nodes/n8n-nodes-nonblocked && npm install && npm run build
cd ../n8n-nodes-blocked && npm install && npm run build

# 2. Install into n8n's community node directory
mkdir -p ~/.n8n/nodes && cd ~/.n8n/nodes
npm install /path/to/n8n/community-nodes/n8n-nodes-nonblocked
npm install /path/to/n8n/community-nodes/n8n-nodes-blocked

# 3. Start n8n and test both nodes from the editor
pnpm dev
```

## Cloud deployment considerations

- **Native binary**: `secure-exec` ships a Rust V8 binary per platform.
  Docker images must include `@secure-exec/v8-linux-x64-gnu` (or the
  appropriate arch variant).
- **SSRF**: sandboxed network access bypasses n8n's `SsrfBridge`. This
  is acceptable because community nodes go through a review process
  where declared permissions (including `allowedHosts`) are verified
  before publication. Nodes cannot reach arbitrary internal services.
- **Memory**: each isolate allocates up to 64 MB. At high concurrency
  this adds up — instance-level limits or isolate pooling may be needed.
- **Process spawning**: `secure-exec` forks a child process for the V8
  runtime. Restrictive seccomp / gVisor profiles may need adjustment.
- **Disk layout**: the executor reads node source and `node_modules/`
  from disk via `readFileSync`. Cloud setups that pre-bake or mount
  community nodes differently must preserve the standard npm layout.

## Current limitations (MVP)

- Credentials are not yet bridged — `getCredentials()` returns `{}`
- `this.helpers.httpRequest()` is a simplified shim, not the full n8n
  HTTP helper
- Binary data bridging is basic (base64 only)
- ESM `import` is not supported at runtime inside the isolate — use
  standard TypeScript imports (tsc compiles them to `require()`)
- Some npm packages relying on Node.js internals not polyfilled by
  secure-exec (e.g. `zlib.constants`) may not work
