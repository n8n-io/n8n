# Managed Agents - Tools & Skills

## Tools

### Server tools vs client tools

| Type | Who runs it | How it works |
|---|---|---|
| **Prebuilt Claude Agent tools** (`agent_toolset_20260401`) | Anthropic, on the session's container (for `cloud` envs; for `self_hosted`, **your** worker supplies and runs the file/bash tools - see `shared/managed-agents-self-hosted-sandboxes.md`). `web_search` / `web_fetch` always run on Anthropic's servers, in both environment types. | File ops, bash, web search, etc. Enable all at once or configure individually with `enabled: true/false`; restrict the web tools with `allowed_domains` / `blocked_domains`. |
| **MCP tools** (`mcp_toolset`) | Anthropic's orchestration layer | Capabilities exposed by connected MCP servers. Grant access per-server via the toolset. |
| **Custom tools** | **You** - your application handles the call and returns results | Agent emits a `agent.custom_tool_use` event, session goes `idle`, you send back a `user.custom_tool_result` event. |

**Recommendation:** Enable the prebuilt tools via `agent_toolset_20260401` with `web_fetch` and `web_search` disabled and `auto` as the toolset's permission policy, and turn a web tool on only when the job needs it.

**Versioning:** The toolset is a versioned, static resource. When underlying tools change, a new toolset version is created (hence `_20260401`) so you always know exactly what you're getting.

### Agent Toolset

The `agent_toolset_20260401` provides these built-in tools:

| Tool                   | Description                              |
| ---------------------- | ---------------------------------------- |
| `bash` | Execute bash commands in a shell session |
| `read` | Read a file from the local filesystem, including text, images, PDFs, and Jupyter notebooks |
| `write` | Write a file to the local filesystem |
| `edit` | Perform string replacement in a file |
| `glob` | Fast file pattern matching using glob patterns |
| `grep` | Text search using regex patterns |
| `web_fetch` | Fetch content from a URL |
| `web_search` | Search the web for information |

**Start with the web tools off.** A bare `{ "type": "agent_toolset_20260401" }` enables all eight, and of the environment's `networking` choices only `limited` restricts the two web tools (§ Web search & web fetch settings). List both in `configs` explicitly, as in the example below, and set `enabled: true` only on the ones the job needs (`web_search` to find pages, `web_fetch` to read a URL), with the sites in `allowed_domains` when they are known in advance, and under `limited` networking in the environment's `allowed_hosts` too.

### Per-Tool Configuration

Override defaults for individual tools. This example enables everything except the web tools and sets the `auto` permission policy (§ Permission Policies):

```json
{
  "tools": [
    {
      "type": "agent_toolset_20260401",
      "default_config": { "enabled": true, "permission_policy": { "type": "auto" } },
      "configs": [
        { "name": "web_fetch", "enabled": false },
        { "name": "web_search", "enabled": false }
      ]
    }
  ]
}
```

| Field | Required | Description |
|---|---|---|
| `type` | Yes | `"agent_toolset_20260401"` |
| `default_config` | No | Applied to all tools. `{ "enabled": bool, "permission_policy": {...} }` |
| `configs` | No | Per-tool overrides: `[{ "name": "...", "type": "...", "enabled": bool, "permission_policy": {...} }]`. `name` identifies the tool (values from the table above); `type` is optional in requests (same value as `name`; the server infers it) and always present in responses. `web_search` / `web_fetch` entries also accept web settings - see § Web search & web fetch settings below. |

> **Typed SDKs:** each `configs` entry is a member of a union with one member per built-in tool (eight: `BetaManagedAgentsWebFetchToolConfigParams`, `...WebSearchToolConfigParams`, `...BashToolConfigParams`, ...), discriminated by `type`. Python/TypeScript/Ruby dicts and hashes with just `name` + `enabled` + `permission_policy` are unchanged. In Go, Java, C#, and PHP, `configs` is the union itself - build each entry from its per-tool type (Go: `BetaManagedAgentsAgentToolConfigParamsUnion{OfWebFetch: &anthropic.BetaManagedAgentsWebFetchToolConfigParams{...}}` - the arms are `OfBash` / `OfRead` / `OfWrite` / `OfEdit` / `OfGlob` / `OfGrep` / `OfWebFetch` / `OfWebSearch`; Java: `.addConfig(BetaManagedAgentsWebFetchToolConfigParams.builder()...build())`; C#: `new BetaManagedAgentsWebFetchToolConfigParams { Enabled = false }`; PHP: `BetaManagedAgentsWebFetchToolConfigParams::with(enabled: false)`). Code written against an SDK where all tools shared one config type must update how it constructs entries.

