# Managed Agents - Environments & Resources

## Environments

Creating a session requires an `environment_id`. Environments are **reusable configuration templates** for spinning up containers in Anthropic's infrastructure - you might create different environments for different use cases (e.g. data visualization vs web development, with different package sets). Anthropic handles scaling, container lifecycle, and work orchestration.

**Environment names must be unique.** Creating an environment with an existing name returns 409.

### Networking

| Network Policy   | Description                                                   |
| ---------------- | ------------------------------------------------------------- |
| `unrestricted`   | Full egress (except legal blocklist)                          |
| `limited`        | Deny-by-default; opt in via `allowed_hosts` / `allow_package_managers` / `allow_mcp_servers` |

```json
{
  "networking": {
    "type": "limited",
    "allow_package_managers": true,
    "allow_mcp_servers": true,
    "allowed_hosts": ["api.example.com"]
  }
}
```

All three `limited` fields are optional. `allow_package_managers` (default `false`) permits PyPI/npm/etc.; `allow_mcp_servers` (default `false`) permits the agent's configured MCP server endpoints without listing them in `allowed_hosts`.

**MCP caveat:** Under `limited` networking, either set `allow_mcp_servers: true` or add each MCP server domain to `allowed_hosts`. Otherwise creating a session for an agent that declares those servers fails with a 400 naming the blocked hosts.

**Packages caveat:** Under `limited` networking, `packages` requires `allow_package_managers: true`; otherwise the request fails with a 400. Listing the registry in `allowed_hosts` is not enough.

**With `limited` networking, `allowed_hosts` also applies to `web_search` / `web_fetch`**, which run on Anthropic's servers. A `web_fetch` call for a URL on a host that `allowed_hosts` does not match returns an error result to the agent, and `web_search` omits results from hosts that it does not match; `allow_package_managers` and `allow_mcp_servers` add no hosts for these tools. When `allowed_hosts` lists no hosts, no `web_fetch` or `web_search` call returns a page or a search result. A host that you add to `allowed_hosts` for these tools is also open to the sandbox. `unrestricted` networking and self-hosted environments do not limit these tools. Turn them off (`enabled: false`) unless the job needs the web; when it does, list the sites in `allowed_hosts` and also in the tool's `allowed_domains` (or set `blocked_domains` to shut some out). `enabled` and the two domain lists go on the tool's `configs` entry in the agent toolset - see `shared/managed-agents-tools.md` § Agent Toolset and § Web search & web fetch settings.

### Creating an environment

The SDK adds `managed-agents-2026-04-01` automatically. TypeScript:

```ts
const env = await client.beta.environments.create({
  name: "my_env",
  config: {
    type: "cloud",
    networking: { type: "limited", allow_package_managers: true, allow_mcp_servers: true },
  },
});
```

### Self-hosted sandboxes

To run tool execution in **your own infrastructure** instead of Anthropic's, set `config: {type: "self_hosted"}` - the agent loop stays on Anthropic's side, but `bash` / file ops / code execute in a container you control via an outbound-polling worker. The `networking` block does not apply (you control egress). Resource mounting (`file`, `github_repository`) and memory stores behave differently - see `shared/managed-agents-self-hosted-sandboxes.md` for the worker, credentials, and cloud-vs-self-hosted comparison.

### Environment CRUD

| Operation        | Method   | Path                                       | Notes |
| ---------------- | -------- | ------------------------------------------ | ----- |
| Create           | `POST`   | `/v1/environments`                         | |
| List             | `GET`    | `/v1/environments`                         | Paginated (`limit`, `after_id`, `before_id`) |
| Get              | `GET`    | `/v1/environments/{id}`                    | |
| Update           | `POST`   | `/v1/environments/{id}`                    | Changes apply only to **new** containers; existing sessions keep their original config |
| Delete           | `DELETE` | `/v1/environments/{id}`                    | Returns 204. |
| Archive          | `POST`   | `/v1/environments/{id}/archive`            | Makes it **read-only**; existing sessions continue, new sessions cannot reference it. No unarchive - terminal state. |

---

## Resources

