---
name: credential-choices
description: >-
  Load before you pick a credential type for a service that has no connected
  credential, before you choose HTTP Request authentication, or when the user
  explicitly asks for a new credential instead of an existing one. Also load
  before you ask the user any credential or auth-type question during setup.
recommended_tool_groups:
  - credentials
  - workflows
---

# Credential Choices

## Choosing a credential type

`list_credentials` returns connected credential instances, not all supported
credential types. If it has no suitable instance for a named service, call
`search_credential_types` with the service name before you choose generic
authentication. Pick in this order:

1. A **dedicated credential type** whenever search finds one. For an HTTP
   Request node, use the most specific type for the target service and
   operation. Set `authentication` to `'predefinedCredentialType'` and
   `nodeCredentialType` to the returned type. If no credential instance exists,
   leave `newCredential('Suggested Name')` unresolved for setup. Do not use
   generic authentication only because the user has not connected an account.
2. **Simplified Custom Auth** (`httpTemplatedCustomAuth`) for any service
   without a dedicated type whose auth is expressible as header/query/body
   values — this covers API keys and bearer tokens. When the provider documents
   `Authorization: Bearer <token>`, do NOT use `httpBearerAuth`: template it as
   `{"headers":{"Authorization":"Bearer {{api_key}}"}}`. Set the HTTP Request
   node's `authentication` to `genericCredentialType` and its `genericAuthType`
   to `httpTemplatedCustomAuth`. Note the provider's
   documented auth scheme (header format, key page, a cheap authenticated GET
   endpoint) while you have the docs open: the setup call needs them for the
   `credentialHints` recipe. Before that setup call, load the
   `credential-recipe-research` reference and follow its lookup procedure — the
   recipe's template, docsUrl and testUrl must come from pages fetched there,
   never from memory. Setup rejects new plain generic credentials on HTTP
   Request nodes, so picking Bearer/Header/Query/Custom Auth here means
   rebuilding — unless the user explicitly asked for that plain type: an
   explicit user choice wins (setup accepts it with
   `allowPlainGenericAuth: true`).
3. Plain generic types (`httpBasicAuth`, `httpDigestAuth`, `oAuth2Api`, …) only
   for what a template cannot express: basic auth's base64-encoded pair,
   digest's challenge-response, OAuth flows — or when the user explicitly asks
   for a specific plain type.

## Explicit request for a new credential

When the user explicitly asks for a **new** credential, an unresolved
`newCredential('Name')` is not enough: the build would still attach their
existing one. Pass the type in `preferNewCredentials`. Reuse is the default
everywhere else.

## Credential choices during setup

Let the setup card collect credential choices. Ask about the auth type only
for a standalone `setup_credentials` request, never in a workflow build.
