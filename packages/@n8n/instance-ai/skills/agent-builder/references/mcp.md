
## Purpose

Use this to manage external MCP server connections in the target agent config.
MCP servers expose external tool catalogs to the target agent over HTTP. They
live on the top-level `mcpServers` array, and each entry maps 1:1 to a
connected MCP server.

## Use when:

- The user asks for an external integration and you need to discover/connect an MCP server for it.
- The user asks to edit the target agent's MCP servers.
- The users wants to add a custom MCP server.

## Workflow

### Discovery and setup

Follow these steps in order when adding an MCP server:

1. Search: call `agent_builder` (`action: "search_mcp_servers"`) with queries
   matching the requested integration (for example `["github"]`, `["slack"]`).
   The result includes `name`, `url`, `transport`, `authentication`,
   `credentialType`, `tools`, and optional `metadata`.
2. Credential: for registry results, resolve a credential of the returned
   `credentialType` (`credentials({ action: "list" })` + `ask-user`; see SKILL.md
   "Asking the user, credentials, and the LLM"). Never invent credential IDs.
3. Verify: call `agent_builder` (`action: "verify_mcp_server"`) with `name`,
   `url`, `transport`, `authentication`, and (if applicable) `credential`.
4. Write config: follow the config editing flow in SKILL.md — `read_config`,
   add the entry to `mcpServers[]` in the config file (initialize the array if
   missing), then `agent_builder` (`action: "build_agent"`).

If `search_mcp_servers` returns no matches and the user provides a custom
server URL, skip the search result mapping and continue with manual
transport/authentication plus credential selection.

Full schema reference:

  name: string [1..64 chars, pattern: ^[a-zA-Z0-9_-]+$] (required) — Unique server name, also used as the SDK tool-name prefix (e.g. github -> github_create_issue)
  description?: string [max 512 chars] — Human-readable server description
  url: string [min 1 chars] (required) — MCP server endpoint URL
  transport?: "sse" | "streamableHttp" (default: "streamableHttp") — Transport protocol
  authentication?: "none" | "bearerAuth" | "headerAuth" | "multipleHeadersAuth" | "mcpOAuth2Api" | string [pattern: McpOAuth2Api$] (default: "none") — Auth method. Named variants or any string ending in McpOAuth2Api for registry credential types
  credential?: string — Credential id (from the credentials tool, action "list"). Required when authentication is not "none"
  metadata?: object
    nodeTypeName?: string — Source node type for registry servers (e.g. @n8n/mcp-registry.github). Enables correct UI form
  toolFilter?: one of <discriminated by "mode"> — Restricts which tools are surfaced. Tools matched by original un-prefixed name
    | mode = "allow": { mode: "allow", tools?: array of <string [min 1 chars]> }
    | mode = "exclude": { mode: "exclude", tools?: array of <string [min 1 chars]> }
  approval?: one of <discriminated by "mode"> — Human-in-the-loop approval. Absent = no approval required
    | mode = "global": { mode: "global" }
    | mode = "selected": { mode: "selected", tools: array of <string [min 1 chars]> }
  connectionTimeoutMs?: integer [1..120000] — Connection timeout in milliseconds

### Credential flow

Resolve credentials with `credentials({ action: "list" })` + `ask-user` (see
SKILL.md "Asking the user, credentials, and the LLM"), using the credential type
for the auth mode:

- `bearerAuth` → `httpBearerAuth`
- `headerAuth` → `httpHeaderAuth`
- `multipleHeadersAuth` → `httpMultipleHeadersAuth`
- `mcpOAuth2Api` → `mcpOAuth2Api`

Never invent credential IDs. If the user declines, omit the server entirely
rather than persisting a stub.

### Testing the connection

Before writing to config, call `agent_builder` (`action: "verify_mcp_server"`)
with server `name`, `url`, `transport`, and (if applicable) the credential id
resolved above.

- Success returns `{ ok: true, tools: [{ name, description }] }`.
- Use the returned tool list to populate `toolFilter.tools` or
  `approval.tools` so the user does not need to type tool names manually.
- Failure returns `{ ok: false, error: "..." }`.
- If verification fails, explain the error and ask the user to check the URL
  or credentials before proceeding.

### Selecting credentials

When using a registry-backed server, always use the `credentialType` returned
by `search_mcp_servers`.

For custom MCP servers, if credential type is unknown, ask the user which
credential type to use (OAuth2, Bearer Token, Header Auth, Multiple Headers
Auth, or None) via the `ask-user` tool. Then resolve a credential
(`credentials({ action: "list" })` + `ask-user`) of the matching type:

- `bearerAuth` -> `httpBearerAuth`
- `headerAuth` -> `httpHeaderAuth`
- `multipleHeadersAuth` -> `httpMultipleHeadersAuth`
- `mcpOAuth2Api` -> `mcpOAuth2Api`

### Config edit pattern

In the config file, initialize `"mcpServers": []` if the array is missing,
then append each server entry to it. Persist with `build_agent`.

## Gotchas

- Server `name` must be unique across `mcpServers` within an agent.
- Never invent credential IDs. If the user declines, omit the server entirely.
- Never fabricate `metadata.nodeTypeName`.
- When `search_mcp_servers` returns `metadata.nodeTypeName`, include
  `metadata: { nodeTypeName: <result.nodeTypeName> }` in the entry so the UI
  can render the correct server form.