Attach files, GitHub repositories, and memory stores to a session. Resources are resolved during session creation, so a bad `file_id` or an unreachable repo surfaces on the create call rather than mid-run. Creating a session does **not** by itself start work or provision the sandbox - without `initial_events` the session is only registered, and the sandbox comes up when the session first needs it (see `shared/managed-agents-core.md` -> Seeding a session with `initial_events`). Max **999 file resources** per session. Multiple GitHub repositories per session are supported. For `type: "memory_store"` resources (persistent cross-session memory - max 8 per session), see `shared/managed-agents-memory.md`.

### File Uploads (input - host -> agent)

Upload a file first via the Files API, then reference it by `file_id` (and optionally a `mount_path`):

```ts
// 1. Upload
const file = await client.beta.files.upload({
  file: fs.createReadStream("data.csv"),
});

// 2. Attach as a session resource
const session = await client.beta.sessions.create({
  agent: agent.id,
  environment_id: envId,
  resources: [
    { type: "file", file_id: file.id, mount_path: "/data.csv" }
  ],
});
```

**`mount_path` is optional**; when set, it should be absolute and is rooted under the session's uploads directory: `/data.csv` lands at `/mnt/session/uploads/data.csv`. Without it, the file lands at `/mnt/session/uploads/<file_id>`. A prompt that points the agent at the file should use the full `/mnt/session/uploads/...` path. Parent directories are created automatically. Agent working directory defaults to `/workspace`. Files are mounted read-only - the agent writes modified versions to new paths.

### Session outputs (output - agent -> host)

The agent can write files to `/mnt/session/outputs/` during a session. These are automatically captured by the Files API and can be listed and downloaded afterwards:

```ts
// After the turn completes, list output files scoped to this session:
for await (const f of client.beta.files.list({
  scope_id: session.id,
  betas: ["managed-agents-2026-04-01"],
})) {
  console.log(f.filename, f.size_bytes);
  const resp = await client.beta.files.download(f.id);
  const text = await resp.text();
}
```

**Requirements:**
- The `write` tool (or `bash`) must be enabled for the agent to create output files.
- Session-scoped `files.list` / `files.download` captures outputs written to `/mnt/session/outputs/`.
- The filter parameter is **`scope_id`** (REST query param `?scope_id=<session_id>`). Filtering by `scope_id` requires the `managed-agents-2026-04-01` header, which `client.beta.files` does not add, so pass `betas: ["managed-agents-2026-04-01"]` explicitly (on raw HTTP, send `anthropic-beta: managed-agents-2026-04-01`); the list call uses the `beta` files namespace only to pass that header, and upload and download also work on `client.files`. Requires `@anthropic-ai/sdk` >= 0.88.0 / `anthropic` (Python) >= 0.92.0 - older versions don't type `scope_id`. In the `ant` CLI, use `ant beta:files list --scope-id <session_id> --beta managed-agents-2026-04-01`.
- Pass the session ID returned by `sessions.create()` verbatim (e.g. `sesn_011CZx...`) - the API validates the prefix.
- There's a brief indexing lag (~1-3s) between `session.status_idle` and output files appearing in `files.list`. Retry once or twice if empty.

> **Fallback when `scope_id` filtering is unavailable** (older SDK, or endpoint returns an error): send a follow-up `user.message` asking the agent to `read` each file under `/mnt/session/outputs/` and return the contents. The agent streams the file bodies back as `agent.message` text. This works for text files only and costs output tokens - use it to unblock, not as the primary path.

This gives you a bidirectional file bridge: upload reference data in, download agent artifacts out.

### GitHub Repositories

Clones a GitHub repository into the session container during initialization, before the agent begins execution. The agent can read, edit, commit, and push via `bash` (`git`). Multiple repositories per session are supported - add one `resources` entry per repo. Repositories are cached, so future sessions that use the same repository start faster.

Mounting a repository also loads any skills stored in its root `.claude/skills` directory - discovered once per session, from the repository state checked out at session start (cloud sandboxes only). See `shared/managed-agents-tools.md` -> Skills from a GitHub repository.

Repositories are attached for the lifetime of the session - to change which repositories are mounted, create a new session. You **can** rotate a repository's `authorization_token` on a running session via `client.beta.sessions.resources.update(resource_id, {session_id, authorization_token})`; the resource `id` is returned at session creation and by `resources.list()`.

**Fields:**

