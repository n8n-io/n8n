---
title: Authentication and sessions
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
---

# Authentication and sessions

Read this when you touch login, the auth cookie, MFA, API keys, or the newer token exchange and embed login paths.

## What it is

A browser session in n8n is a stateless JWT in an httpOnly cookie named `n8n-auth`. `AuthService` issues, refreshes, validates, and revokes that cookie. The controller registry wraps every route without `skipAuth` in the auth middleware. Login is a password flow through pluggable auth handlers: email in core, LDAP in a module. TOTP MFA is optional, and a license can enforce it. The public API and the MCP server use a second path, a chain of auth strategies that accepts API keys and other tokens.

## Why it has this shape

- **Stateless, with a revocation list.** The JWT carries a hash of the email, the password hash, and the MFA secret when MFA is on. A password or email change therefore ends old sessions without a session table. Logout writes the token to `invalid_auth_token`.
- **A browser id in the token.** The cookie can carry `SameSite=None` for embedded editors. The browser id binds the session to one browser to reduce session hijacking.
- **Handlers in a registry.** `AuthHandlerRegistry` fills at startup from classes with `@AuthHandler()`, after modules load. This let LDAP leave core and live in a module. Login asks for the `email` handler first, then for the handler of the active method.
- **Strategies in a chain.** Each strategy abstains, rejects, or authenticates. Modules add strategies without changes to the public API code. The `token-exchange` module (RFC 8693 token exchange and embed login) and the `inbound-auth-core` module (trusted sources) both register here.
- **JWT secret.** `JwtService` signs with `N8N_USER_MANAGEMENT_JWT_SECRET` when it is set. Otherwise it derives a secret from the encryption key and keeps it in `deployment_key`.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Cookie issue and validation | `packages/cli/src/auth/auth.service.ts` | `AuthService.createAuthMiddleware` |
| Password login handlers | `packages/cli/src/auth/auth-handler.registry.ts` | `AuthHandlerRegistry` |
| Login route | `packages/cli/src/controllers/auth.controller.ts` | `AuthController` |
| Signing | `packages/@n8n/backend-services/src/services/jwt.service.ts` | `JwtService` |
| Public API and MCP chain | `packages/@n8n/backend-services/src/services/auth-strategy.registry.ts` | `AuthStrategyRegistry` |
| API keys and their scopes | `packages/cli/src/services/public-api-key.service.ts` | `PublicApiKeyService` |
| TOTP and recovery codes | `packages/cli/src/mfa/mfa.service.ts` | `MfaService` |
| Token exchange and embed login | `packages/cli/src/modules/token-exchange/token-exchange.module.ts` | `isEnvFeatureEnabled` |
| Trusted sources | `packages/cli/src/modules/inbound-auth-core/inbound-auth-core.module.ts` | `InboundAuthCoreModule` |
| Encrypted OAuth2 tokens | `packages/cli/src/modules/oauth-jwe/oauth-jwe.module.ts` | `OAuthJweModule` |

Routes that must work before MFA is complete set `allowSkipMFA`. The license feature `feat:mfaEnforcement` gates enforcement. Core login has no license flag.

## Feature environment gates

Some auth paths sit behind a feature environment variable as well as a license flag. The pattern is `N8N_ENV_FEAT_<NAME>`, read through `isEnvFeatureEnabled` in `packages/@n8n/backend-common/src/environment.ts`. The function takes the full variable name, so each gate stays searchable at its call site. For example, `N8N_ENV_FEAT_TOKEN_EXCHANGE` gates the token exchange module. The `oauth-jwe` module is a default module with no environment gate. Each credential opts in to JWE.

## What is moving

Two models for external token issuers exist side by side. The `inbound-auth-core` module binds the contracts in `packages/@n8n/inbound-auth` and owns the trusted source tables. The `token-exchange` module keeps its own trusted key tables. The deprecated `issueCookie` in `packages/cli/src/auth/jwt.ts` stays until the Cloud hooks stop using it.

## Read more

- [Authorization](authorization.md) for what happens after authentication
- [SSO and provisioning](sso-and-provisioning.md)
- [Patterns](../patterns.md#controllers-and-routes) for how routes declare `skipAuth`
- docs.n8n.io: user management and API authentication pages
