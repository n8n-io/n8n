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

### Programmatic Nodes
Use `execute` function for custom logic. Example: `nodes/Discord/v2/DiscordV2.node.ts`

### Declarative Nodes
Use `requestDefaults` and routing configuration instead of `execute`. Example: `nodes/Okta/Okta.node.ts`

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

### Keyset paging on a relational Select

A relational node that pages a read operation uses a keyset cursor, never `OFFSET`.
`OFFSET` counts from the start of the result on every call, so a table written to
while it is being paged shifts rows under the reader and a row can be skipped or
returned twice.

Use the helpers in `utils/sql-keyset-paging.ts`. MySQL's Select is the reference
to copy. Postgres still has older copies of its own, so do not copy from it.

- **Start After**, parameter name `startAfter`, a `fixedCollection` holding Column
  and Value. Shown when Return All is off. Gate on `'@version'` only if an older
  version outputs a column type differently, as Postgres does for DATE below 2.7.
  If you gate, put `'@version'` first in `show`: when a show value is an
  expression, n8n displays the field and skips every later key. The existing Limit
  is the page size.
- An empty Value is the first page: no predicate, Limit rows, ordered by Column.
  Empty text in Column looks the same, so when the Value is empty the node looks
  for a row holding empty text with an index lookup and stops with a
  `NodeOperationError`. Oracle stores empty text as NULL, so a NOT NULL column
  never has it and Oracle does not need the check.
- Column must appear in Output Columns, or Output Columns must be `*`, otherwise
  the next page has no value to resume from.
- A Value that is set adds `Column > :value` to the WHERE clause, bound through the
  engine's own parameter binding and never concatenated. The node's other conditions
  go in brackets before it, so an `OR` cannot match rows of an earlier page.
- Column is the first sort key. With no Sort rules the node sorts by Column
  ascending. A Sort rule before Column is rejected with a `NodeOperationError`,
  because it changes the order and pages then skip rows. Appending Column as the
  last key lost 800 of 1,000 rows on Postgres.
- If the first Sort rule is Column DESC, the comparison flips to `Column < :value`
  and the pages run from the biggest value down.
- Column must be unique on its own and never null. A unique index over more than one
  column, with a WHERE condition, or on an expression does not count. Anything else
  is rejected with a `NodeOperationError` naming the column: `>` on a repeated value
  drops the rows that share it, and a NULL never comes after a value.
- A column whose output value the node changes, by rounding, by time zone or by
  returning an object, is rejected, because the next Value would not match the
  stored value.

A node that cannot meet this shape records why in its own code rather than
inventing a second shape.

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
6. Register in `package.json` nodes array if needed

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
