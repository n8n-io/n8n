# Authentication, authorization, and licensing

Applies to: `packages/cli`, `packages/@n8n/db`.

## Authentication and sessions

- JWT handling that weakens validation or expiration
- Missing or disabled cookie security flags (HttpOnly, Secure, SameSite)
- Changes that bypass MFA enforcement
- SSO/SAML/OIDC flows with validation gaps
- OAuth 2.0 missing PKCE, or with weak redirect URI validation

## Authorization

No static check covers this: the `endpoint-scope-coverage` rule in
`@n8n/code-health` is disabled, so a new route without a scope decorator reaches
production unnoticed unless a reviewer catches it.

- Every authenticated route needs `@GlobalScope` or `@ProjectScope`, unless it
  declares `skipAuth`, `allowUnauthenticated`, or `apiKeyAuth`
- Missing credential permission validation before workflow execution
- Subworkflow execution bypassing caller policies or ownership validation
- Missing project-level or resource-level access controls

## License enforcement

- Missing `FeatureNotLicensedError` for unlicensed feature access
- Bypassed license quota checks
- New licensed features without middleware or module-level enforcement
- New endpoints in `*.ee.ts` that reach licensed features without `@Licensed`
- `@Licensed` not matching the feature (check `LICENSE_FEATURES` in `@n8n/constants`)
- Endpoints in `*.ee.ts` carrying a scope decorator but missing `@Licensed` — the
  license check is separate from the permission check
- Prefer the `@Licensed` decorator over custom licensing middleware
- Decorator order: route decorator → `@Licensed` → scope decorators
- Enterprise code reachable outside `*.ee.ts` files or licensed modules
