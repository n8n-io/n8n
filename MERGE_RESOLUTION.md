# Merge Resolution Notes

Objective: merge `master` into `instance-ai-agents-sdk`, preserve the branch's Mastra removal and native `@n8n/agents` implementation, and port master-side Instance AI features that still apply.

## Current Merge Shape

- `HEAD` / ours: Instance AI rewritten away from Mastra, using `packages/@n8n/agents`, native agent runtime, tracing, workspace tools, and fresh storage shape.
- `master` / theirs: newer Instance AI and first-class Agents work landed after the branch fork.
- Conflict policy: keep the native agents architecture as the base, then port compatible master features into that architecture instead of restoring Mastra compatibility.

## Conflict Inventory

- `packages/@n8n/agents`: dependency/runtime conflicts from local runtime work plus master first-class agent support.
- `packages/@n8n/instance-ai`: main runtime, agent wiring, tool wrappers, MCP client, stream runner, workflow tools, and tests.
- `packages/cli/src/modules/instance-ai`: service, message parsing, TypeORM memory storage, and tests.
- `packages/@n8n/db/src/migrations/*/index.ts`: add master's agent table migrations while preserving current migration ordering.
- `pnpm-lock.yaml`: regenerate after package conflicts are resolved.

## Features To Port From `master`

- [x] MCP tool name validation and JSON schema sanitization.
- [x] MCP manager client connection policy enforcement.
- [x] Expiring Computer Use setup token handling.
- [x] Computer-use prompt improvements.
- [x] Credential setup nudge should replay sub-agent conversation context.
- [x] Planning context should preserve collected tool results across turns.
- [x] Terminal states should always produce user-visible output.
- [x] Archived workflow restore support in workflow tools.
- [x] Preserve node positions on AI workflow updates.
- [x] Form Trigger production links should use `/form` base URL.
- [x] Instance AI workflow preview rendering/thread push stabilization.
- [x] Eval helper/comparison updates that are still compatible with the branch.
- [x] CLI prompt-printing script and related package metadata.

## Resolution Log

- Initialized this file during the merge before resolving conflicts.
- Resolved `@n8n/agents` runtime conflicts by keeping master's newer run-loop/message-list model, retaining native telemetry root/tool spans, and unioning provider dependencies. Removed the obsolete `runtime-helpers.test.ts` that targeted the pre-merge discrete tool-result helper.
- Resolved Instance AI conflicts on the native agents path only. Mastra imports, Mastra MCP usage, and Mastra memory storage remain removed.
- Ported master MCP hardening to native `McpClient`, including unsafe server/tool name filtering, schema sanitization, SSRF validation, connection caching, and disconnect behavior.
- Ported terminal outcome and planned-task metadata storage to native thread patching. `TypeORMAgentMemory` now serializes thread mutations and protects patch-only metadata from stale full-thread saves.
- Ported workflow archive/restore support, node-position-preserving workflow updates, browser credential nudge replay, collected-tool-result planning context, and terminal fallback responses.
- Regenerated `pnpm-lock.yaml` after package conflict resolution and preserved both Instance AI native persistence migrations and master's generic agent table migrations.
- Validation run: `@n8n/agents` typecheck/lint/focused tests, `@n8n/instance-ai` typecheck/lint/focused tests, `packages/cli` typecheck/lint/focused Instance AI tests, and `@n8n/db` typecheck/lint all pass.
