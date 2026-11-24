# Managed Agents - cURL / Raw HTTP

Use these examples when the user needs raw HTTP requests or is working without an SDK.

## Setup

```bash
export ANTHROPIC_API_KEY="your-api-key"

# Common headers
HEADERS=(
  -H "Content-Type: application/json"
  -H "x-api-key: $ANTHROPIC_API_KEY"
  -H "anthropic-version: 2023-06-01"
  -H "anthropic-beta: managed-agents-2026-04-01"
)
```

---

## Create an Environment

```bash
curl -X POST https://api.anthropic.com/v1/environments \
  "${HEADERS[@]}" \
  -d '{
    "name": "my-dev-env",
    "config": {
      "type": "cloud",
      "networking": { "type": "limited", "allow_package_managers": true, "allow_mcp_servers": true }
    }
  }'
```

### Allowing specific hosts

```bash
curl -X POST https://api.anthropic.com/v1/environments \
  "${HEADERS[@]}" \
  -d '{
    "name": "restricted-env",
    "config": {
      "type": "cloud",
      "networking": {
        "type": "limited",
        "allow_package_managers": true,
        "allow_mcp_servers": true,
        "allowed_hosts": ["api.example.com"]
      }
    }
  }'
```

---

## Create an Agent (required first step)

> Warning: **There is no inline agent config.** Under `managed-agents-2026-04-01`, `model`/`system`/`tools` are top-level fields on `POST /v1/agents`, not on the session. Always create the agent first - the session only takes `"agent": {"type": "agent", "id": "..."}`.

### Minimal

The examples on this page turn both web tools off. Set `enabled` to true on `web_fetch` / `web_search` only when the job as described needs the web (a general-purpose or open-ended job stays off; tell the user how to switch it on) - see `shared/managed-agents-tools.md` § Agent Toolset. They also set the `auto` permission policy, under which a call can pause for your approval - see Confirm a Paused Tool Call. When nobody is watching the run, answer `deny`; never answer `allow` to every paused call.

```bash
# 1. Create the agent
curl -X POST https://api.anthropic.com/v1/agents \
  "${HEADERS[@]}" \
  -d '{
    "name": "Coding Assistant",
    "model": "claude-opus-5-5",
    "tools": [
      {
        "type": "agent_toolset_20260401",
        "default_config": { "permission_policy": { "type": "auto" } },
        "configs": [
          { "name": "web_fetch", "enabled": false },
          { "name": "web_search", "enabled": false }
        ]
      }
    ]
  }'
# -> { "id": "agent_abc123", ... }

# 2. Start a session
curl -X POST https://api.anthropic.com/v1/sessions \
  "${HEADERS[@]}" \
  -d '{
    "agent": { "type": "agent", "id": "agent_abc123", "version": 1 },
    "environment_id": "env_abc123"
  }'
# -> { "id": "sesn_abc123", ... }
# Trace: https://platform.claude.com/workspaces/default/sessions/sesn_abc123  (swap 'default' for your workspace ID if the API key is not in the Default workspace)
```

### With system prompt, custom tools, and GitHub repo

```bash
# 1. Create the agent
curl -X POST https://api.anthropic.com/v1/agents \
  "${HEADERS[@]}" \
  -d '{
    "name": "Code Reviewer",
    "model": "claude-opus-5-5",
    "system": "You are a senior code reviewer. Be thorough and constructive.",
    "tools": [
      {
        "type": "agent_toolset_20260401",
        "default_config": { "permission_policy": { "type": "auto" } },
        "configs": [
          { "name": "web_fetch", "enabled": false },
          { "name": "web_search", "enabled": false }
        ]
      },
      {
        "type": "custom",
        "name": "run_linter",
        "description": "Run the project linter on a file",
        "input_schema": {
          "type": "object",
          "properties": {
            "file_path": { "type": "string", "description": "Path to lint" }
          },
          "required": ["file_path"]
        }
      }
    ]
  }'

# 2. Start a session with the repo mounted
curl -X POST https://api.anthropic.com/v1/sessions \
  "${HEADERS[@]}" \
  -d '{
    "agent": { "type": "agent", "id": "agent_abc123", "version": 1 },
    "environment_id": "env_abc123",
    "title": "Code review session",
    "resources": [
      {
        "type": "github_repository",
        "url": "https://github.com/owner/repo",
        "mount_path": "/workspace/repo",
        "authorization_token": "ghp_...",
        "checkout": { "type": "branch", "name": "feature-branch" }
      }
    ]
  }'
```

### With a session budget

```bash
# Create a session with a hard $25.00 spend cap (list-priced; USD only; create-only).
# amount is in minor units (cents) as an integer string: "2500" = $25.00
curl -X POST https://api.anthropic.com/v1/sessions \
  "${HEADERS[@]}" \
  -d '{
    "agent": { "type": "agent", "id": "agent_abc123" },
    "environment_id": "env_abc123",
    "budget": {
      "type": "limit",
      "max_list_cost": { "amount": "2500", "currency": "USD" }
    }
  }'

# Change the cap - higher or lower, but it must exceed the consumed list cost.
# An accepted update resumes work paused at budget_reached
curl -X POST https://api.anthropic.com/v1/sessions/$SESSION_ID \
  "${HEADERS[@]}" \
  -d '{ "budget": { "type": "limit", "max_list_cost": { "amount": "4000", "currency": "USD" } } }'

# Remove the cap entirely - one-way; a removed budget can never be re-added
curl -X POST https://api.anthropic.com/v1/sessions/$SESSION_ID \
  "${HEADERS[@]}" \
  -d '{ "budget": null }'
```

See `shared/managed-agents-core.md` § Session budgets for list-cost composition, the settle-event allowlist at the cap, and multiagent semantics.

