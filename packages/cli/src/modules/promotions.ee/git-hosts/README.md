# Git host adapters

Providers own encrypted authentication and host configuration. Connections own
repository targets. Direction configs own branches. Git operations consume the
same plain credentials regardless of provider type.

`GitHostClient` checks host authentication before provider settings are saved.
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
Add discovery or merge-request capability interfaces when those features land.
This layer does not expose repository listing or change the editor UI.

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

Validation responses have a 1 MiB decoded-body limit.
Fresh credentials validate before encryption. URL-only edits decrypt the stored token.

Certificate verification stays enabled. Configure the Node trust store for an
internal certificate authority. Git uses `GIT_SSL_CAINFO` or `GIT_SSL_CAPATH`.
