# Sandboxed execution of contract actions (plan)

Status: plan. Only the egress and credential hosts check is built. Research: lane S1, with the
investigation `n8n-investigations/sandboxed-step-runtime` (SSR).

## Goal

A node can bring any dependency, and later another language, and still run safely. First-party
bundles run in-process. Community and AI-generated bundles run in a sandbox.

## What the contract already gives

- `run()` gets only `input`, `http`, `log` and `limits` (`src/define.ts`, `RunContext`).
- All network I/O goes through `http.request`. The host applies the credential.
- Secrets never enter `run()`. The guest sees credential settings only.
- The executor owns parameters, defaults, validation, retries, limits, pairing and continue on fail.
- Bundles are self-contained (esbuild inlines dependencies), hashed, signed (ed25519 manifest) and
  declare the Node Contract version they need (`nodeContract`, for example `2.1.0`, see
  [node-contract.md](node-contract.md)). The interface of each kind is defined in WIT
  (`spec/wit/`). `spec/json-rpc.md` gives its JSON-RPC form for process and container
  runtimes. The host runs the versions in `N8N_NODE_CONTRACT_RANGE` and runs @1 bundles through
  an adapter (`src/action-api-v1.ts`).
- `replayFixtures` replays fixtures through any `ExecutorHost`.

## What blocks it

1. No isolation. The frozen loader uses `vm.compileFunction` in the n8n process. A bundle can reach
   `globalThis`, `process` and global `fetch`. Global `fetch` skips the SSRF policy and the request cap.
2. `node:*` imports fail only at load time. The publish gate does not lint them.
3. `fullResponse` returns all response headers.
4. There is no CPU or memory limit.

## Options

| Option | Isolation | Warm cost per item | Dependencies and languages |
|---|---|---|---|
| `node:vm` | weak | ~0.2 µs | JS |
| isolated-vm in the task runner | medium to strong | tens of µs (unverified) | JS, pure npm |
| WASM component in a wasmtime sidecar | strong: no ambient authority, imports are the only permissions, CPU and memory limits | ~20 µs in batches of 100 | JS (89 of the top 100 npm packages), Python, Rust |
| Task-runner process | OS process | IPC per batch | JS, Python, native addons |
| gVisor or microVM | strongest | milliseconds | any, including native |

S1 probe (SSR sidecar, `http-enrich` step, noisy macOS host):

- Load: 3.7 s cold, 107 ms cached.
- One host HTTP call per item: 88 to 149 µs per item in batches of 100. A real API call takes 50 to
  500 ms, so the sandbox adds less than 1 % to an HTTP-bound action.
- The first call on a fresh instance costs 0.4 to 0.9 ms. The executor must send batches of items,
  not one call per item.
- All 4,402 host calls carried only the secret name. The guest saw no token.

## Safe model: capabilities

- The host interface is the only capability. The guest gets no ambient network, filesystem or clock.
- Network goes only through host `http`, with the SSRF policy and credential injection on the host.
- The contract declares egress hosts (`egress`, see "Egress and credential hosts"). The host
  enforces them.
- Binary data passes as handles, not as files.
- The host sets CPU time, memory, wall clock and output size limits.
- The instance policy decides where a bundle runs. A bundle signed with a first-party key runs
  in-process. Every other bundle runs in the sandbox.
- A custom credential `authenticate` sees raw secrets. It cannot be community code without its own
  sandbox.

## Languages

A Python or Rust action implements the same WIT interface against the same JSON Schemas. The codegen
for the AI builder does not change. The same fixtures prove parity across languages.

## Phases

| Phase | Work | Effort |
|---|---|---|
| 0 | Publish-gate lint: no `node:*`, no free `fetch`, `process` or `globalThis`. Wall-clock cap. Redact auth headers in `fullResponse`. Host-enforced egress hosts are built (see below). | ~1 week |
| 1 | A JS shim for the WIT interfaces (`spec/wit/`), so current bundles run unchanged. A `SandboxRuntime` seam next to the bundle loader. `replayFixtures` runs through the seam. | 2 to 3 weeks |
| 2 | A wasmtime sidecar for untrusted bundles, in the task-runner process family. Build: frozen bundle, then ComponentizeJS (or QuickJS), then sign the component digest. | 3 to 4 weeks |
| 3 | Python and Rust actions. A gVisor or microVM tier for native dependencies, as an admin opt-in. | later |

## Decisive experiments

