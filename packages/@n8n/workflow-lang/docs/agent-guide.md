# Agent guide: compiled workflow engine

This guide is for an agent that works on one card of the compiled workflow engine. Read it once, then work.
The card in your prompt gives the scope, the lists to work from and the report to give.

## What the engine is

- `packages/@n8n/workflow-lang`: the workflow language, its compiler to bytecode, the converter from an n8n
  workflow, the node compiler, the hand-written library nodes and the reference runner.
- `workflow-runtime/`: the Zig runtime `wfrt` that runs the bytecode. Rules: `workflow-runtime/docs/zig-standards.md`.
- `packages/@n8n/workflow-fallback-host`: the fallback host. It runs the v1 code of a node that is not compiled.
- `packages/cli/src/modules/compiled-engine`: the n8n module that compiles, loads and records runs.

A node of a workflow runs without the fallback host in one of four ways, in this order:

1. A core node that the converter lowers to language code (`src/convert`).
2. A hand-written library node (`src/nodes/*.ts`), linked by `src/convert/library.ts`.
3. A declarative node, from its routing description (`src/node-compile/routing.ts`).
4. A node compiled from its TypeScript source (`src/node-compile`), only for the operations in
   `src/node-compile/verified.generated.ts`. The verifier writes that list.

Every other node runs in the fallback host.

## Rules

- **Parity.** The result, the error (message, description, `httpCode`), the requests and the saved run data
  must equal those of the v1 engine of n8n. When you cannot make a form exact, keep it in the fallback host
  with a clear diagnostic. Never ship a form that can differ from v1. A wrong compile is worse than no compile.
- **Nothing fails that v1 runs.** "Not compiled" means "runs in the fallback host". At a limit, wait or hand
  over to the host. Do not fail the run.
- **Proof first.** For each new native form, write a differential test first: generate cases, run v1 (the real
  engine, the task runner or the library that v1 uses) and the native form, and require an equal result or a
  refusal. Do not write an error text or a behaviour of v1 from memory. Record it.
- **Secrets.** A compiled module never holds a secret. Node code never reads the value of a credential field:
  a field is a marker that the runtime puts into a request. Do not weaken this.
- **No network.** The recorders block each connection that leaves the machine. Do not bypass the block.
- **Real workflows.** Do not open real workflow files. Do not copy names, ids or values from them. Use the
  aggregate lists that the card names. Never name a customer.
- **Cost.** A compiled operation must not get more expensive without a reason. State each rise and its reason.
- **Code.** No `any`. Avoid `as`. No comments in `src/node-compile` and in `scripts/verify-compiled-nodes.ts`
  (`node scripts/no-comments.ts src/node-compile scripts/verify-compiled-nodes.ts scripts/no-comments.ts`).
  Bounded tables and caches. Keep edits small and local in the large shared files. Do not move or reformat code.
- **Text.** Write commit messages, comments, diagnostics and documents in Simplified Technical English.
- **Git.** Stage explicit paths only. Never `git add -A`, `git add .` or a directory. Commit subjects end with
  `(no-changelog)`. This repository is public: describe what the code does now, in neutral words.

## Setup

Run this in the root of your worktree. It moves the worktree to the integration branch and links the installed
and built packages of the main checkout. No install and no build is necessary.

```bash
packages/@n8n/workflow-lang/scripts/agent-setup.sh
```

## Find code without a search

The large files are `src/node-compile/specialise.ts` (the node compiler), `src/convert/code-native/translate.ts`
(the Code node translator), `src/convert/library.ts` (links library nodes), `src/convert/expression.ts`,
`src/nodes/chain-llm.ts` (AI chains and agents), `workflow-runtime/src/shell/server.zig` and
`workflow-runtime/src/core/core.zig`. Do not read them whole.

```bash
cd packages/@n8n/workflow-lang
node scripts/outline.ts src/node-compile/specialise.ts            # each top-level declaration with its lines
node scripts/outline.ts src/convert/code-native/translate.ts date --deep   # names that match, also nested functions
```

