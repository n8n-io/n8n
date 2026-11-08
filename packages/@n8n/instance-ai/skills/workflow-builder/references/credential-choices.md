---
name: credential-choices
description: >-
  Load before you pick a credential type for a service that has no connected
  credential, before you choose HTTP Request authentication, or when the user
  explicitly asks for a new credential instead of an existing one.
recommended_tools:
  - list_credentials
  - search_credential_types
  - setup_credentials
  - setup_workflow
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
   node's `genericAuthType` to `httpTemplatedCustomAuth`. Note the provider's
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

When the user explicitly asks for a **new** credential ("create a new Slack
credential"), an unresolved `newCredential('Name')` is not enough: the build
would still attach their sole existing credential of that type, and setup
would preselect their most recent one. Pass the credential type in
`preferNewCredentials` on `workflow_builder_build_workflow` **and** on
`setup_workflow` (or `preferNew: true` on the entry of `setup_credentials`).
The slot then stays unresolved through the build and the card opens on
credential creation, with existing credentials still listed. Pass it only on
an explicit request, never by default — reuse is the right behavior everywhere
else.