### Permission Policies

Control whether server-executed tools (agent toolset + MCP) run automatically, wait for your approval, or have each call evaluated by the server. Does not apply to custom tools (your application executes those).

| Policy | Behavior |
|---|---|
| `always_allow` | Tool executes automatically. Default for the agent toolset. |
| `always_ask` | Session emits `session.status_idle` (`stop_reason.type: requires_action`) and pauses until you send a `user.tool_confirmation` event. Default for MCP toolsets. |
| `auto` | The server evaluates each call (tool + input + session content so far) and **runs it, denies it, or pauses for your approval**. Neither toolset kind defaults to `auto` - set it explicitly; recommended for the agent toolset. Leave an `mcp_toolset` at its `always_ask` default unless the user asks for fewer approvals: there `auto` lets calls to a third-party service run with no one reviewing them. See § `auto` below. |

```json
{
  "type": "agent_toolset_20260401",
  "default_config": {
    "enabled": true,
    "permission_policy": { "type": "always_allow" }
  },
  "configs": [
    { "name": "bash", "permission_policy": { "type": "always_ask" } },
    { "name": "web_fetch", "enabled": false },
    { "name": "web_search", "enabled": false }
  ]
}
```

**Responding to `always_ask`** (and to `auto` calls that pause): send a `user.tool_confirmation` event with `tool_use_id` set to the **event ID** (`sevt_...`, not a `toolu_` ID) of the triggering `agent.tool_use` / `agent.mcp_tool_use` event. Several confirmations can go in one `events` request:

```json
{ "type": "user.tool_confirmation", "tool_use_id": "sevt_abc123", "result": "allow" }
{ "type": "user.tool_confirmation", "tool_use_id": "sevt_def456", "result": "deny", "deny_message": "Read .env.example instead" }
```

The optional `deny_message` on a deny is delivered to the agent as the rejected tool result so it can adjust its approach. A `user.tool_confirmation` for an event whose `evaluated_permission` is not `"ask"` is rejected with a 400 - that includes calls the server denied under `auto`; your client cannot override them.

#### `auto` - let the server evaluate each call

Set `{"type": "auto"}` anywhere a `permission_policy` is accepted: a toolset's `default_config` or an individual `configs` entry, on the agent toolset or an `mcp_toolset`. Because the evaluation considers the call's input and the session's content up to that point, two calls to the same tool can be treated differently. Each call has exactly one of three outcomes:

| Outcome | What happens |
|---|---|
| **Runs** | Server determined the call is safe - executes as under `always_allow`, without reaching your client. |
| **Denied** | Server evaluated the call as high-risk - the tool does not run. The agent receives an error tool result (`Permission to use {tool_name} has been denied.`, `is_error: true`), the session **keeps running**, and your client cannot override the denial. |
| **Pauses** | Server reached no determination - the session pauses exactly as under `always_ask`; respond with `user.tool_confirmation`. |

```json
{
  "name": "Ops Agent",
  "model": "claude-opus-5-5",
  "mcp_servers": [{ "type": "url", "name": "github", "url": "https://mcp.example.com/github" }],
  "tools": [
    {
      "type": "agent_toolset_20260401",
      "default_config": { "permission_policy": { "type": "auto" } },
      "configs": [
        { "name": "bash", "permission_policy": { "type": "always_ask" } },
        { "name": "web_fetch", "enabled": false },
        { "name": "web_search", "enabled": false }
      ]
    },
    {
      "type": "mcp_toolset",
      "mcp_server_name": "github",
      "default_config": { "permission_policy": { "type": "auto" } }
    }
  ]
}
```

