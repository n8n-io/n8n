---
title: Access
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: guillaumejacquart
---

# Access

On Day 1, you created the owner account, and the backend checked that account on every request. This page explains how n8n knows who calls, what each caller can do, and how nodes get their secrets. Read it before you add a route, a role, a sign-in method, or anything that touches credentials.

## Authentication

| Caller | Proof |
|---|---|
| The editor | A JWT in the cookie `n8n-auth` |
| A script that uses the public API | An API key with scopes |
| An MCP client | An API key, or a token from the OAuth server of the instance |
| A product that embeds n8n | A token exchange, behind an environment flag |

The session cookie holds a JWT, and n8n keeps no session table. The JWT contains a hash of the password and the email of the user. A change to either one makes old sessions invalid. A logout adds the token to a block list.

Every REST route requires a signed-in user, unless the route opts out with `skipAuth`.

Email sign-in is in the core. LDAP, SAML, and OIDC are licensed modules, and only one method is active at a time. With SAML or OIDC, the `provisioning` module can set the roles of a user from the claims of the identity provider. It can also refuse a sign-in. SCIM lets an identity provider create and remove users, and it works only with SAML or OIDC.

## Authorization

A permission in n8n is a **scope**, a string such as `workflow:publish`. A **role** is a set of scopes. Each user has one global role: owner, admin, member, or chat user. A chat user can use workflows through chat, but cannot build them.

Workflows, agents, and credentials belong to a **project**, not to a user. Each user has a personal project, and team projects need a license. Membership in a project gives the user a project role, such as editor or viewer.

Each route declares the scope that it needs, with `@GlobalScope` or `@ProjectScope`. For a project scope, n8n finds the resource id in the URL and the project of that resource. Then it checks the role of the user in that project. A list route cannot check each row through its URL. It asks for the projects where the user has the scope, and it filters the list on those projects.

Roles and scopes are rows in the database, so a license can add custom project roles. `@n8n/permissions` defines every scope, and the editor uses the same package.

## Credentials

A **credential** is an encrypted secret that a project owns, such as an API key for a service. n8n decrypts it only when a node needs it during a run, and it does not store the decrypted value.

Workers decrypt the credentials for the nodes that they run, so every process holds the encryption key. New code encrypts and decrypts only through `encryptV2` and `decryptV2`. The ciphertext names the key that encrypted it, so keys can rotate. Lint rules block every other way, and n8n never deletes a key, because data that it encrypted would become unreadable.

A credential can also give each user a different secret, and a value can come from an external store, such as a vault, through `$secrets`. Manual runs skip the per-user step unless the user context is present.

**Instance credentials** are for n8n itself, not for workflows. Admins manage them, and the n8n Assistant uses them for its model.

## Quiz

1. A user changes their password. What happens to their open sessions?
   - A. They stay valid until they expire.
   - B. They become invalid, because the JWT contains a hash of the password.
   - C. n8n deletes them from the session table.
   - D. Only the current session stays valid.
2. You add a REST route and add no auth decorator. Who can call it?
   - A. Only a signed-in user. A route must opt out with `skipAuth` to allow other callers.
   - B. Anyone.
   - C. Only the owner.
   - D. Only API keys.
3. How does a list route check permissions?
   - A. It checks each row through its URL.
   - B. It checks only the global role.
   - C. It returns all rows, and the editor hides the others.
   - D. It asks for the projects where the user has the scope, and it filters the list on those projects.
4. Who owns a workflow?
   - A. The user who created it.
   - B. The instance owner.
   - C. A project.
   - D. The last user who saved it.
5. Why does n8n never delete an encryption key?
   - A. Keys are too large to delete.
   - B. The data that the key encrypted would become unreadable.
   - C. Cloud stores a copy of each key.
   - D. Each process needs every key at startup.

<details>
<summary>Answers</summary>

1. B. n8n keeps no session table. A change of the password or the email makes old tokens invalid.
2. A. Every REST route requires a signed-in user by default.
3. D. A list route cannot check each row through a URL, so it filters by project.
4. C. Workflows, agents, and credentials belong to a project. Each user has a personal project.
5. B. The ciphertext names its key, so keys can rotate, but an old key must stay.

</details>
