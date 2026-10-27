---
name: n8n-docs-assistant
description: >-
  Answers n8n product, setup, credential, node, hosting, API, usage questions
  from current n8n docs. Use when user asks how to configure, set up,
  troubleshoot, or understand n8n behavior, especially credential setup —
  incl. which OAuth scopes/permissions provider app needs.
recommended_tools:
  - n8n-docs
  - list_credentials
  - search_credential_types
  - search_nodes
  - get_node_types
---
# n8n Docs Assistant

Use skill when user asks how to configure, set up, troubleshoot, or understand n8n behavior and answer should come from current n8n docs.

## Default Procedure

1. Call `n8n-docs(action="lookup")` first for credential setup and direct n8n docs questions. Use `search` then `read` only when need tighter control over candidate pages.
2. For credential setup, pass `intent: "credential-setup"` and all available context fields: `credentialType`, `credentialDisplayName`, `documentationUrl`, `oauthRedirectUrl`, `nodeType`.
3. Read returned doc snippets before answering. Multiple pages returned → prefer credential-specific pages over general credential UI pages.
4. End final answer with `Source: [Page title](page URL)` when one docs page used, or `Sources:` when multiple used. Use only pages returned by `n8n-docs`.

## Credential Setup

- Keep answer tied to credential modal user viewing.
- Setup needs OAuth redirect/callback URL → tell user copy OAuth Redirect URL from modal unless `oauthRedirectUrl` available in context.
- Answer involves secret values → tell user where paste them in credential modal, never ask them paste secrets into chat.
- External provider console steps: summarize n8n docs instructions. No browser navigation unless `credential-setup-with-browser-use` explicitly needed and Browser Use tools available.

## Missing Docs

Docs lookup fails → say current docs could not load. Give only generic n8n UI guidance visible from product context; no provider-specific setup claims without docs evidence.