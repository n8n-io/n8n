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

Use `displayOptions` to show/hide fields based on other parameters. Use `noDataExpression: true` for resource/operation selectors.

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
credential **in the same release** — either in this package or in
`@n8n/n8n-nodes-langchain`, the two packages n8n loads. Otherwise the instance
logs `Failed to load Custom API options for the node "...": Unknown credential
name "..."` on every boot and the node cannot authenticate.

This bites when a node is split across PRs (e.g. a hidden shell first, then
operations): a release can be cut between the PR that references the credential
and the PR that adds it. Register the credential in, or before, the PR that
first references it. `packages/cli/test/unit/node-credential-references.test.ts`
gates this.

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
