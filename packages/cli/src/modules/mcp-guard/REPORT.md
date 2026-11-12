# mcp-guard module (POC)

Read-only guard for Linear MCP in the Agent Builder test chat.

## How a test-chat run reaches the guard
- `agent-runtime-reconstruction.service.ts` (`makeMcpClientFactory`): when `runType === 'test'`, `proxyFetch` is wrapped by `withLinearGuard(aiMcpFetch, memoryOwnerAgentId)` (`linear-guard-fetch.ts`).
- A request to `mcp.linear.app` with path `/mcp` is handled in-process by `McpGuardService.handleMcp` (web-standard Streamable HTTP transport, `Request` in, `Response` out). No HTTP route exists.
- Every other request (OAuth endpoints, other hosts) goes to the original fetch. Production runs and sub-agents are untouched.
- Run id = agent id. The gym tenant `guard-<agentId>` is created lazily on the first call.
- Read tools: real Linear (`mcp-upstream.ts`, own fetch) -> hydrate gym (`hydrator.ts`, via MCP read tools, see below) -> gym answers. Write and unknown tools: gym only.
- Env (defaults): `AI_GYM_URL` http://localhost:9090, `GYM_MCP_URL` http://localhost:8080/mcp, `LINEAR_MCP_URL` https://mcp.linear.app/mcp. No enable flag.

## Hydration via MCP (not GraphQL)
A Linear OAuth token is bound to the MCP resource. `api.linear.app/graphql` answers 401 for it. So the hydrator calls only real MCP read tools through the same upstream caller (same Bearer token). No `api.linear.app` call exists.
- Per issue uuid found in the read result: `get_issue`, then `get_team`, `list_issue_statuses`, `get_user` (assignee, creator, comment authors), `list_issue_labels`, `get_project`, `list_comments`.
- Optional steps never throw. Missing ids become a sha1-based uuid of the name. A user without email gets `<uuid>@unknown.invalid`. The team key falls back to the identifier prefix. Only a failed `get_issue` throws.
- A per-run set of seeded refs prevents seeding twice.
- Shapes of `get_team`, `list_issue_statuses`, `list_issue_labels`, `get_user`, `get_project` are not verified (the test API key was dead). The parser accepts an array, or an object holding one array.

## See gym traffic
`curl -N -H "Accept: text/event-stream" http://localhost:9090/_sim/v1/monitor`

## Known gaps
- Not run end to end. Needs the gym up on 9090 and 8080.
- Tenants are never deleted (no route, no cleanup hook).
- Stateless transport: no sessions, no listen stream.
- Standalone gaps in packages/@n8n/mcp-guard/REPORT.md still apply.
- `module-registry` tests that list default modules may need an update.