| Field | Required | Notes |
|---|---|---|
| `type` | Yes | `"github_repository"` |
| `url` | Yes | The GitHub repository URL |
| `authorization_token` | Yes | GitHub Personal Access Token with repository access. **Never echoed in API responses.** |
| `mount_path` | No | Path where the repository will be cloned. Defaults to `/workspace/<repo-name>`. |
| `checkout` | No | `{type: "branch", name: "..."}` or `{type: "commit", sha: "..."}`. Defaults to the repo's default branch. |

**Token permission levels** (fine-grained PATs):
- `Contents: Read` - clone only
- `Contents: Read and write` - push changes and create pull requests

**How auth works:** `authorization_token` is never placed inside the container. `git pull` / `git push` and GitHub REST calls against the attached repository are routed through an Anthropic-side git proxy that injects the token after the request leaves the sandbox. Code running in the container - including anything the agent writes - cannot read or exfiltrate it.

> Important: **To generate pull requests** you also need GitHub **MCP server** access - the `github_repository` resource gives filesystem + git access only. See `shared/managed-agents-tools.md` -> MCP Servers. The PR workflow is: edit files in the mounted repo -> push branch via `bash` (authenticated via the git proxy using `authorization_token`) -> create PR via the MCP `create_pull_request` tool (authenticated via the vault).

**TypeScript:**

```ts
// 1. Create the agent - declare GitHub MCP (no auth here)
const agent = await client.beta.agents.create(
  {
    name: 'GitHub Agent',
    model: 'claude-opus-5-5',
    mcp_servers: [
      { type: 'url', name: 'github', url: 'https://api.githubcopilot.com/mcp/' },
    ],
    tools: [
      {
        type: 'agent_toolset_20260401',
        default_config: { enabled: true, permission_policy: { type: 'auto' } },
        configs: [
          { name: 'web_fetch', enabled: false },
          { name: 'web_search', enabled: false },
        ],
      },
      { type: 'mcp_toolset', mcp_server_name: 'github' },
    ],
  },
);

// 2. Start a session - attach vault for MCP auth + mount the repo
const session = await client.beta.sessions.create({
  agent: agent.id,
  environment_id: envId,
  vault_ids: [vaultId],  // vault contains the GitHub MCP OAuth credential
  resources: [
    {
      type: 'github_repository',
      url: 'https://github.com/owner/repo',
      authorization_token: process.env.GITHUB_TOKEN,  // repo clone token (!= MCP auth)
      checkout: { type: 'branch', name: 'main' },
    },
  ],
});
```

**Python:**

```python
import os

agent = client.beta.agents.create(
    name="GitHub Agent",
    model="claude-opus-5-5",
    mcp_servers=[{
        "type": "url",
        "name": "github",
        "url": "https://api.githubcopilot.com/mcp/",
    }],
    tools=[
        {
            "type": "agent_toolset_20260401",
            "default_config": {"enabled": True, "permission_policy": {"type": "auto"}},
            "configs": [
                {"name": "web_fetch", "enabled": False},
                {"name": "web_search", "enabled": False},
            ],
        },
        {"type": "mcp_toolset", "mcp_server_name": "github"},
    ],
)

session = client.beta.sessions.create(
    agent=agent.id,
    environment_id=env_id,
    vault_ids=[vault_id],  # vault contains the GitHub MCP OAuth credential
    resources=[{
        "type": "github_repository",
        "url": "https://github.com/owner/repo",
        "authorization_token": os.environ["GITHUB_TOKEN"],  # repo clone token (!= MCP auth)
        "checkout": {"type": "branch", "name": "main"},
    }],
)
```

---

## Files API

Upload and manage files for use as session resources, and download files the agent wrote to `/mnt/session/outputs/`.

| Operation        | Method   | Path                                  | SDK |
| ---------------- | -------- | ------------------------------------- | --- |
| Upload           | `POST`   | `/v1/files`                           | `client.beta.files.upload({ file })` |
| List             | `GET`    | `/v1/files?scope_id=...`              | `client.beta.files.list({ scope_id, betas: ["managed-agents-2026-04-01"] })` |
| Get Metadata     | `GET`    | `/v1/files/{id}`                      | `client.beta.files.retrieveMetadata(id)` |
| Download         | `GET`    | `/v1/files/{id}/content`              | `client.beta.files.download(id)` -> `Response` |
| Delete           | `DELETE` | `/v1/files/{id}`                      | `client.beta.files.delete(id)` |

The `scope_id` filter on List scopes the results to files written to `/mnt/session/outputs/` by that session. Without the filter, you get all files uploaded to your account.
