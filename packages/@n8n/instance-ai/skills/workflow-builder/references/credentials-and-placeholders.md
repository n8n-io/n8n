# Credentials and Placeholders

## Placeholders

Use `placeholder('descriptive hint')` for values that cannot be safely picked
without the user:

- User-provided values that cannot be discovered, such as email recipients,
  phone numbers, custom URLs, notification targets, or chat IDs.
- Resource IDs with more than one candidate when
  `nodes(action="explore-resources")` returns multiple matches and the user did
  not name a specific one.

Never hardcode fake values like `user@example.com`, `YOUR_API_KEY`, bearer
tokens, Slack channel IDs, Telegram chat IDs, or sample recipient lists. After
the build, `workflows(action="setup")` opens an inline setup card in the AI
Assistant panel so the user can fill placeholder values.

Do not replace concrete user-provided or discoverable values with placeholders.
If the prompt gives a real URL, channel name, table name, label, folder,
database, or other literal selector, preserve that value and only use a
placeholder for the unknown part.

Use `placeholder('hint')` directly as the parameter value. Do not wrap
placeholders in `expr()`, objects, or arrays unless the node definition
explicitly expects an object and the placeholder is the direct value of one
field.

## Resource locators

For unresolved resource-locator fields (values shaped like `{ __rl: true,
mode, value }`, such as Slack channel selectors), use the resource-locator
object shape instead of a raw `placeholder()` string. Pick the mode per the
resource-locator rule in workflow-control-flow: a `name`/`url` mode with the
known value when the locator offers one and you know the resource by name;
otherwise id mode with an empty value and a cached result name, for example
`{ __rl: true, mode: 'id', value: '',
cachedResultName: 'Select support channel to monitor' }`.

## Credential Rules

- Call `credentials(action="list")` early when the task touches external
  services. Note each credential's `id`, `name`, and `type`.
- When the list is empty or no credential matches the required type, use
  `newCredential('Suggested Credential Name')` for each required service and
  continue building. Do not ask the user to create or pick credentials first.
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
- Always declare `output` on nodes that use unresolved credentials when mock
  data is needed for verification.

## Missing Resources

When `nodes(action="explore-resources")` returns no results for a required
resource:

1. If the resource can be represented as a user choice, use
   `placeholder('Select <resource>')` and let setup collect it after the build.
2. If the user explicitly asked you to create the resource and the node type
   definition has a safe create operation, build and verify that
   resource-creation workflow as part of the requested work.
3. Otherwise, leave the main workflow as a saved draft and mention the missing
   resource in the one-line completion summary.

For resources that cannot be created via n8n, explain clearly what the user
needs to create manually and what ID or value belongs in setup.
