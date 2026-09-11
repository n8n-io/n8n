# AGENTS.md

Guidance for node development in the nodes-base package.

## Node Structure

Every node implements the `INodeType` interface with:
- `description: INodeTypeDescription` - Node metadata and UI configuration
- `execute?()` - For programmatic nodes
- `poll?()` - For polling triggers (set `polling: true` in description)
- `trigger?()` - For generic triggers
- `webhook?()` - For webhook triggers
- `webhookMethods?` - Webhook lifecycle (checkExists, create, delete)
- `methods?` - loadOptions, listSearch, credentialTest, resourceMapping

## Node Types

Default to declarative for a new node, and pick programmatic only when the
integration actually needs it. See
[choose a node building style](https://docs.n8n.io/connect/create-nodes/plan-your-node/choose-a-node-building-style).

### Declarative Nodes
Use `requestDefaults` and `routing` on properties instead of `execute`. The
engine owns the item loop, `pairedItem`, and `continueOnFail`, and the loader
injects the `Request Options` node setting (batching, proxy, timeout, ignore SSL
issues), so core improvements reach the node without editing it. Example:
`nodes/Okta/Okta.node.ts`

### Programmatic Nodes
Use `execute` when the work needs multiple dependent API calls, control flow
across them, or heavy transformation of requests/responses. Example:
`nodes/Discord/v2/DiscordV2.node.ts`

### Trigger Nodes
- **Webhook triggers**: Implement `webhook` and `webhookMethods` (checkExists, create, delete). Example: `nodes/Microsoft/Teams/MicrosoftTeamsTrigger.node.ts`
- **Polling triggers**: Set `polling: true` and implement `poll`. Use `getWorkflowStaticData('node')` to persist state. Example: `nodes/Google/Gmail/GmailTrigger.node.ts`
- **Generic triggers**: Implement `trigger` function. Example: `nodes/MQTT/MqttTrigger.node.ts`

## Node Parameters

Common parameter types:
- `string` - Text input
- `options` - Dropdown (static or dynamic via `loadOptionsMethod`)
- `resourceLocator` - Select by list, ID, or URL
- `collection` - Key-value pairs
- `fixedCollection` - Structured collections

Use `displayOptions` to show/hide fields based on other parameters. Use
`noDataExpression: true` for resource/operation selectors only. On a value field
it removes the expression toggle, which takes away a field users legitimately
drive from upstream data.

### Reading parameters per item

`execute` runs once for the whole input, so every parameter read inside it needs
the current item's index. A shared helper that reads parameters therefore takes
a **required** `itemIndex`, placed before any defaulted parameters so call sites
need no positional padding:

```ts
// Wrong: execute call sites that omit the argument resolve every item at item 0
function resolveTarget(this: IExecuteFunctions, itemIndex = 0) { … }
```

In load-options and list-search context pass a literal `0`: there
`getNodeParameter`'s second argument is the fallback value, not an item index.
The `n8n-local-rules/no-defaulted-item-index` lint rule enforces this.

## Versioning

- **Light versioning**: Use version arrays in description: `version: [3, 3.1, 3.2]`
- **Full versioning**: Use `VersionedNodeType` class with separate version implementations. Example: `nodes/Set/Set.node.ts`

## Credentials

Credentials are defined in `credentials/` directory and implement `ICredentialType`:
- `name` - Internal identifier
- `displayName` - Human-readable name
- `properties` - Credential fields
- `authenticate` - Authentication configuration (generic or custom function)
- `test` - Credential test request

Nodes can test credentials via `methods.credentialTest`.

### Registration

Nodes and credentials are only loaded if they are listed in
`packages/nodes-base/package.json` (`n8n.nodes` / `n8n.credentials`).

A credential name in a node's `credentials` array must resolve to a registered
credential **in the same release**, either in this package or in
`@n8n/n8n-nodes-langchain`, the two packages n8n loads. Otherwise the instance
logs `Failed to load Custom API options for the node "...": Unknown credential
name "..."` on every boot and the node cannot authenticate.

This bites when a node is split across PRs (e.g. a hidden shell first, then
operations): a release can be cut between the PR that references the credential
and the PR that adds it. Register the credential in, or before, the PR that
first references it. `packages/cli/test/unit/node-credential-references.test.ts`
gates this.

### Scopes

Narrowing or removing an OAuth scope is a **breaking change**, even though it
looks like a one-line tightening. Existing credentials keep the token they were
issued, so the node starts failing for them and restoring the scope later does
not repair them: every affected user has to reconnect. Tighten scopes behind a
new node version, or ship the change with an explicit migration note.

## Testing

### Unit Tests
- Use `vitest-mock-extended` for mocking interfaces
- Use `nock` for HTTP mocking
- Mock all external dependencies
- Test happy paths, error handling, edge cases, and binary data

### Workflow Tests
- Use `NodeTestHarness` with JSON workflow definitions
- Mock external APIs with nock
- Use `pnpm test` for running tests. Example: `cd packages/nodes-base/ && pnpm test TestFileName`

### What mocked requests do and don't prove

A nock assertion locks in the request you already built. It cannot tell you the
API accepts it, and it passes just as happily when the URL is wrong, so a green
suite is not evidence that a new request shape works. Verify a new query, path
or filter against the live API first, then mock it to keep it from drifting.
Where operations differ per credential type (delegated vs app-only), verify each
one: the working path for one is often rejected for the other.

## Common Development Tasks

### Creating a New Node
1. Create directory: `nodes/YourService/`
2. Create `YourService.node.ts` implementing `INodeType`
3. Add icon SVG files in node directory
4. Define credentials in `credentials/` if needed
5. Write tests following testing guidelines
6. Register the node and any new credential in `package.json` (see Registration
   under Credentials)

### Adding Dynamic Options
Add `loadOptionsMethod` to parameter's `typeOptions` and implement method in `methods.loadOptions`.

An option loader must let the API error reach the user: an empty list has to mean
the account has nothing, not that the request failed. Watch for the two ways this
breaks in practice, a retry loop whose exit condition skips its own `throw`, and
a caught error rethrown without the API's message. Cover it with a test that a
failing request surfaces as an error rather than an empty list. Do not reach for
`retry()` from `@n8n/utils` here: it resolves to a boolean and swallows the
error, which is exactly the failure mode to avoid.

### Adding Resource Locator
Change parameter type to `'resourceLocator'`, define modes (list, id, url), add `searchListMethod` for list mode, add `extractValue` regex for URL mode.

## Best Practices

### TypeScript
- Never use `any` type - use proper types or `unknown`
- Avoid type casting with `as` - use type guards instead
- Define interfaces for API responses

### Error Handling
- Use `NodeOperationError` for user-facing errors
- Use `NodeApiError` for API-related errors
- Support `continueOnFail` option when appropriate

### Security

User input is untrusted. In nodes it arrives mainly through
`this.getNodeParameter(...)` (and incoming `item.json`), and a workflow author
controls these values.

**Never use an untrusted value as a computed object key in an assignment.** A
value such as `__proto__`, `constructor`, or `prototype` pollutes the prototype
chain:

```ts
// UNSAFE — `table`/`key` come from this.getNodeParameter(...)
if (acc[table] === undefined) acc[table] = {};
acc[table][key] = value;
```

Route dynamic-key writes through the `n8n-workflow` helpers, or build the
accumulator as a `Map` / `Object.create(null)`:

```ts
import { setSafeObjectProperty, isSafeObjectProperty } from 'n8n-workflow';

if (isSafeObjectProperty(table) && acc[table] === undefined) {
	setSafeObjectProperty(acc, table, {});
}
```

This only applies to dynamic-key **writes** (grouping/aggregating rows by a
user-chosen column is the common case). Reads like `const x = obj[key]` are
safe. Reference usage: `nodes/Google/GSuiteAdmin/GSuiteAdmin.node.ts`.

### Code Organization
- Separate operation/field descriptions into separate files
- Create reusable API request helpers in GenericFunctions
- Use kebab-case for files, PascalCase for classes

### UI/UX
- Use clear `displayName` and `description` fields
- Set sensible default values
- Use `displayOptions` to show/hide fields conditionally

## Example Nodes

- Declarative: `nodes/Okta/Okta.node.ts`
- Programmatic: `nodes/Discord/v2/DiscordV2.node.ts`
- Webhook Trigger: `nodes/Microsoft/Teams/MicrosoftTeamsTrigger.node.ts`
- Polling Trigger: `nodes/Google/Gmail/GmailTrigger.node.ts`
- Generic Trigger: `nodes/MQTT/MqttTrigger.node.ts`
- Versioned: `nodes/Set/Set.node.ts`
