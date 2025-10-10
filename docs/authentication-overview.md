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