| To find | Look in |
|---|---|
| Why a node does not compile (the diagnostic text) | `grep -n "<text>" src/node-compile/*.ts`; the rules are in `docs/node-compile-rules.md`, the catalogue in `src/node-compile/diagnostics.ts` |
| Why a Code node is not translated | `src/convert/code-native/translate.ts`, `check.ts`, `catch-check.ts`; Date rules in `src/compiler/dates.ts` |
| Why the converter keeps a node in the host | `src/convert/library.ts` (library nodes), `src/convert/native.ts`, `registry.ts` (core nodes), `host-node.ts`, `ai-cluster.ts` (AI) |
| An expression that does not translate | `src/convert/expression.ts`, `native-expression.ts`, `src/legacy` |
| A request helper of compiled nodes (`__request`, `__apiError`) | the text constants at the top of `src/node-compile/specialise.ts`, and `lower-cost.ts` |
| Credentials: markers, flags, derived values, minted tokens | `src/node-compile/credential-forms.ts`, `evaluate-node.ts`, `src/credentials`; in the runtime `src/shell/creds.zig`, `renew.zig` |
| The v1 recorder and the network block | `src/nodes/__tests__/v1-recorder.ts`, `no-network.ts` |
| Library node equivalence cases | `src/nodes/__tests__/equivalence-cases.ts`, `equivalence.test.ts`, `ai-cases.ts` |
| Core node behaviour against the v1 engine | `src/convert/__tests__/behaviour` (the oracle runs the real v1 nodes) |
| The Node.js identity and time zone that a compiled form depends on | `src/convert/node-identity.ts` |
| Outbound HTTP, limits and stored files in the runtime | `workflow-runtime/src/shell/egress.zig`, `request.zig`, `blob_store.zig`, `store_rule.zig` |
| Fallback host admission, lanes and replay | `workflow-runtime/src/shell/server.zig` (`fbAdmit`), `workflow-fallback-host/src/lanes.ts`, `http-replay.ts`, `docs/isolation.md` |
| The performance model and its gate | `workflow-runtime/docs/perf-model.md`, `bench/perf-gate.sh` |

## Checks

Work from `packages/@n8n/workflow-lang`. This machine is not in UTC: the converter keeps local-time code in the
host unless the target zone is declared, so set `TZ=UTC WF_TARGET_RUNNER_ZONE=UTC` for the verifier.

```bash
pnpm exec tsc --noEmit -p tsconfig.json
pnpm exec vitest run <the test files of what you changed>
# one or more node types against v1; a pattern run prints its entries and does not write the lists
TZ=UTC WF_TARGET_RUNNER_ZONE=UTC node scripts/verify-compiled-nodes.ts --detail '^(slack|box)$'
# the compiled source of one node instance, or its compile errors
node scripts/compile-instance.ts Slack/V2/SlackV2.node.ts n8n-nodes-base.slack 2.3 '{"resource":"channel","operation":"get"}'
```

For the Zig runtime, from `workflow-runtime`: `zig build check` (it also compiles the tests for Linux),
`zig build lint` (never raise a line of `lint-ratchet`; lower a line when lint says so), then
`zig build install-tests && SKIP_FUZZ=1 CI_NO_BUDGET=1 ./bench/run-tests.sh`. A plain `zig build` is a debug
build: measure only with `zig build -Drelease=true`.

Do not run the verifier without a pattern. Do not write `verified.generated.ts` or `cost.generated.ts`: report
the entries, and the coordinator merges them.

## Before you hand back

1. `git merge poc/compiled-workflow-engine` into your branch and resolve the conflicts.
2. Regenerate: `pnpm generate`, and `node scripts/convert-cost.ts --write` when the converter changed.
3. Run `pnpm exec vitest run src/node-compile src/nodes src/convert src/compiler src/legacy src/services src/__tests__`
   (about 10 minutes), and the tests of each other package that you changed.
4. Commit. The branch must merge as a fast-forward.

Own your item until its rows are closed, or until you can state exactly why a row cannot be closed. Hand back
when you have a measured result.

## Report

Give, in under 300 words:

- What is exact now, with the measured count (verifier entries, slice census rows, differential test numbers).
- What stays in the fallback host, and the reason for each.
- Each difference from v1 that you found and did not fix. Put these first when there are any.
- What the coordinator must run that you could not.
