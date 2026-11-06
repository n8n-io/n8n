---
title: Authentication
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: guillaumejacquart
---

# Authentication

[APIs](apis.md) showed that authentication is the first check on a REST route. The backend gets requests from the editor, from scripts, from MCP clients, and from products that embed n8n. This page explains how each caller proves who it is, how users sign in, and how n8n keeps their sessions.

## Callers

> **A route with `skipAuth` must check the caller in another way.** For example, the route for signed binary data checks a signature, and the routes that resolve a signup token check that token.

| Caller | Proof |
|---|---|
| The editor | A JWT in the cookie `n8n-auth` |
| A script that uses the public API | An API key with scopes |
| An MCP client | An API key, or a token from the OAuth server of the instance |
| A product that embeds n8n | A token exchange, behind an environment flag |

## Sign-in methods

Email sign-in is in the core. LDAP, SAML, and OIDC are licensed modules, and only one method is active at a time. With SAML or OIDC, the `provisioning` module can set the roles of a user from the claims of the identity provider. It can also refuse a sign-in. SCIM lets an identity provider create and remove users, and it works only with SAML or OIDC.

## Sign-in flow

Email and LDAP use the same route, `POST /login`. Each of them is a class with `@AuthHandler()`, and `AuthHandlerRegistry` finds a handler by its name. The route tries the email handler first. If the active method is LDAP, the route then tries the LDAP handler, except for the owner.

When SAML or OIDC is active, the route refuses a password sign-in. Only the owner and users with `allowSSOManualLogin` can still use a password. SAML and OIDC send the browser to the identity provider, and their callback route signs the user in.

After a password check, n8n checks the MFA code, if the user has MFA on. Every method then calls `issueCookie` in `AuthService`, so the rest of the backend sees one kind of session.

## Sessions

The session cookie holds a JWT, and n8n keeps no session table. The JWT contains a hash of the password and the email of the user. A change to either one makes old sessions invalid. A logout adds the token to a block list.

## Quiz

1. A user changes their password. What happens to their open sessions?
   - A. They stay valid until they expire.
   - B. n8n deletes them from the session table.
   - C. Only the current session stays valid.
   - D. They become invalid.
2. SAML is active. A member enters an email and a password on the sign-in page. What happens?
   - A. The sign-in works.
   - B. n8n refuses it, unless the member has `allowSSOManualLogin`.
   - C. n8n sends the password to the identity provider.
   - D. n8n tries the LDAP handler.

<details>
<summary>Answers</summary>

1. D. n8n keeps no session table. A change of the password or the email makes old tokens invalid.
2. B. When SAML or OIDC is active, only the owner and users with `allowSSOManualLogin` can use a password.

</details>
