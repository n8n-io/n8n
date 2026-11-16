# mcp-guard: context for another agent

POC. Branch `poc/linear-readonly-guard`. Draft PR: https://github.com/n8n-io/n8n/pull/43623.
Ticket: https://linear.app/n8n/issue/TRUST-1173

## Goal

When an agent runs in the Agent Builder test chat, its Linear and Notion MCP calls must never change real data.

- A read goes to the real MCP. The result is copied into AI Gym. The gym answers.
- A write goes only to the gym.
- An unknown tool counts as a write and goes only to the gym.

AI Gym is a simulator of vendor services. Repo: `/Users/rod/Documents/programming/ai-gym`.

## Where the guard hooks in

- "Preview mode" means `runType === 'test'`. No env var turns the guard on.
- `agents/agent-runtime-reconstruction.service.ts` (`makeMcpClientFactory`) wraps the MCP fetch with `withMcpGuard(aiMcpFetch, agentId)` for test runs only.
- `mcp-guard-fetch.ts`: a request to `mcp.linear.app` or `mcp.notion.com` on path `/mcp` goes to `McpGuardService.handleMcp` in the same process. No HTTP route exists.
- Paths `/sse`, `/sse/...` and `/messages` on those hosts get a 403. The SSE transport has no guard.
- Other paths on those hosts (OAuth, discovery) go to the real server. OAuth Connect still works.
- Production runs and sub-agents are not guarded.

## Files (`packages/cli/src/modules/mcp-guard/`)

| File | Role |
|---|---|
| `services.ts` | One profile per service: host, read and write tool lists, gym credential kind, placeholder seed, hydrator. |
| `linear-tools.ts`, `notion-tools.ts` | Explicit tool names. Exact match. Not on the read list means write. |
| `router.ts` | `GuardRouter`. Write: gym. Read: real MCP, hydrate, gym. If the gym lacks the read tool, return the real result. Errors become tool errors. A failed read never becomes a write. |
| `hydrator.ts` | Linear. Uses real MCP read tools only. Linear OAuth tokens fail on `api.linear.app` GraphQL. |
| `notion-hydrator.ts` | Notion. Reads `notion-fetch`, `notion-search` and `notion-query-data-sources` results. Seeds pages (title, body) and databases (simple property types, rows). |
| `runs.ts` | `RunRegistry`. One gym tenant per agent: `guard-<agentId>`. It checks the tenant exists before each call and builds it again if it is gone. |
| `gym-admin.ts` | Admin API client. PUT tenant (delete and recreate on 409), seed, credentials, delete. |
| `mcp-upstream.ts` | MCP client. Sends the `Host` header to the gym with `http.request`. |
| `mcp-guard.service.ts` | `handleMcp(host, runId, req)`. One stateless MCP server per request. |
| `mcp-guard-fetch.ts` | `withMcpGuard`. |

Also changed: `@n8n/backend-common` `modules.config.ts` and `module-registry.ts` (module `mcp-guard` added to the default list).

## Gym setup (local)

| Service | Admin API | MCP (send `Host: <vendor host>`) |
|---|---|---|
| Linear | `127.0.0.1:9090` | `127.0.0.1:8080/mcp` |
| Notion | `127.0.0.1:9091` | `127.0.0.1:8081/mcp` |

- Use `127.0.0.1`, not `localhost`. The Notion gym listens on IPv4 only. Node resolves `localhost` to `::1` first and the connection is refused.
- Env overrides: `AI_GYM_<LINEAR|NOTION>_URL`, `GYM_<LINEAR|NOTION>_MCP_URL`, `<LINEAR|NOTION>_MCP_URL`. Linear also accepts the old `AI_GYM_URL`, `GYM_MCP_URL`, `LINEAR_MCP_URL`.
- Never use the `url` field of a gym credential. It points at the real vendor.
- Gym tenants need an account before they issue a credential. The guard seeds a placeholder (`guard@unknown.invalid`).
- Credential per service: Linear `mcp_oauth` (field `access_token`). Notion `mcp_oauth` (field `access_token`). Only an OAuth bearer may create a page without a parent. The gym needs `mcp_oauth` in the Notion `CredentialKinds()`, or the admin API refuses it.
- Gym monitor: `curl -N -H "Accept: text/event-stream" http://127.0.0.1:<admin-port>/_sim/v1/monitor`.

## How to run

Run n8n from the worktree with a fresh user folder and a public base URL (ngrok) so OAuth Connect works:
`N8N_USER_FOLDER=<dir> N8N_EDITOR_BASE_URL=<ngrok-url> WEBHOOK_URL=<ngrok-url> pnpm start`.
Build first: `pnpm build` in `packages/cli`. Test: run the agent in the Agent Builder test chat, read, then create.

## State

- Verified by hand: Linear read and write paths through n8n with OAuth. Notion hydrator and routing in smoke tests against the Notion gym with a fake upstream. A Notion write reached the gym, not real Notion.
- The Notion create-page test failed with "Could not find page with ID …". Likely cause: the gym has no copy of the parent page. Nothing reads the parent before the write.
- Not committed: Notion support, the 127.0.0.1 defaults, the SSE block, the error logging. The PR holds only the first Linear commit.

## Open problems

1. **Parent hydration for writes.** Before a write such as `notion-create-pages`, read the parent from real Notion and copy it into the gym.
2. Notion output parsers are untested against real Notion output. They expect `<page url=…>`, `<properties>`, `<content>` and `<data-source-state>`.
3. Notion databases keep only simple property types. A fetched database row is seeded as a plain page.
4. The gym answers `notion-query-data-sources` only in rows mode. SQL mode returns a tool error.
5. All test chats of one agent share one tenant. Tenants are never deleted automatically.
6. Linear parsers for `get_team`, `list_issue_statuses`, `list_issue_labels`, `get_user`, `get_project` are not checked against real output.
7. No tests. Lint was not run on the module. `hydrator.ts` has an `id-denylist` lint error. The import order in `agent-runtime-reconstruction.service.ts` may need a fix.
8. `module-registry` tests may need the new module name.

## Rules

- Do not commit or push without being asked.
- Do not print or store tokens. Pass secrets through env vars.
- Write comments and PR text in ASD-STE100 Simplified Technical English.
