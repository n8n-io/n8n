---
title: Authentication and sessions
audience: Backend engineers new to n8n
tier: 3
reading_time: 6 min
last_reviewed: 2026-09-02
owner: "@n8n-io/iam"
---

# Authentication and sessions

Read this when you touch login, the auth cookie, MFA, API keys, or the newer token exchange and embed login paths.

## What it is

Authentication in n8n is a stateless JWT in an httpOnly cookie named `n8n-auth`. `AuthService` issues, refreshes, validates, and revokes that cookie, and the controller registry wraps every route without `skipAuth` in its middleware. Login is a password flow through pluggable `@AuthHandler()` classes: email built in, LDAP from a module. TOTP MFA is optional and can be enforced under a license. Two newer modules extend this. `token-exchange` implements RFC 8693 token exchange and an embed login that issues the same cookie from an external JWT. `oauth-jwe` publishes an instance key pair so that OAuth2 providers can send encrypted tokens.

## How it works

`AuthService.createAuthMiddleware()` in `packages/cli/src/auth/auth.service.ts` runs these steps on every request:

1. Read the cookie and reject tokens listed in `invalid_auth_token`.
2. Verify the JWT and load the user with its role.
3. Compare a hash derived from the email, the password hash, and the MFA secret prefix. A password or email change therefore invalidates old sessions.
4. Check the browser id.
5. Refresh the cookie when it is close to expiry.
6. Apply the MFA gate in the middleware that wraps these steps.

`JwtService` signs with `N8N_USER_MANAGEMENT_JWT_SECRET`, or with a secret derived from the encryption key and persisted in `deployment_key`.

`POST /rest/login` asks `AuthHandlerRegistry` for the `email` handler first, then, when another method is active and the user is not the owner, for the handler named after that method. Today only `ldap` exists as a second handler. The registry fills at startup from classes decorated with `@AuthHandler()`, after modules load, which is how the LDAP handler can live in a module. Logout inserts the token into `invalid_auth_token` and clears the cookie. Owner setup fills the pre-created owner shell user.

MFA uses `MfaService` and a TOTP service, storing an encrypted secret and recovery codes on the user row. Enforcement is a setting honored only when `feat:mfaEnforcement` is licensed. Routes that must work before MFA is satisfied set `allowSkipMFA`.

Public API keys are JWTs too, stored in `user_api_keys` with per-key scopes. `AuthStrategyRegistry` is an ordered chain used by the public API and the MCP server. Each strategy abstains, fails fast, or returns a token grant. The `token-exchange` module verifies an external JWT against trusted keys, consumes its `jti`, mints an n8n JWT, and registers a scoped strategy so that the public API accepts it. Its embed login resolves or creates a user and issues the normal cookie with cross-site settings.

## Where to look

| Path | What |
|---|---|
| `packages/cli/src/auth/auth.service.ts` | Cookie issue, refresh, validate |
| `packages/cli/src/auth/auth-handler.registry.ts`, `handlers/` | Pluggable password login |
| `packages/cli/src/controllers/auth.controller.ts`, `owner.controller.ts`, `invitation.controller.ts`, `password-reset.controller.ts`, `users.controller.ts`, `me.controller.ts`, `mfa.controller.ts`, `api-keys.controller.ts` | The REST surface |
| `packages/cli/src/services/jwt.service.ts` | Signing |
| `packages/cli/src/services/auth-strategy.registry.ts` and the strategy files | Public API and MCP authentication chain |
| `packages/cli/src/services/public-api-key.service.ts` | API keys and their scopes |
| `packages/cli/src/mfa/` | TOTP and recovery codes |
| `packages/cli/src/modules/token-exchange/` | Token exchange and embed login |
| `packages/cli/src/modules/oauth-jwe/` | Instance JWK set |
| `packages/@n8n/config/src/configs/auth.config.ts`, `user-management.config.ts`, `mfa.config.ts` | Cookie, session duration, SMTP, MFA |

## What it owns

`user`, `auth_identity`, `invalid_auth_token`, `user_api_keys`, and rows in `deployment_key` and `settings`. The token exchange module owns `token_exchange_jti`, `trusted_key_source`, and `trusted_key`.

## Flags

`N8N_USER_MANAGEMENT_JWT_SECRET`, `N8N_USER_MANAGEMENT_JWT_DURATION_HOURS` (168), the refresh timeout, the cookie `secure` and `samesite` settings, `N8N_MFA_ENABLED`, and the SMTP settings for invitations. The token exchange module has `feat:tokenExchange` plus an `N8N_ENV_FEAT_TOKEN_EXCHANGE` gate and runtime toggles for exchange and embed login. The JWE module is gated by `N8N_ENV_FEAT_OAUTH2_JWE`. Core auth has no license flag. `feat:mfaEnforcement` gates enforcement.

## Per mode

Authentication runs on mains. The deprecated `issueCookie` in `packages/cli/src/auth/jwt.ts` is kept for the Cloud hooks file. No other cloud branch exists here. Workers and webhook processes do not serve the login routes.

## Was, is, goes

**Was.** Legacy auth middleware was removed in 2024. **Is.** One `AuthService`, a handler registry so that LDAP could leave core, and a strategy registry for the public API since 2026. Token exchange and JWE are behind feature environment variables. **Goes.** The handler type union is documented as extensible beyond `password`. Three `TODO` markers in the auth service concern a push handshake, the user quota check, and caching the user object.

## Terms

- **auth cookie**: `n8n-auth`, an httpOnly JWT.
- **browser id**: a client-generated string in the token to reduce session hijacking.
- **auth handler**: a class that verifies a login id and a password for one method.
- **auth strategy**: a step in the chain that authenticates a public API or MCP request.
- **token grant**: the result of a successful strategy, carrying scopes.
- **embed login**: issuing the cookie from an external JWT for an embedded editor.

## Read more

- [Authorization](authorization.md) for what happens after authentication
- [SSO and provisioning](sso-and-provisioning.md)
- docs.n8n.io: user management and API authentication pages
