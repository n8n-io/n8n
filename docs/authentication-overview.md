# Frontend Authentication Overview

## UI authentication state management
The editor UI centralizes authentication state in the `useUsersStore` Pinia store. It keeps the currently authenticated user's ID in a reactive ref, derives the `currentUser` object from the stored user map, and exposes helpers such as role flags and MFA status based on that state. During application bootstrap the store's `initialize` method attempts a cookie-based session login, which on success stores the user record and fires any registered login hooks to keep other subsystems in sync. Logout clears the current user reference, runs logout hooks, and removes browser tracking data used by the API client.

## Session lifetime and token refresh
Authentication relies on an HTTP session managed by the backend rather than rotating tokens. When the UI starts it calls the `/login` endpoint with existing cookies via `loginWithCookie`, and the shared REST client automatically sends credentials (cookies) on subsequent requests in development environments. There is no dedicated refresh token workflow in the frontend; session renewal is handled implicitly by the server through the cookie-based session.

## Third-party frontend dependencies involved in auth flows
The UI stack builds on several third-party libraries:

- **Vue 3** and **Vue Router** provide the component/runtime and routing foundation used throughout the authenticated experience.
- **Pinia** powers global state stores like `useUsersStore` that hold authentication information.
- **Axios** underpins the REST API client that issues authentication requests and attaches credentials.
- **@vueuse/core** supplies utility composables (for example, the login store imports `useAsyncState`).

These packages, along with supporting utilities such as `@vueuse/components` and `qrcode.vue` (used in MFA flows), are declared in the editor UI package manifest.

## Authentication-related API endpoints
The frontend REST client wraps the backend's authentication surface area. Key endpoints include:

- **Session management**: `GET /login`, `POST /login`, and `POST /logout` to validate cookie sessions, initiate logins, and terminate sessions.
- **Account setup and invitations**: `POST /owner/setup`, `GET /resolve-signup-token`, `POST /users/{id}` for invite acceptance, plus helpers for resending invites and retrieving invite links.
- **Password recovery**: `POST /forgot-password`, `GET /resolve-password-token`, and `POST /change-password`.
- **Profile updates**: `PATCH /me`, `PATCH /me/settings`, and `PATCH /me/password` as well as administrative `PATCH /users/{id}/settings` and `DELETE /users/{id}` routes.
- **Multi-factor authentication**: `POST /mfa/can-enable`, `GET /mfa/qr`, `POST /mfa/enable`, `POST /mfa/verify`, `POST /mfa/disable`, and `POST /mfa/enforce-mfa`.
- **Single sign-on**: SAML routes such as `GET /sso/saml/initsso`, `GET /sso/saml/metadata`, `GET /sso/saml/config`, and `POST /sso/saml/config`/`/toggle`, plus OIDC routes like `GET /sso/oidc/config`, `POST /sso/oidc/config`, and `GET /sso/oidc/login`.

Together these endpoints enable session establishment, self-service account management, MFA enrollment, and SSO integrations within the frontend.

## Cookie creation
A new browser session cookie is issued right after a successful login (local, LDAP, SSO, etc.). After credentials and optional MFA validation, the login controller calls AuthService.issueCookie, passing the Express response, the authenticated user, the MFA flag, and the browser identifier from the request.

AuthService.issueCookie first enforces seat limits, then signs a JWT via issueJWT. The cookie is set with httpOnly, sameSite, secure, and a maxAge derived from the session duration configuration.

issueJWT builds the payload with the user ID, a hash derived from the user’s credentials (and MFA secret when present), the browser ID fingerprint, and whether MFA was used. The JWT is signed with an expiration matching the configured session duration.

## Cookie validation and renewal
Every authenticated request goes through the auth middleware. It reads the cookie, checks that the token hasn’t been invalidated, verifies the JWT, and rehydrates the user. Browser ID mismatches or user changes cause the cookie to be cleared and the request rejected.

When the decoded JWT is close to expiring—specifically, when the remaining lifetime drops below the configured refresh timeout—the service transparently calls issueCookie again, emitting a fresh cookie with a new expiration while preserving the session.

## Cookie lifespan and invalidation
The lifetime of each session cookie is jwtSessionDurationHours (168 hours by default), configurable via N8N_USER_MANAGEMENT_JWT_DURATION_HOURS. The renewal window is controlled by jwtRefreshTimeoutHours; 0 falls back to 25 % of the session duration, while negative values disable auto-refresh.

On logout, the service records the current token in the invalid-token repository (using its exp for TTL) and clears the cookie so the browser stops sending it. Any subsequent request bearing that token is rejected as invalid.

This sequence covers initial issuance, automatic renewal, and eventual expiry or manual invalidation of the cookie-backed session.
