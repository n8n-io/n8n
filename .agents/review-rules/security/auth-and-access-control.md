# Authentication and access control

Applies to: `packages/cli`, `packages/@n8n/db`.

## Authentication and sessions

- JWT validation or expiration weakened; cookie flags (HttpOnly, Secure, SameSite) missing or disabled; MFA bypassed; SSO/SAML/OIDC validation gaps; OAuth 2.0 without PKCE or a weak redirect check

## Authorization

`@n8n/code-health`'s `endpoint-scope-coverage` rule is disabled, so an undecorated route ships unless a reviewer catches it.

- Every authenticated route needs `@GlobalScope` or `@ProjectScope`, unless it declares `skipAuth`, `allowUnauthenticated`, or `apiKeyAuth`
- A decorator proves the caller may do this somewhere, not that the row is theirs. Ownership belongs in the query — a `find…ForUser` finder, or the project filter alongside the id — never a comparison afterwards
- An endpoint querying a repository directly while its siblings use a project-aware service — the public API reaching past it is the usual shape
- Middleware treating an authenticated session as sufficient (`if (req.user) return next()`), skipping the ownership check behind it
- A scope parameter defaulting to the weakest value, or a role map gaining write or execute: mutating call sites must ask for the stronger scope
- Subworkflow execution bypassing caller policies
