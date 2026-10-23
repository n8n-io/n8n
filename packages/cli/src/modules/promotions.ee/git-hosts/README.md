# Git host adapters

Providers own encrypted authentication and host configuration. Environments own
repository remotes and the branch of one direction. Git operations consume the
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

Do not add provider-specific branches to environment, promotion, or apply logic.
A branched Promote opens a GitLab merge request. `PromotionReviewHostResolver`
reads the saved base URL, token, and repository path. A plain Git provider
pushes and does not open a review. This layer does not change the editor UI.

## Discovery

Discovery uses a saved provider, not an environment. A client can pick a repository
before it creates an environment. Both routes require the `gitConnection:discover`
API-key grant and global user scope:

- `GET /api/v1/promotions/providers/{promotionProviderId}/repositories`
- `GET /api/v1/promotions/providers/{promotionProviderId}/repositories/{repositoryId}/branches`

The `gitConnection:read` scope only grants access to saved configuration. It does
not grant discovery access. Existing API keys need an explicit discovery grant.

Both routes accept `search`, `limit`, and an opaque `cursor`. The public query
uses the standard default of 100 and maximum of 250. The limit is an upper bound,
not a fixed page length. GitLab requests contain at most 100 items. A continuation
cursor advances by that effective page size. Follow it even when a page contains
fewer items than the requested limit. Resend the search when you use a cursor.
A cursor keeps its page size. It does not create a snapshot of GitLab data.
Repository IDs, paths, and default-branch flags come from GitLab. Clone URLs use
the saved provider host.

GitLab repository discovery lists projects with Developer access or higher
(`min_access_level=30`). Search matches repository names and namespace paths.
Search results use similarity order. Other results use ascending repository IDs.
Branch search uses GitLab's branch-name filter. An empty list is valid.
Invalid credentials and inaccessible repositories return errors.

The client never follows a pagination URL. It computes each page on the saved
host. If a proxy omits pagination headers, a full page gets a continuation cursor.
That fallback can cause one extra request at the end of a list.

## Environment remotes

The API accepts and returns `remoteUrl`. New GitLab remotes store only a
`repositoryPath`. Reads and Git operations derive the URL from the provider.
Plain Git and existing URL-based remotes stay compatible. Resave an existing
GitLab remote to convert it to a path. Older versions cannot read path remotes.
Environment responses also return the stored `repositoryPath`. URL-encode it
before you use it as the `repositoryId` to list branches of a saved environment.

## GitLab

Use the instance base URL and an opaque access token. Recommend a group access
token for self-managed automation. A personal access token uses the same path.
Grant `read_api` and `write_repository`. Protected branches can require the
Maintainer role. API validation does not prove write permission on a repository.

Merge requests need the `api` scope. A branched Promote opens one. Approve in
n8n approves and merges it as the GitLab user of the token, at the head commit
that the reviewer saw, and deletes the source branch. A group access token acts
as its bot user, and a personal access token acts as its owner. That user needs
permission to merge into the base branch. The same user also opened the merge
request, so GitLab approval rules can block the merge. Do not require approvals
on the repository.

GitLab API authentication uses only the access token. Omit `auth.username` for a
GitLab provider. The service ignores a supplied username and stores `n8n` for Git
transport. Plain Git token authentication requires both `auth.username` and
`auth.password` on create and credential replacement.

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

Provider credential and host edits use one conditional database update. It saves
only while the stored configuration and encrypted credentials match the original
snapshot. A concurrent change returns HTTP 409. Reload the provider before a retry.
Name-only edits do not use this condition.
