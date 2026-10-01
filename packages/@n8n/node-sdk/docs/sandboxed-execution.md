# Sandboxed execution of contract actions (plan)

Status: plan only. Nothing here is built. Research: lane S1 (NODE-6071 spike), with the
investigation `n8n-investigations/sandboxed-step-runtime` (SSR).

## Goal

A node can bring any dependency, and later another language, and still run safely. First-party
bundles run in-process. Community and AI-generated bundles run in a sandbox.

## What the contract already gives

- `run()` gets only `input` and `http` (`src/define.ts`, `RunContext`).
- All network I/O goes through `http.request`. The host applies the credential.
- Secrets never enter `run()`. The guest sees credential settings only.
- The executor owns parameters, defaults, validation, retries, limits, pairing and continue on fail.
- Bundles are self-contained (esbuild inlines dependencies), hashed, signed (ed25519 manifest) and
  carry an ABI number (`NODE_CONTRACT_ABI`).
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
- The contract declares egress hosts (`flow.capabilities.http.hosts`). The host enforces them.
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
| 0 | Publish-gate lint: no `node:*`, no free `fetch`, `process` or `globalThis`. Host-enforced egress hosts and wall-clock cap. Redact auth headers in `fullResponse`. | ~1 week |
| 1 | ABI 2: a WIT host interface (`n8n:contract@2`) and a JS shim, so current bundles run unchanged. A `SandboxRuntime` seam next to the bundle loader. `replayFixtures` runs through the seam. | 2 to 3 weeks |
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
- An allowed API can still reflect a secret back. Binding each secret to its hosts limits this.
- Native npm addons never run as WASM. They need the heavy tier.
