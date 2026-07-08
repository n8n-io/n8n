# Node Configuration

- Fetch `nodes(action="type-definition")` before configuring nodes. Generated
  definitions and `@builderHint` annotations are the source of truth.
- **Webhook trigger setup is node-defined — inspect the node, and don't trust
  generic docs for it.** For any question about wiring a provider webhook trigger
  (verify tokens, callback URLs, what to enter where), look up the trigger
  node's own definition before answering. Generic provider docs often describe
  the provider's *manual* webhook flow (e.g. "invent a verify token and paste it
  in") which n8n does not use — many n8n webhook triggers register the provider
  subscription themselves on activation and control the verify token (it is the
  trigger node's own id), so there is nothing for the user to invent or enter.
  If docs and the node definition disagree, the node definition wins.
- Use live `nodes(action="explore-resources")` for resource locator, list, and
  model fields when credentials are available.
- If a configuration is unclear after reading the definition, ask for
  clarification or use placeholders. Do not guess.
- Pay attention to `@builderHint` annotations in search results and type
  definitions. They contain node-specific configuration rules and examples.
- Gmail archive: the message resource has no `archive` operation. To archive a
  Gmail message, remove the `INBOX` label with `operation: 'removeLabels'` and
  `labelIds: ['INBOX']`; do not add an invented `ARCHIVE` label.

## AI agent tool naming

Always set an explicit `config.name` on every `tool(...)` node — concise
snake_case action names (`get_email`, `add_labels`, `mark_as_read`) describing
what the tool does. Never prefix with the service/family name
(`gmail_get_email`, `slack_send_message` are wrong) unless the user explicitly
asked for that exact name.