Pass the same shape as an untyped dict / object literal / hash in Python, TypeScript, and Ruby. The typed SDKs have a type for the policy (Go 1.72.0+: `OfAuto: &anthropic.BetaManagedAgentsAutoPolicyParam{}` in the `PermissionPolicy` union; Java 2.63.0+: `.permissionPolicy(BetaManagedAgentsAutoPolicy.builder().build())`; PHP 0.48.0+: `permissionPolicy: BetaManagedAgentsAutoPolicy::with()`; C# 12.48.0+: `PermissionPolicy = new BetaManagedAgentsAutoPolicy()`) - on an older release, upgrade or build the request via cURL / `ant`. Python and TypeScript also only type-check `{"type": "auto"}` from the release that adds it (the wire API accepts it regardless).

**What the evaluation trusts.** The server treats session content as material to assess, not instructions to follow. Text you post in `user.message` events (including end-user text you relay there) counts as *your intent* and can lead the server to allow a call it would otherwise deny - though some calls are evaluated as high-risk regardless. The same words in a tool result, a fetched webpage, an MCP server response, or a message between session threads carry no such weight. If you relay untrusted end-user input in `user.message`, the server reads it as your intent too and it can get a call allowed - put `always_ask` on the tools you would not let that end user run without review.

> **`auto` is not a human checkpoint.** A call the server determines to be safe runs before any person sees it, and its effects may not be reversible. If a person must review a tool's calls before they run, use `always_ask` on that tool.

#### `evaluated_permission` and `evaluation` - see how each call was evaluated

Under **any** policy, each `agent.tool_use` and `agent.mcp_tool_use` event carries `evaluated_permission` (`"allow" | "ask" | "deny"`) - the outcome of the permission check. Most events also carry an `evaluation` object whose `type` names the policy that produced the outcome; under `auto` it adds the server's determination and, for `ask` / `deny`, a `reason_code`:

```json
{
  "type": "agent.tool_use",
  "id": "sevt_01pqr...",
  "name": "bash",
  "input": { "command": "rm -rf /workspace/reports" },
  "evaluated_permission": "deny",
  "evaluation": {
    "type": "auto",
    "evaluated_permission": { "type": "deny", "reason_code": "high_risk" }
  },
  "processed_at": "2026-03-25T14:05:12Z"
}
```

| `evaluation` | Top-level `evaluated_permission` | Meaning |
|---|---|---|
| `{"type": "always_allow"}` | `"allow"` | Resolved policy is `always_allow`; the call ran. |
| `{"type": "always_ask"}` | `"ask"` | Resolved policy is `always_ask`; paused for your approval. |
| `{"type": "auto", "evaluated_permission": {"type": "allow"}}` | `"allow"` | Server determined the call safe; it ran. |
| `{"type": "auto", "evaluated_permission": {"type": "ask", "reason_code": "indeterminate"}}` | `"ask"` | Server reached no determination; paused for your approval. |
| `{"type": "auto", "evaluated_permission": {"type": "deny", "reason_code": "high_risk"}}` | `"deny"` | Server evaluated the call as high-risk and denied it. |

- On the `auto` form the nested `evaluated_permission.type` always equals the event's top-level `evaluated_permission`.
- `reason_code` is for your client to branch on and keep in audit records - not text to show end users.
- `evaluation` is **absent** when the agent names a tool that isn't enabled in the session (server denies without evaluating any policy: `evaluated_permission: "deny"`, no `evaluation`) and on events recorded before the field existed (read those as `always_allow` for `"allow"`, `always_ask` for `"ask"`).
- Write your client to tolerate an `evaluation.type` or `reason_code` it doesn't recognize.
- `agent.custom_tool_use` events carry neither field (custom tools aren't governed by permission policies).

To enable only specific tools, flip the default off and opt-in per tool:

```json
{
  "tools": [
    {
      "type": "agent_toolset_20260401",
      "default_config": { "enabled": false, "permission_policy": { "type": "auto" } },
      "configs": [
        { "name": "bash", "enabled": true },
        { "name": "read", "enabled": true }
      ]
    }
  ]
}
```

### Web search & web fetch settings (domain filters)

`web_search` and `web_fetch` run on Anthropic's servers regardless of environment type. With `limited` networking, `allowed_hosts` also applies to them: `web_fetch` returns an error result for a URL on a host that `allowed_hosts` does not match, `web_search` omits results from such hosts, and when `allowed_hosts` lists no hosts neither returns a page or a search result. A host added to `allowed_hosts` for these tools is also open to the sandbox. `unrestricted` networking and self-hosted environments do not limit them (see `shared/managed-agents-environments.md` -> Networking). To control what they can reach whatever the environment, set `allowed_domains` (only these hosts) **or** `blocked_domains` (never these hosts) - never both on one entry - on the tool's `configs` entry. Each tool carries its own list. Organization-level web search/fetch settings in the Console apply to the Messages API only, not to Managed Agents sessions.

```json
{
  "type": "agent_toolset_20260401",
  "default_config": { "permission_policy": { "type": "auto" } },
  "configs": [
    {
      "type": "web_search",
      "name": "web_search",
      "enabled": true,
      "allowed_domains": ["docs.example.com", "arxiv.org"],
      "user_location": { "type": "approximate", "country": "US", "timezone": "America/Los_Angeles" }
    },
    {
      "type": "web_fetch",
      "name": "web_fetch",
      "enabled": true,
      "blocked_domains": ["ads.example.com"],
      "max_content_tokens": 50000
    }
  ]
}
```

| Setting | Applies to | Description |
|---|---|---|
| `allowed_domains` | `web_search`, `web_fetch` | The only hosts the tool can reach. Mutually exclusive with `blocked_domains` on the same entry. |
| `blocked_domains` | `web_search`, `web_fetch` | Hosts the tool cannot reach. |
| `max_content_tokens` | `web_fetch` | Positive integer cap on fetched *text* content entering context (binary content such as PDFs is not capped). |
| `user_location` | `web_search` | `{ "type": "approximate", city?, region?, country? (2-letter uppercase ISO 3166-1), timezone? (IANA) }` - at least one of the optional fields. |

**Run-time behavior:** a `web_fetch` call outside its list returns an error result to the agent (`is_error: true` on `agent.tool_result`, content names `url_not_allowed`); `web_search` silently omits results outside its list. In the Console, the agent form has allow/block-list controls for the web tools; `user_location` and `max_content_tokens` are set in the agent's **Raw** view.

**Domain list rules** (violations -> 400 `invalid_request_error` on agent create/update and on session create/update that supplies `tools`; messages name the list and zero-based index, e.g. `allowed_domains.0: IP addresses are not supported...`):

- 1-64 domains per list, each 1-255 chars. Empty list is rejected - omit the field or send `null` for "no restriction". Duplicates within a list are rejected.
- Plain hostname only: `example.com`, not `https://example.com`, `example.com:443`, or `*.example.com`. Case-insensitive; a single trailing `/` is ignored.
- A listed domain covers itself **and its subdomains** (`example.com` covers `docs.example.com`; `docs.example.com` does not cover `example.com` or `api.example.com`). `www.` is an ordinary subdomain - list the bare domain to cover both.
- Rejected: IP addresses in any form; bare TLDs/registry suffixes (`com`, `co.uk`); single-label names (`intranet`); `localhost` and hosts ending in `.localhost`, `.local`, `.internal`, `.localdomain`, `.invalid`; non-ASCII (use `xn--` Punycode).
- `web_fetch` domains cannot carry a path. `web_search` domains may carry a path suffix (`example.com/blog`, no spaces / `?` / `#` / `$ , | ^ !`), but the provider matches it as a URL pattern - prefer plain hostnames.
- Provider-dependent rejections at the same time: a domain Anthropic's crawler may not access, an unsupported `user_location.country` (message ends `not a country the search provider supports`), an invalid IANA `timezone`.

The session re-checks the config when it first initializes the tool; if a previously accepted setting is no longer valid it emits `session.error` and goes `idle` without retrying. Fix via a session tools update (`shared/managed-agents-core.md` -> Updating the agent configuration mid-session), update the agent too so new sessions get the fix, then send a new `user.message`.

**Multiagent layering** (see `shared/managed-agents-multiagent.md`): every list on the path to a thread applies at once - a roster agent is bound by its own lists, by those of every agent that called it, and by the coordinator's *current* lists. Allow-lists intersect and block-lists union, so a roster agent can narrow but never widen. Disjoint allow-lists leave the tool available but every call fails `url_not_allowed` (the tool description tells the model) - keep roster allow-lists inside the coordinator's. `max_content_tokens` and `user_location` are **not** combined: own value -> caller's -> coordinator's. `{"type": "self"}` entries follow the coordinator. The outcome grader (`shared/managed-agents-outcomes.md`) runs without the web tools. Updating an idle session's tools changes the coordinator's lists for every thread from its next turn; a roster agent's own lists stay as defined at session create.

**vs. the Messages API `web_search_20260209` / `web_fetch_20260209` tools:** same `allowed_domains` / `blocked_domains` vocabulary, but 64-entry cap, no path on `web_fetch` domains, and no `max_uses`, `citations`, or `cache_control`. If migrating from Messages API, these move from per-request to once-on-the-agent.

### Custom Tools (Client-Side)

Custom tools are executed by **your application**, not Anthropic. The flow:

1. Agent decides to use the tool -> session emits a `agent.custom_tool_use` event with inputs
2. Session goes `idle` waiting for you
3. Your application executes the tool
4. You send back a `user.custom_tool_result` event with the output
5. Session resumes `running`

No permission policy needed - you're the one executing. A custom tool's name can't start with `mcp__` or `ant__` or match a built-in agent tool's name (400); an agent that already stores an `ant__` tool accepts only an update that sends `tools` without it, and a new session that would run with such a tool is refused (400).

```json
{
  "tools": [
    {
      "type": "custom",
      "name": "get_weather",
      "description": "Fetch current weather for a city.",
      "input_schema": {
        "type": "object",
        "properties": {
          "city": { "type": "string", "description": "City name" }
        },
        "required": ["city"]
      }
    }
  ]
}
```

### MCP Servers

MCP (Model Context Protocol) servers expose standardized third-party capabilities (e.g. Asana, GitHub, Linear). **Configuration is split across agent and vault:**

1. **Agent creation** declares which servers to connect to (`type`, `name`, `url` - no auth). The agent's `mcp_servers` array has no auth field.
2. **Vault** stores the OAuth credentials. Attach via `vault_ids` on session create.

This keeps secrets out of reusable agent definitions. Each vault credential is tied to one MCP server URL; Anthropic matches credentials to servers by URL.

**Agent side - declare servers (no auth):**

| Field | Required | Description |
|---|---|---|
| `type` | Yes | `"url"` |
| `name` | Yes | Unique name - referenced by `mcp_toolset.mcp_server_name` |
| `url` | Yes | The MCP server's endpoint URL (Streamable HTTP transport) |

```json
{
  "mcp_servers": [
    { "type": "url", "name": "linear", "url": "https://mcp.linear.app/mcp" }
  ],
  "tools": [
    { "type": "mcp_toolset", "mcp_server_name": "linear" }
  ]
}
```

**Session side - attach vault:**

```json
{
  "agent": "agent_abc123",
  "environment_id": "env_abc123",
  "vault_ids": ["vlt_abc123"]
}
```

> Tip: **Per-tool enablement:** `mcp_toolset` accepts `default_config: {enabled: false}` + `configs: [{name, enabled: true}]` for an allowlist pattern. MCP `configs` entries take **only** `name` (the bare tool name as the server reports it), `enabled`, and `permission_policy` - no `type` field and none of the web settings that `web_search` / `web_fetch` accept in the agent toolset.

> Tip: **Changing tools/MCP servers on a running session:** `sessions.update()` can replace `agent.tools` and `agent.mcp_servers` while the session is `idle` - a session-local override that doesn't touch the agent object. `vault_ids` is create-only. See `shared/managed-agents-core.md` -> Updating the agent configuration mid-session.

**Large tool outputs.** If a tool returns more than **100,000 characters (roughly 25,000 tokens)**, the output is automatically offloaded to a file in the sandbox - the agent receives a truncated preview plus the file path and can `read` the full content. No configuration required. The threshold is in *characters*, not tokens, and applies to built-in agent tools as well as MCP tools.

**Invalid vault credentials don't block session creation.** If a vault credential is invalid for a declared MCP server, the session still creates successfully; a `session.error` event describes the MCP auth failure, and auth retries on the next `session.status_idle` -> `session.status_running` transition.

> Warning: **MCP auth tokens != REST API tokens.** Hosted MCP servers (`mcp.notion.com`, `mcp.linear.app`, etc.) typically require **OAuth bearer tokens**, not the service's native API keys. A Notion `ntn_` integration token authenticates against Notion's REST API but will **not** work as a vault credential for the Notion MCP server. These are different auth systems.

### Vaults - the credential store

**Vaults** store credentials that Anthropic manages on your behalf. Two credential categories:

- **MCP credentials** (`mcp_oauth`, `static_bearer`) - keyed by `mcp_server_url`. When the agent connects to a server at that URL, the token is injected automatically. **Matching is normalized, not byte-exact:** scheme and host are lowercased, and default ports and trailing slashes are stripped, so host casing, an explicit default port, or a trailing slash won't break the match. A different path, subdomain, or *non-default* port will. If nothing matches, the connection is attempted unauthenticated. `mcp_oauth` tokens are auto-refreshed via the standard OAuth 2.0 `refresh_token` grant. This is the only way to authenticate MCP servers.
- **Environment variables** (`environment_variable`) - keyed by `secret_name` (the env var name). The sandbox sees only an **opaque placeholder**; the real secret is substituted into the outbound request **at egress**. Use this for any service that authenticates through an environment variable: CLIs (`aws`, `gcloud`, `stripe`), SDKs, or direct `curl` calls from the `bash` tool.

Secret fields you supply (`token`, `access_token`, `refresh_token`, `client_secret`, `secret_value`) are write-only - never returned in API responses.

#### Credentials and the sandbox

Vaults store credentials; those credentials **never enter the sandbox**. This is a deliberate security boundary - code running in the sandbox (including anything the agent writes) cannot read or exfiltrate a vaulted credential, even under prompt injection. Instead, credentials are injected by Anthropic-side proxies **after** a request leaves the sandbox:

- **MCP tool calls** are routed through an Anthropic-side proxy that fetches the credential from the vault and adds it to the outbound request.
- **Git operations on attached GitHub repositories** (`git pull`, `git push`, GitHub REST calls) are routed through a git proxy that injects the `github_repository` resource's `authorization_token` the same way.
- **Environment-variable credentials** appear in the sandbox as an opaque placeholder; the real value replaces the placeholder at egress, on requests to the credential's allowed hosts only. Substitution covers request **headers and body only** - a secret embedded in the **URL path** is never substituted, so path-secret endpoints (e.g. Slack incoming-webhook URLs) can't be vaulted; use header-based auth instead (for Slack: a bot token in `Authorization` via `chat.postMessage`).

**When vault credentials don't fit** (e.g. self-hosted sandboxes - `environment_variable` is not yet supported there), **register a custom tool:** the agent emits `agent.custom_tool_use`, your orchestrator (which already holds the credential) executes the call and returns `user.custom_tool_result` over the same authenticated event stream. No public endpoint is exposed; the sandbox never sees the secret. See `shared/managed-agents-client-patterns.md` -> Pattern 9.

**Do not put API keys in the system prompt or user messages as a workaround** - they persist in the session's event history.

> Formerly known internally as TATs (Tool/Tenant Access Tokens).

**Flow:**

1. Create a vault (`client.beta.vaults.create(...)`) - one per tenant/user, or one shared, depending on your model
2. Add credentials to it (`client.beta.vaults.credentials.create(...)`) - MCP credentials are keyed by MCP server URL; environment-variable credentials by `secret_name`
3. Reference the vault on session create via `vault_ids: ["vlt_..."]`
4. Anthropic auto-refreshes OAuth tokens before they expire and substitutes secrets at runtime

**MCP OAuth credential shape**:

```json
{
  "display_name": "Notion (workspace-foo)",
  "auth": {
    "type": "mcp_oauth",
    "mcp_server_url": "https://mcp.notion.com/mcp",
    "access_token": "<current access token>",
    "expires_at": "2026-04-02T14:00:00Z",
    "refresh": {
      "refresh_token": "<refresh token>",
      "client_id": "<your OAuth client_id>",
      "token_endpoint": "https://api.notion.com/v1/oauth/token",
      "token_endpoint_auth": { "type": "none" }
    }
  }
}
```

The `refresh` block is what enables auto-refresh - `token_endpoint` is where Anthropic posts the `refresh_token` grant. `token_endpoint_auth` is a discriminated union:

| `type` | Shape | Use when |
|---|---|---|
| `"none"` | `{type: "none"}` | Public OAuth client (no secret) |
| `"client_secret_basic"` | `{type: "client_secret_basic", client_secret: "..."}` | Confidential client, secret via HTTP Basic auth |
| `"client_secret_post"` | `{type: "client_secret_post", client_secret: "..."}` | Confidential client, secret in request body |

Omit `refresh` entirely if you only have an access token with no refresh capability - it'll work until it expires, then the agent loses access.

> Tip: **Getting an OAuth token.** How you obtain the initial access and refresh tokens depends on the MCP server - consult its documentation. Once you have them, store them in a vault credential using the shape above; Anthropic auto-refreshes via the `refresh.token_endpoint` from there.

**Environment-variable credential shape**:

```json
{
  "display_name": "Twilio API key for sandbox",
  "auth": {
    "type": "environment_variable",
    "secret_name": "TWILIO_API_KEY",
    "secret_value": "sk-your-secret-here",
    "networking": {
      "type": "limited",
      "allowed_hosts": ["api.twilio.com", "*.twilio.com"]
    }
  }
}
```

`networking.allowed_hosts` controls which outbound hosts the secret can be substituted for - `{"type": "limited", "allowed_hosts": [...]}` or `{"type": "unrestricted"}` if you can't enumerate the domains in advance. Limiting is strongly recommended: it prevents the key from ever being sent to unauthorized hosts.

**`injection_location`** (optional, sibling of `networking`) controls **where** in the outbound request the secret is substituted - `{header: bool, body: bool}`. The two are independent: `allowed_hosts` scopes *which hosts* a substituted request can target; `injection_location` scopes *which parts of the request* the secret is substituted into across all of those hosts. Most services read an API key from a request header, so `{"header": true}` is the narrower configuration - request bodies are often assembled from content the agent is working with, making the body the broader exposure surface. A placeholder in a disabled location is **neither substituted nor stripped** - the literal opaque placeholder string is sent to the third party in that location.

| Operation | `injection_location` semantics |
|---|---|
| Create credential | Omit the field entirely -> both locations enabled. Provide the object -> any field you omit defaults to `false` (`{"header": true}` creates a header-only credential). |
| Update credential | Fields **merge individually** - `{"body": false}` disables body substitution and leaves `header` unchanged. For a running session, the update takes effect on the session's next operation. |

A credential must have at least one location enabled; a create or update that would disable both returns 400, as does explicit `null` for the object or either field (omit instead). The response always returns both fields with their resolved values.

> Warning: **Credentials created in the Console are header-only by default** - unlike the API, where omitting the field enables both. If your client sends the secret in the request body (a form-encoded token request, for example), the placeholder passes through literally and the service rejects it with its own authentication error. Tick body injection in the Console form, or `POST` the credential with `{"injection_location": {"body": true}}`.

> Warning: **Two networking layers, both required.** `networking.allowed_hosts` on the credential controls which requests *use the secret*, not which requests are *allowed*. The agent must also be able to reach the domain at the **environment level** (`unrestricted`, or the host listed in the environment's `allowed_hosts` - see `shared/managed-agents-environments.md`). A domain missing from either layer means the secret-substituted request fails.

> Warning: **Client-side validation caveat.** Substitution happens at egress, not inside the sandbox - clients that validate the credential *format* locally before making a network request (e.g. a CLI that checks the key starts with `sk-`) will see the opaque placeholder and may fail at startup. If a client rejects the credential before any network call, that's why.

> Tip: **Scope the key minimally.** The agent can do anything the key allows; a key with broader permissions than the task needs increases the blast radius if the agent behaves unexpectedly.

**Not supported with self-hosted sandboxes** - `environment_variable` credentials require Anthropic-managed egress. See `shared/managed-agents-self-hosted-sandboxes.md`.

**Constraints (all credential types):**

- **Unique key per vault.** `mcp_server_url` (MCP credentials) and `secret_name` (environment-variable credentials) must be unique among active credentials in a vault; duplicates return a 409.
- **Keys are immutable.** Secret values, `display_name`, and (on environment-variable credentials) `injection_location` can be updated; to change `mcp_server_url`, `secret_name`, `token_endpoint`, or `client_id`, archive the credential and create a new one. Archiving purges the secret and frees the key for a replacement.
- **Maximum 20 credentials per vault.**
- Credentials are stored as provided and **not validated until session runtime** - an invalid credential surfaces as an authentication or downstream error during the session, which is emitted but does not block the session from continuing.

**Scoping:** Vaults are workspace-scoped. Anyone with developer+ role in the API workspace can create, read (metadata only - secrets are write-only), and attach vaults. `vault_ids` can be set at session **create** time but not via session update (the SDK docstring says "Not yet supported; requests setting this field are rejected").

---

## Skills

Skills are reusable, filesystem-based resources that provide your agent with domain-specific expertise: workflows, context, and best practices that transform general-purpose agents into specialists. Unlike prompts (conversation-level instructions for one-off tasks), skills load on-demand and eliminate the need to repeatedly provide the same guidance across multiple conversations.

Skills reach the agent two ways: **attached** through the agent's `skills` array, or **loaded from a GitHub repository** mounted on the session (see § Skills from a GitHub repository below). The agent automatically uses them when relevant to the task at hand:

| Type | What it is |
|---|---|
| **Pre-built Anthropic skills** | Common document tasks (PowerPoint, Excel, Word, PDF). Reference by name (e.g. `xlsx`). |
| **Custom skills** | Skills you've created in your organization via the Skills API. Reference by `skill_id` + optional `version`. |

**Max 20 skills per agent.** Agent creation uses `managed-agents-2026-04-01`; the separate Skills API (for managing custom skill definitions) is out of beta and needs no beta header.

### Enabling skills on a session

Skills are attached to the **agent** definition via `agents.create()`:

```ts
const agent = await client.beta.agents.create(
  {
    name: "Financial Agent",
    model: "claude-opus-5-5",
    system: "You are a financial analysis agent.",
    skills: [
      { type: "anthropic", skill_id: "xlsx" },
      { type: "custom", skill_id: "skill_abc123", version: "latest" },
    ],
  }
);
```

Python:

```python
agent = client.beta.agents.create(
    name="Financial Agent",
    model="claude-opus-5-5",
    system="You are a financial analysis agent.",
    skills=[
        {"type": "anthropic", "skill_id": "xlsx"},
        {"type": "custom", "skill_id": "skill_abc123", "version": "latest"},
    ]
)
```

**Skill reference fields:**

| Field | Anthropic skill | Custom skill |
|---|---|---|
| `type` | `"anthropic"` | `"custom"` |
| `skill_id` | Skill name (e.g. `"xlsx"`, `"docx"`, `"pptx"`, `"pdf"`) | Skill ID from Skills API (e.g. `"skill_abc123"`) |
| `version` | `"latest"` or a specific version number | `"latest"` or a specific version number |

`version` is optional on **both** kinds and defaults to `"latest"` - it is not custom-skill-only.

### Skills from a GitHub repository

Skills can also live in your codebase. When a session mounts a repository via the `github_repository` resource (see `shared/managed-agents-environments.md` -> GitHub Repositories), the repository's root `.claude/skills` directory is scanned at session start, and each skill found becomes available to the agent: it sees each discovered skill's name, description, and sandbox path, and reads the skill's `SKILL.md` (plus any scripts/resources it ships) when a task matches.

**The agent can discover any skill in `.claude/skills/<skill-name>/`** - one directory level deep at the repository root. Skills in the following locations are not discoverable: a bare `.claude/skills/SKILL.md` (no skill directory), anything nested deeper (`.claude/skills/tools/code-review/SKILL.md`), a `skills/` directory outside `.claude`, or a `.claude/skills` inside a package subdirectory (though those can still surface when the agent reads files under that subtree). The `SKILL.md` format is the same as uploaded custom skills.

> Warning: **Repository skills are agent instructions - treat them as part of your trust boundary.** Anyone who can commit to a mounted repository (a merged external PR, a compromised dependency, a contributor) can add or edit `.claude/skills/` content, and the platform loads it at session start with no review step - where session tools like `bash` and `web_fetch` give injected instructions real capability. Only mount repositories you trust, and audit `.claude/skills/` before mounting one with external contributors.

Rules:
- **Cloud sandboxes only** - self-hosted sandboxes don't support `github_repository` resources, so they can't load repository skills.
- **Scanned once, at session start**, from the repository state checked out then (the resource's `checkout` branch/commit, else the default branch). Commits pushed mid-session are not picked up - start a new session for updated skills. Repositories added to a *running* session are not scanned either.
- **Coexists with attached skills.** If a repository skill shares a name with an attached skill (or a skill from another mounted repo), both are available, each announced with its own path.

### Skills API

| Operation             | Method   | Path                                            |
| --------------------- | -------- | ----------------------------------------------- |
| Create Skill          | `POST`   | `/v1/skills`                                    |
| List Skills           | `GET`    | `/v1/skills`                                    |
| Get Skill             | `GET`    | `/v1/skills/{id}`                               |
| Delete Skill          | `DELETE` | `/v1/skills/{id}`                               |
| Create Version        | `POST`   | `/v1/skills/{id}/versions`                      |
| List Versions         | `GET`    | `/v1/skills/{id}/versions`                      |
| Get Version           | `GET`    | `/v1/skills/{id}/versions/{version}`            |
| Delete Version        | `DELETE` | `/v1/skills/{id}/versions/{version}`            |