---

## Send a User Message

```bash
curl -X POST https://api.anthropic.com/v1/sessions/$SESSION_ID/events \
  "${HEADERS[@]}" \
  -d '{
    "events": [
      {
        "type": "user.message",
        "content": [{ "type": "text", "text": "Review the auth module for security issues" }]
      }
    ]
  }'
```

---

## Stream Events (SSE)

```bash
curl -N https://api.anthropic.com/v1/sessions/$SESSION_ID/events/stream \
  "${HEADERS[@]}"
```

Response format:

```
event: session.status_running
data: {"type":"session.status_running","id":"sevt_...","processed_at":"..."}

event: agent.message
data: {"type":"agent.message","id":"sevt_...","content":[{"type":"text","text":"I'll review..."}],"processed_at":"..."}

event: session.status_idle
data: {"type":"session.status_idle","id":"sevt_...","stop_reason":{"type":"end_turn"},"processed_at":"..."}
```

On `requires_action` the agent is not finished: the session is waiting on you - see Confirm a Paused Tool Call and Provide Custom Tool Result below.

---

## Poll Events

```bash
# Get all events
curl https://api.anthropic.com/v1/sessions/$SESSION_ID/events \
  "${HEADERS[@]}"

# Paginated - get next page of events
curl "https://api.anthropic.com/v1/sessions/$SESSION_ID/events?page=page_abc123" \
  "${HEADERS[@]}"
```

---

## Provide Custom Tool Result

When the agent calls a custom tool, send the result back:

```bash
curl -X POST https://api.anthropic.com/v1/sessions/$SESSION_ID/events \
  "${HEADERS[@]}" \
  -d '{
    "events": [
      {
        "type": "user.custom_tool_result",
        "custom_tool_use_id": "sevt_abc123",
        "content": [{ "type": "text", "text": "No linting errors found." }]
      }
    ]
  }'
```

---

## Confirm a Paused Tool Call

An `agent.tool_use` / `agent.mcp_tool_use` event with `"evaluated_permission": "ask"` (`always_ask`, or `auto` with no determination) waits until you answer it. Send that event's `id` as `tool_use_id`, with `result` `allow` or `deny`. Ask a person or apply your own rule; deny when unattended:

```bash
curl -X POST https://api.anthropic.com/v1/sessions/$SESSION_ID/events \
  "${HEADERS[@]}" \
  -d '{
    "events": [
      {
        "type": "user.tool_confirmation",
        "tool_use_id": "sevt_abc123",
        "result": "deny"
      }
    ]
  }'
```

---

## Interrupt a Running Session

```bash
curl -X POST https://api.anthropic.com/v1/sessions/$SESSION_ID/events \
  "${HEADERS[@]}" \
  -d '{
    "events": [
      {
        "type": "user.interrupt"
      }
    ]
  }'
```

---

## Get Session Details

```bash
curl https://api.anthropic.com/v1/sessions/$SESSION_ID \
  "${HEADERS[@]}"
```

---

## List Sessions

```bash
curl https://api.anthropic.com/v1/sessions \
  "${HEADERS[@]}"
```

---

## Delete a Session

```bash
curl -X DELETE https://api.anthropic.com/v1/sessions/$SESSION_ID \
  "${HEADERS[@]}"
```

---

## Upload a File

```bash
curl -X POST https://api.anthropic.com/v1/files \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -F "file=@path/to/file.txt"
```

---

## List and Download Session Files

List files the agent wrote to `/mnt/session/outputs/` during a session, then download them.

```bash
# List files associated with a session
curl "https://api.anthropic.com/v1/files?scope_id=$SESSION_ID" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01"

# Download a specific file
curl "https://api.anthropic.com/v1/files/$FILE_ID/content" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -o downloaded_file.txt
```

---

## List Agents

```bash
curl https://api.anthropic.com/v1/agents \
  "${HEADERS[@]}"
```

---

## MCP Server Integration

```bash
# 1. Agent declares MCP server (no auth here - auth goes in a vault)
curl -X POST https://api.anthropic.com/v1/agents \
  "${HEADERS[@]}" \
  -d '{
    "name": "MCP Agent",
    "model": "claude-opus-5-5",
    "mcp_servers": [
      { "type": "url", "name": "my-tools", "url": "https://my-mcp-server.example.com/sse" }
    ],
    "tools": [
      {
        "type": "agent_toolset_20260401",
        "default_config": { "permission_policy": { "type": "auto" } },
        "configs": [
          { "name": "web_fetch", "enabled": false },
          { "name": "web_search", "enabled": false }
        ]
      },
      { "type": "mcp_toolset", "mcp_server_name": "my-tools" }
    ]
  }'

# 2. Session attaches vault containing credentials for that MCP server URL
curl -X POST https://api.anthropic.com/v1/sessions \
  "${HEADERS[@]}" \
  -d '{
    "agent": "agent_abc123",
    "environment_id": "env_abc123",
    "vault_ids": ["vlt_abc123"]
  }'
```

See `shared/managed-agents-tools.md` §Vaults for creating vaults and adding credentials.

---

## Tool Configuration

```bash
curl -X POST https://api.anthropic.com/v1/agents \
  "${HEADERS[@]}" \
  -d '{
    "name": "Restricted Agent",
    "model": "claude-opus-5-5",
    "tools": [
      {
        "type": "agent_toolset_20260401",
        "default_config": { "enabled": true, "permission_policy": { "type": "auto" } },
        "configs": [
          { "name": "bash", "enabled": false },
          { "name": "web_fetch", "enabled": false },
          { "name": "web_search", "enabled": false }
        ]
      }
    ]
  }'
```
