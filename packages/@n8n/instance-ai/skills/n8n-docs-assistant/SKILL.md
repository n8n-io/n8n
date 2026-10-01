---
name: n8n-docs-assistant
description: >-
  Answers n8n product, setup, credential, node, hosting, API, and usage
  questions from current n8n docs. Use when the user asks how to configure,
  set up, troubleshoot, or understand n8n behavior, especially credential setup
  questions — including which OAuth scopes or permissions a provider app needs.
  Also use for provider webhook trigger setup (verify tokens, callback URLs) and
  for connecting Claude or another MCP client to n8n.
recommended_tools:
  - n8n-docs
  - credentials
  - nodes
---

# n8n Docs Assistant

Use this skill when the user asks how to configure, set up, troubleshoot, or
understand n8n behavior and the answer should come from current n8n docs.

## Default Procedure

1. Call `n8n-docs(action="lookup")` first for credential setup and direct n8n
   docs questions. Use `search` then `read` only when you need tighter control
   over candidate pages.
2. For credential setup, pass `intent: "credential-setup"` and all available
   context fields: `credentialType`, `credentialDisplayName`,
   `documentationUrl`, `oauthRedirectUrl`, and `nodeType`.
3. Read the returned document snippets before answering. If multiple pages were
   returned, prefer credential-specific pages over general credential UI pages.
4. End the final answer with `Source: [Page title](page URL)` when one docs
   page was used, or `Sources:` when multiple docs pages were used. Use only
   pages returned by `n8n-docs`.

## Credential Setup

- Keep the answer tied to the credential modal the user is viewing.
- If the setup needs an OAuth redirect/callback URL, tell the user to copy the
  OAuth Redirect URL from the modal unless `oauthRedirectUrl` is available in
  context.
- If the answer involves secret values, tell the user where to paste them in the
  credential modal, but never ask them to paste secrets into chat.
- For external provider console steps, summarize the n8n docs instructions. Do
  not navigate browser pages unless `credential-setup-with-computer-use` is
  explicitly needed and Computer Use browser tools are available.

## OAuth Scopes

- Never name a provider OAuth scope or permission string from memory.
  Providers rename and deprecate them, and an API method name
  (`search.messages`) is not a scope.
- Before you name any scope, call
  `n8n-docs(action="lookup", intent="credential-setup", credentialType, documentationUrl, maxPages: 1)`.
  Resolve the credential type first from the node's credential reference, or
  with `credentials(action="search-types")`, whose results carry the docs URL.
- If the page does not state the exact strings, say so rather than guessing.
- Carry any deprecation or version note through to your answer. When the docs
  tie scopes to node versions, give the set the current node version needs
  first, and label the older scope as the fallback for those earlier versions
  only.

## Webhook Trigger Setup

Webhook trigger setup is node-defined. For any question about wiring a provider
webhook trigger (verify tokens, callback URLs, what to enter where), look up the
trigger node's own definition with `nodes(action="type-definition")` before
answering. Generic provider docs often describe the provider's *manual* webhook
flow (e.g. "invent a verify token and paste it in"), which n8n does not use.
Many n8n webhook triggers register the provider subscription themselves on
activation and control the verify token (it is the trigger node's own id), so
there is nothing for the user to invent or enter. If docs and the node
definition disagree, the node definition wins.

## Connecting an MCP Client to n8n

n8n has two MCP servers:

- The **instance-level MCP server** (Settings > Instance-level MCP, "Enable MCP
  access") serves the instance's workflows to MCP clients such as Claude's
  official n8n connector, Claude Code, Cursor, and ChatGPT. Its URL ends in
  `/mcp-server/http`.
- An **MCP Server Trigger** node is a workflow-level server for one workflow's
  tools. Its URL is `/mcp/<path>`, and Claude reaches it only through "Add
  custom connector".

When a user wants to connect Claude or another MCP client to n8n and has not
said which, reply with one `ask-user` question first: Claude's official n8n
connector from the Connectors Directory, or a custom connector for a
workflow-level MCP server. Do not explain both options, quote an endpoint, or
build anything until they answer. For the official connector, direct them to
Settings > Instance-level MCP and its `/mcp-server/http` URL, never a `/mcp/...`
workflow URL.

## Missing Docs

If docs lookup fails, say that current docs could not be loaded. Provide only
generic n8n UI guidance that is visible from the product context, and avoid
claiming provider-specific setup steps without docs evidence.