1. Run one real frozen action (a paginated read) through the sidecar with its fixtures. Pass: less
   than 1 ms per item including one HTTP call, and the same output as in-process.
2. An escape suite: global `fetch`, an echo of the auth header, `timeoutMs: 1e9`, a 100 MB output item, and
   the SSR malicious steps.
3. Linux amd64 numbers in queue mode. SSR measured macOS arm64 only.
4. A Python port of the same action that passes the same fixtures.
5. isolated-vm in the JS task runner. If it is within 2x of WASM, it is the faster JS-only path.

## Risks

- A JS component is about 12 MB and takes 1.4 to 3.7 s to compile. Compile ahead of time at install.
- ComponentizeJS builds are not reproducible. Trust rests on the signed component digest.
- An allowed API can still reflect a secret back. The credential hosts limit this to the hosts
  of the credential.
- In-process bundles still reach global `fetch`. The egress check protects the secret, because
  only host `http` applies it. Other data needs isolation.
- Native npm addons never run as WASM. They need the heavy tier.

## Egress and credential hosts

Built. One check, in the host `http` import: `httpFor().request` in `src/runtime.ts`, the trigger
`http` in `src/triggers.ts`, and the binary transfers, which go through the same `request`. The
logic is in `src/egress.ts`.

- A credential type declares `hosts` (`api.notion.com`, or `*.example.com` for subdomains only).
  The host of its `baseUrl(fields)` is added. The user's "Allowed HTTP Request Domains" list
  (mode `domains`) adds hosts. `all` and `none` do not remove the own hosts.
- A credential type with no `hosts` and no `baseUrl` keeps the legacy meaning of that setting,
  as the legacy HTTP Request node does: `all` is no limit, `domains` is the list, `none` refuses.
- An action declares `egress`: static hosts, host templates over enum input fields
  (`{region}.api.example.com`), or `fromInput` for a URL field. Without it, the action reaches
  the hosts of the node and credential base URLs. An action with no base URL and no `egress` has
  no action limit, so a version frozen before `egress` still runs. The credential hosts apply.
- The host refuses a request outside the action hosts or the credential hosts before it sends it.
  A refused request is not retried. Every page is a new request, so every page is checked.
- The host sets `allowedDomains` on the request options, so the request layer checks every
  redirect hop. The list is the action hosts narrowed by the credential hosts. A host from
  `fromInput` does not bind redirect hops; the credential hosts still do.
- A `url` must be an absolute http or https URL. A `path` must start with one `/`. The host adds
  it to the base URL path and refuses a result with another origin.
- `egress` is in the contract document and in the contract hash. A new host is a major change.
  A removed host is a minor change. The publish gate refuses `*` and a value that is not a host.
- The AI builder runs the same rules when it builds a workflow (node contracts on): a static
  host outside the hosts of the bound credential is a build error that names the host and the
  credential. An expression is a warning, because the host checks it at run time.

## Binary data

A file is an opaque host handle (`binary` in `spec/wit/host.wit`, Node Contract 2.2.0). The
bytes stay in the n8n binary data store (filesystem, S3, or database mode). Only an action with
a `binary()` field targets 2.2.0. Every other bundle targets 2.1.0.

- Contract: `binary()` in `input` names a binary of the input item. In `output`, a top-level
  `binary()` field becomes `item.binary.<field>`. The flow SDK types it as `Binary`, and a
  lambda `(item) => item.binary.data` compiles to `{{ $binary.data }}`.
- Inline JS (now): the executor keeps a handle table for each execution. `run()` gets frozen
  `{ meta, read() }` objects, never the n8n entry. A handle as `http.request` body streams from
  the store. `response: 'binary'` streams the response into the store. `binary.create` stores
  chunks as the action yields them. A request with a streamed body does not follow redirects,
  because the HTTP client then keeps the whole body in memory.
- WASM: `binary`, `binary-reader` and `binary-writer` are component resources. A read or a
  write moves one chunk (`list<u8>`) across the boundary. `send` and `fetch` take a borrowed
  handle, so the host streams the bytes and the guest never sees them. In the JSON of the run
  input and of each item, a binary is `{ "$binary": <id> }`; `open` and `binary.id` map ids to
  handles.
- Process or container: the same calls over JSON-RPC, with integer handle ids. Chunks as base64
  fit small files only. For large files the host gives a short-lived presigned URL of the store
  (S3), or a side channel (a second socket or a mounted file), and keeps the JSON-RPC message
  small. `send` and `fetch` need no bytes in the guest at all.
