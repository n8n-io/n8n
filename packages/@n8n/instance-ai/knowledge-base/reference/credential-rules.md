# Workflow builder credential rules

Rules for `newCredential()` and credential discovery in SDK builder code. Read
when the workflow touches external services.

- Call `credentials(action="list")` early when the task touches external
  services. Note each credential's `id`, `name`, and `type`.
- Use `newCredential('Credential Name', 'credential-id')` only when the user
  selected a specific existing credential, there is exactly one unambiguous
  matching credential, or the workflow already had that credential.
- If no exact credential was selected, more than one credential matches, or the
  service needs a new credential, use `newCredential('Suggested Credential
  Name')`. Build tools mock unresolved credentials for verification, and setup
  collects real credentials later.
- Never use raw credential objects like `{ id: '...', name: '...' }` in builder
  SDK code. When editing roundtripped code that contains raw credential objects,
  replace them with `newCredential()` calls.
- The credential key, such as `slackApi`, is the credential type from the node
  type definition.
- If a required credential type is not listed, call
  `credentials(action="search-types")` with the service name. Prefer dedicated
  credential types over generic auth. When generic auth is truly needed, prefer
  `httpBearerAuth` over `httpHeaderAuth`.
- Credential-selection guidance applies to outbound service calls. For inbound
  trigger nodes such as Webhook, Form Trigger, Chat Trigger, and MCP Trigger,
  keep authentication at its default `none` unless the user explicitly asks to
  authenticate inbound traffic.
- Always declare `output` on nodes that use unresolved credentials when mock data
  is needed for verification.

## Credential selection before building

Call `credentials(action="list")` first to know what's available. Build the
workflow immediately — the builder preserves explicit valid credentials and
auto-mocks missing or unselected ones. Do not ask whether to build now and set up
credentials later; building first and routing setup after verification is the
default path.

**Ask once when a service has multiple credentials of the same type.** If
`credentials(action="list")` shows more than one entry of the type a requested
integration needs (e.g. two `openAiApi` accounts, three Google Calendar
accounts), use `ask-user` with a single-select to let the user pick one before
building, and use the chosen credential name in the workflow code. Exception: the
user already named the credential in their message — use it directly. With a
single candidate, auto-apply and do not ask.

**Ask which auth type to use when a service supports more than one.**
`credentials(action="setup")` opens a picker locked to a single `credentialType`
— the user cannot switch auth types from there. So when
`credentials(action="search-types")` returns more than one auth option for a
service (e.g. `notionApi` and `notionOAuth2Api`, or `slackApi` and
`slackOAuth2Api`), use `ask-user` with a single-select to let the user pick the
auth type before calling `credentials(action="setup")`. List OAuth2 first and
present it as the recommended option. Exception: the user has clearly indicated
an auth type (e.g. "api key", "oauth", "personal token") — map it to the matching
`credentialType` and use it directly without asking.
