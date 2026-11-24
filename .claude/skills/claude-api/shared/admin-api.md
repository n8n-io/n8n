# Admin API (Organization Management)

Read this file when the user wants to manage their Anthropic organization programmatically: members and roles, invites, workspaces and workspace members, API keys, rate limit reports, service accounts, workload identity federation (WIF), or customer-managed encryption keys (CMEK).

The Admin API lives under `https://api.anthropic.com/v1/organizations/*`. It manages the organization itself - it does not send messages. As of **August 26, 2026** it is available in all seven SDKs (Python, TypeScript, C#, Go, Java, PHP, Ruby) under `client.beta.organization`, and in the `ant` CLI under `ant beta:organization`. Usage reports, cost reports, and the Claude Enterprise user-management and analytics endpoints are **not** in the SDKs - call those with raw HTTP.

## Authentication

Two credential types, both read automatically by the default SDK client and the CLI:

| Credential | Env var | HTTP header | Covers |
| --- | --- | --- | --- |
| Admin API key (`sk-ant-admin...`) | `ANTHROPIC_API_KEY` | `x-api-key` | Most endpoints |
| `org:admin` OAuth token | `ANTHROPIC_AUTH_TOKEN` | `authorization: Bearer` | Everything, including the OAuth-only endpoints |

- **OAuth-only endpoints:** service accounts, federation issuers, and federation rules reject API keys - they require an `org:admin` OAuth token.
- **Precedence gotcha:** when both env vars are set, some clients prefer the API key. When using a bearer token, leave `ANTHROPIC_API_KEY` unset in that shell.
- Admin API keys are created in the Claude Console by organization admins.
- Regular (non-admin) API keys do not work on any of these endpoints, and admin credentials do not work on the Messages API.
- An `org:admin` token grants access to the whole organization regardless of any workspace binding.

**Interactive OAuth token** - log in with the `ant` CLI under a dedicated profile (keeps routine commands from running with elevated access), then export the token. Tokens are short-lived; on 401, re-run the export. Profile and scope mechanics (why `org:admin` needs an explicit `--scope`, switching profiles): `shared/anthropic-cli.md`.

```bash
ant auth login --profile admin --scope "org:admin"
export ANTHROPIC_AUTH_TOKEN=$(ant auth print-credentials --profile admin --access-token)
# When done: unset ANTHROPIC_AUTH_TOKEN && ant profile activate default
```

**Automated workloads (CI)** - don't log in interactively. Create a federation rule with `oauth_scope: org:admin` targeting a service account whose `organization_role` is `admin` (this one rule must be created by a human in the Claude Console), then point the client at it with the federation env vars and construct it with no arguments - the SDK/CLI performs the token exchange automatically and refreshes before expiry:

```bash
export ANTHROPIC_FEDERATION_RULE_ID=fdrl_...       # the org:admin rule
export ANTHROPIC_ORGANIZATION_ID=<org-uuid>
export ANTHROPIC_SERVICE_ACCOUNT_ID=svac_...       # the rule's target service account
export ANTHROPIC_IDENTITY_TOKEN_FILE=/path/to/jwt  # or ANTHROPIC_IDENTITY_TOKEN
```

**curl** also needs `anthropic-version: 2023-06-01` on every request.

## Endpoint Coverage

SDK accessor shown in Python spelling; see the per-language table below for naming conventions.

| Resource | REST path | SDK accessor (`client.beta.organization` +) | CLI (`ant beta:organization` +) |
| --- | --- | --- | --- |
| Organization info | `GET /v1/organizations/me` | `.retrieve()` | `retrieve` |
| Members | `/v1/organizations/users` | `.users` - `list`, `update`, `remove` | `:users list\|update\|remove` |
| Invites | `/v1/organizations/invites` | `.invites` - `create`, `list`, `delete` | `:invites create\|list\|delete` |
| Workspaces | `/v1/organizations/workspaces` | `.workspaces` - `create`, `retrieve`, `list`, `update`, `archive` | `:workspaces create\|list\|update\|archive` |
| Workspace members | `/v1/organizations/workspaces/{id}/members` | `.workspaces.members` - `add`, `list`, `update`, `remove` | `:workspaces:members add\|list\|update\|remove` |
| API keys | `/v1/organizations/api_keys` | `.api_keys` - `list`, `update` | `:api-keys list\|update` |
| Org rate limits | `GET /v1/organizations/rate_limits` | `.rate_limits.list(model=..., group_type=...)` | `:rate-limits list` |
| Workspace rate limits | `GET /v1/organizations/workspaces/{id}/rate_limits` | `.workspaces.rate_limits.list(workspace_id)` | `:workspaces:rate-limits list` |
| Service accounts (*) | `/v1/organizations/service_accounts` | `.service_accounts` - `create`, `list`, `archive` | `:service-accounts create\|list\|archive` |
| Federation issuers (*) | `/v1/organizations/federation_issuers` | `.federation.issuers` - `create`, `list`, `archive` | `:federation:issuers create\|list\|archive` |
| Federation rules (*) | `/v1/organizations/federation_rules` | `.federation.rules` - `create`, `list`, `archive` | `:federation:rules create\|list\|archive` |
| CMEK external keys | `/v1/organizations/external_keys` | `.external_keys` - `create`, `validate` | - |

(*) OAuth-only: requires an `org:admin` bearer token, not an API key.

Attaching a CMEK external key to a workspace is a workspace update: `client.beta.organization.workspaces.update("<workspace-id>", external_key_id="ekey_...")`.

## Per-Language Naming & Pagination

| Language | Accessor style (list members example) | List behavior |
| --- | --- | --- |
| Python | `client.beta.organization.users.list(limit=10)` | Iterator auto-fetches more pages; `limit` = page size, not total |
| TypeScript | `client.beta.organization.users.list({ limit: 10 })` - camelCase sub-resources: `apiKeys`, `rateLimits`, `serviceAccounts`, `externalKeys` | `for await` auto-pages |
| C# | `client.Beta.Organization.Users.List(new() { Limit = 10 })` | `await foreach (var u in page.Paginate())` auto-pages |
| Go | `client.Beta.Organization.Users.ListAutoPaging(ctx, params)`; org info is `Organization.Get(ctx)` | `.Next()` / `.Current()` auto-pages |
| Java | `client.beta().organization().users().list(params)` with builder params (`UserListParams.builder().limit(10).build()`) | `.autoPager()` auto-pages |
| PHP | `$client->beta->organization->users->list(limit: 10)` | Raw single-page data call - iterate `->getItems()`; the SDK's auto-pagination helpers aren't wired up for these endpoints yet |
| Ruby | `client.beta.organization.users.list(limit: 10)` | Raw single-page data call - iterate `.data`; the SDK's auto-pagination helpers aren't wired up for these endpoints yet |
| CLI | `ant beta:organization:users list --limit 10` | On the member, invite, workspace, workspace-member, and API-key lists, `--limit` caps the results (unlike most `ant` list commands, where `--limit` sets the page size and `--max-items` caps - see `shared/anthropic-cli.md`) |
| curl | `GET /v1/organizations/users?limit=10` | One page per request; cursor pagination per the Admin API reference |

The rate-limit lists (`rate_limits`, `workspaces.rate_limits`) also support pagination as of launch - page them like the other list endpoints rather than assuming a single response.

Go param types follow the pattern `anthropic.BetaOrganizationUserListParams` (with `anthropic.Int(10)` for `Limit`); Java params use builders from `com.anthropic.models.beta.organization.*` (e.g. `UserListParams.builder().limit(10).build()`). The Go and Java pagination loops:

```go
users := client.Beta.Organization.Users.ListAutoPaging(ctx, anthropic.BetaOrganizationUserListParams{Limit: anthropic.Int(10)})
for users.Next() {
	user := users.Current() // ...
}
if err := users.Err(); err != nil { /* handle */ }
```

```java
for (var user : client.beta().organization().users().list(params).autoPager()) { /* ... */ }
```

## Examples

Common operations (Python spelling; map to other languages with the table above - every operation follows the same shape in each language):

```python
# Organization info
org = client.beta.organization.retrieve()

# List members (iterator auto-fetches more pages; limit = page size)
for user in client.beta.organization.users.list(limit=10):
    print(f"{user.id}: {user.email} ({user.role})")

# Change a member's role / remove a member
client.beta.organization.users.update("user_...", role="developer")
client.beta.organization.users.remove("user_...")

# Invite someone
client.beta.organization.invites.create(email="user@example.com", role="developer")

# Create a workspace and add a member to it
ws = client.beta.organization.workspaces.create(name="Production")
client.beta.organization.workspaces.members.add(
    ws.id, user_id="user_...", workspace_role="workspace_developer"
)

# Deactivate / rename an API key
client.beta.organization.api_keys.update("apikey_...", status="inactive", name="New Key Name")

# Rate limit reports (optional filters: model=..., group_type=...)
client.beta.organization.rate_limits.list(model="claude-opus-5-5")
client.beta.organization.workspaces.rate_limits.list("wrkspc_...")

# Service accounts + WIF (org:admin OAuth token required)
sa = client.beta.organization.service_accounts.create(name="inference-worker", organization_role="developer")
issuer = client.beta.organization.federation.issuers.create(
    name="github-actions",
    issuer_url="https://token.actions.githubusercontent.com",
    jwks={"type": "discovery"},
)
client.beta.organization.federation.rules.create(
    name="gha-deploy",
    issuer_id=issuer.id,
    match={"subject_prefix": "repo:my-org/my-repo:ref:refs/heads/main",
           "claims": {"repository_owner": "my-org"}},
    target={"type": "service_account", "service_account_id": sa.id},
    workspace_id="wrkspc_...",
    oauth_scope="workspace:developer",
    token_lifetime_seconds=600,
)

# CMEK: register, validate, then attach an external key to a workspace
key = client.beta.organization.external_keys.create(
    display_name="prod-key", geo="us",
    provider_config={"type": "aws", "kms_arn": "arn:aws:kms:..."},
)
client.beta.organization.external_keys.validate(key.id)
client.beta.organization.workspaces.update("wrkspc_...", external_key_id=key.id)
```

## Organization Roles

| Role | Permissions |
| --- | --- |
| `user` | Playground |
| `claude_code_user` | Playground + Claude Code |
| `developer` | Playground + manage API keys |
| `billing` | Playground + manage billing |
| `admin` | All of the above + manage users |

Owners and primary owners have all admin permissions and can also manage admins. Workspace roles are `workspace_user`, `workspace_developer`, `workspace_admin`, and `workspace_billing`.

## Platform Restrictions

- **Claude Platform on AWS:** only the workspace endpoints work. Members, workspace members, invites, API keys, and usage/cost/rate-limit reports are unavailable. CMEK external-key endpoints are not yet available there - register and attach keys in the Claude Console.
- **Claude Enterprise (claude.ai orgs):** only members and invites from this surface, plus Enterprise-only endpoints (group and custom-role reads, spend limits) that are not in the SDKs.

## Live Docs

| Topic | URL |
| --- | --- |
| Admin API guide | `https://platform.claude.com/docs/en/manage-claude/admin-api.md` |
| Admin API reference | `https://platform.claude.com/docs/en/api/admin.md` |
| Workspaces | `https://platform.claude.com/docs/en/manage-claude/workspaces.md` |
| Rate limits API | `https://platform.claude.com/docs/en/manage-claude/rate-limits-api.md` |
| WIF admin | `https://platform.claude.com/docs/en/manage-claude/wif-admin-api.md` |
| Usage & cost reports (curl-only) | `https://platform.claude.com/docs/en/manage-claude/usage-cost-api.md` |
