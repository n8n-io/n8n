# Git host adapters

Providers own encrypted authentication and host configuration. Connections own
repository targets. Direction configs own branches. Git operations consume the
same plain credentials regardless of provider type.

`GitHostClient` checks host authentication before provider settings are saved.
It also lists repositories and branches with the saved provider credentials.
Each adapter owns its URLs, headers, response validation, and error messages.
`GitHostClients` resolves the adapter through a typed map. Shared provider
capabilities declare the supported auth methods and fixed transport usernames.

## Add a host

1. Add its provider type and capabilities to `@n8n/api-types`.
2. Add a database migration for the provider type constraint.
3. Implement `GitHostClient` with `@n8n/backend-network`.
4. Register the adapter in `GitHostClients`.
5. Add tests for validation and Git transport compatibility.

Do not add provider-specific branches to connection, promotion, or apply logic.
Add merge-request capabilities when that feature lands. This layer does not
change the editor UI.

## Discovery

Discovery uses a saved provider, not a connection. A client can pick a repository
before it creates a connection. Both routes require the `gitConnection:read`
API-key grant and global user scope:

- `GET /api/v1/promotions/providers/{promotionProviderId}/repositories`
- `GET /api/v1/promotions/providers/{promotionProviderId}/repositories/{repositoryId}/branches`

Both routes accept `search`, `limit`, and an opaque `cursor`. Pages contain at
most 50 items. Resend the search when you use a cursor. A cursor keeps its page
size. It does not create a snapshot of GitLab data. Repository IDs and clone URLs
come from GitLab. Branch names include the default-branch flag.

GitLab repository discovery lists all projects accessible to the token. It does
not require membership. Search matches repository names and
namespace paths. Branch search uses GitLab's branch-name filter. An empty list
is valid. Invalid credentials and inaccessible repositories return errors.

The client never follows a pagination URL. It computes each page on the saved
host. If a proxy omits pagination headers, a full page gets a continuation cursor.
That fallback can cause one extra request at the end of a list.

## GitLab

Use the instance base URL and an opaque access token. Recommend a group access
token for self-managed automation. A personal access token uses the same path.
Grant `read_api` and `write_repository`. Protected branches can require the
Maintainer role. API validation does not prove write permission on a repository.

GitLab API requests follow the instance network policy. If enabled restrictions
block an internal host, configure `N8N_SSRF_ALLOWED_HOSTNAMES` or
`N8N_SSRF_ALLOWED_IP_RANGES` to permit it.

The adapter checks the authenticated user and a one-project API page. An empty
page is valid. Each HTTP read retries one transient transport or HTTP failure.
Retries honor `Retry-After` waits up to one second. Longer waits return an
availability error without a retry. Redirects do not forward tokens. Logs include
fixed error codes, never request secrets or response bodies.

All GitLab API responses have a 1 MiB decoded-body limit.
If a discovery page exceeds it, restart the list with a smaller `limit` and no
`cursor`. A cursor keeps its original page size.
The client does not retry an oversized page.
Fresh credentials validate before encryption. A different API destination requires
token authentication and host configuration in the same update. The supplied token
can be the same as the saved token. Equivalent URL-only edits decrypt the stored
token once. Hostname case, default-port notation, and a trailing slash do not
change the API destination. Changes to the protocol, hostname, port, or
installation path do.

Certificate verification stays enabled. Configure the Node trust store for an
internal certificate authority. Git uses `GIT_SSL_CAINFO` or `GIT_SSL_CAPATH`.
