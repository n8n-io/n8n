# @n8n/n8n-node-codegen

Generates version 2 of the [n8n node](../../nodes-base/nodes/N8n) from the
public API spec.

## Why

The n8n node calls the public API of an n8n instance. Version 1 is written
manually, and it falls behind the API. Version 2 comes from the spec, so a new
public API endpoint gets into the node with no manual node code.

## Commands

| Command | What it does |
|---------|--------------|
| `pnpm --filter @n8n/n8n-node-codegen generate` | Prints the operations of the node and writes `properties.generated.ts`. When the file is up to date, it does not change the file. |
| `pnpm --filter @n8n/n8n-node-codegen generate --check` | Fails when `properties.generated.ts` is out of date, and names the new and the removed operations. It does not write the file. |
| `pnpm --filter @n8n/n8n-node-codegen generate --check --base <file>` | Runs `generate --check`, and also fails when your changes break saved workflows. See [Check for breaking changes](#check-for-breaking-changes). |
| `pnpm --filter @n8n/n8n-node-codegen test` | Runs the tests. |

The `generate` commands fail when the node has errors, and then they do not
write the file. Do not edit `properties.generated.ts` manually.

## How it works

```mermaid
flowchart LR
  envelope["cli: openapi.yml<br/>tags and groups"] --> generator
  routes["cli: openapi.decorator-routes.generated.yml"] -->|redocly bundle| bundle["dist/routes.yml"] --> generator
  overrides["nodes-base: nodes/N8n/v2/overrides.ts"] --> generator
  generator --> report["operations of the node"]
  generator --> properties["nodes-base: nodes/N8n/v2/generated/properties.generated.ts"]
```

- `packages/cli/src/public-api/v1/openapi.yml` gives the tags, their display
  names, and their groups.
- `packages/cli/src/public-api/v1/openapi.decorator-routes.generated.yml` gives
  the operations. The `generate` script bundle it with Redocly into `dist/routes.yml`.
- `packages/nodes-base/nodes/N8n/v2/overrides.ts` gives the decisions about the node.
  It has one entry for each `operationId` that needs a decision. An entry can have:
  - `exclude`: the reason why the operation is not in the node.
  - `flatten`: the list that the operation sends with one item. See
    [Send one item of a list](#send-one-item-of-a-list).
  - `fields`: changes to the fields of the operation. See
    [Change a field](#change-a-field).
  - `default: true`: the operation is the default operation of its resource.

  The entry `'*'` has only `fields`. These fields apply to all operations.
  The file also exports `defaultResource`, the default resource of the node.
  See [Defaults](#defaults).

The generator makes these parts of the node:

| Spec | Node |
|------|------|
| Tag `Executions` | Resource `execution`, with the display name `Execution`. The generator makes the tag name and `x-displayName` singular |
| `operationId` | Operation ID |
| `summary` | Operation name in title case, and the action as it is. A deprecated operation gets ` (deprecated)` |
| Parameter name | Field name. The display name is the parameter name in title case, for example `workflowVersionId` gives `Workflow Version ID` |
| Parameter description | Field description, as it is in the spec |
| Required parameter | Required field |
| Optional parameter | Field in the `Options` collection. The node sends it only when the user adds it |
| Path parameter | Part of the URL, through `toPathSegment`. A number path parameter, for example `executionId`, becomes a string field with an empty default |
| `cursor` query parameter | `Return All` field. When it is off, `limit` sets the number of items, from 1. The node does not show `offset` |
| Successful response without a body | The node returns `{ "success": true }` |

The schema of a parameter gives the type and the default of its field. If the
schema has no default, a number gets its `minimum`, or `0` without a
`minimum`. Other fields get an empty value. A string enum becomes a dropdown,
except the enum `"true"`/`"false"`, which becomes a boolean. An object or an
array becomes a JSON field.
The tests in `src/__tests__/build-properties.test.ts` show each rule.

### Add an operation to the node

1. Remove `exclude` from the entry of the operation in
   `packages/nodes-base/nodes/N8n/v2/overrides.ts`. If the entry has no other
   keys, remove the entry.
2. Run `generate`. If it shows errors, correct them. See [Errors](#errors).
3. If the operation sends a request in a way that no workflow test covers, for
   example the first flattened list or the first empty response, add one test
   to `packages/nodes-base/nodes/N8n/test/v2/node/N8nV2.test.ts`.
4. Commit `overrides.ts` and `properties.generated.ts` together.

To keep an operation out of the node, give its entry `exclude` with a reason.

### Send one item of a list

Some operations take a list of objects, but in a workflow each item is one
action. For example, `addUsersToProject` takes `relations`, a list of users and
roles. With `addUsersToProject: { flatten: 'relations' }`, the fields of one
list item (`userId` and `role`) become fields of the node. The node sends a
list with one item. To add two users, give the node two input items.

Flatten only a list of independent actions. Do not flatten a list that sets the
full new state, for example the tags of a workflow.

### Defaults

A saved workflow does not store the resource and the operation when they are
equal to the default. The order of the list does not set the default:
`defaultResource` sets the default resource, and `default: true` sets the
default operation of a resource. Each resource in the node needs one operation
with `default: true`. Without them, `generate` fails. Choose the defaults
before the first release, and do not change them after it.

### Change a field

`fields` maps a parameter name to node field properties. The generator puts
these properties over the field that it makes from the spec.

```ts
export const overrides = {
	'*': { fields: { workflowId: workflowIdLocator } },
	getWorkflow: { fields: { workflowId: { ...workflowIdLocator, description: 'Workflow to get' } } },
	stopManyExecutions: { fields: { workflowId: { type: 'string' } } },
};
```

- A field in `'*'` applies to each operation with a parameter of that name.
- A field in the entry of an operation replaces the field from `'*'`. It does
  not add to it. To change one property of the `'*'` field, spread the `'*'`
  field into the new field.
- `{ type: 'string' }` in an entry gives the field from the spec without the
  `'*'` change.
- Do not set `name`, `displayOptions`, `required`, or `routing`. The generator
  sets them.
- A resource locator on a path parameter gets the request URL, so that the URL
  mode sends the ID. An operation can have one resource locator in its path.
  The list mode needs its search method in `methods.listSearch` of the node.

## Limits

### Errors

The generator stops and shows an error when it cannot build the node. Each
error tells you what to do. The most frequent error is an operation with a
blocker:

- `no summary`: the operation has no `summary`.
- `parameter name "…"`: a required parameter has the name of a node field
  (`resource`, `operation`, `returnAll`, or `options`).
- `header parameter "…"`: the operation has a header parameter.
- `… request body`: the request body is not JSON.
- `… response`: the successful response is not JSON.

To continue, add the operation to `exclude` with a reason, or add support to
the generator.

The generator also stops when it cannot read the spec, for example when an
operation has two tags or two operations have the same `operationId`.
`exclude` does not help here. Correct the spec.

### Breaking changes

A saved workflow stores the resource ID, the operation ID, and the field values
under the field names. It does not store a value that is equal to the default.
A change that alters one of these breaks the saved workflows.

These rules apply only to the operations in the node. You can change an
operation in `exclude` as necessary. Correct the spec of an operation before
you add it to the node.

| Change in the spec or in `overrides.ts` | Result in a saved workflow |
|------------------------------------------|----------------------------|
| Rename an `operationId` | The node cannot find the operation. |
| Rename a tag, or move an operation to another tag | The node cannot find the resource. |
| Rename a parameter | The field loses its value. |
| Make a required parameter optional, or the opposite | The field moves into or out of `Options` and loses its value. |
| Add a required parameter | The new field is empty. |
| Change the type of a parameter, or remove an enum value | The saved value does not fit the field. |
| Change the `default` of a field outside `Options`, or its `minimum` when it has no `default` | A workflow that kept the default gets the new value. A field in `Options` keeps its value. |
| Add or remove the `cursor` parameter | `Return All` appears or disappears, and `limit` moves. |
| Add a body to an empty response, or the opposite | The node returns different data. |
| Add an operation to `flatten`, or remove it | The fields of the operation change. |
| Change `defaultResource`, or move `default: true` to another operation | A workflow that kept the default gets another resource or operation. |
| Add, change, or remove a field in `fields` or in `'*'` | The type, the default, or the stored format of the field can change. |
| Remove an operation from the node or from the spec | The node cannot find the operation. |

These changes are safe:

- Change a `summary`, an `x-displayName`, or a description.
- Mark an operation or a parameter as deprecated.
- Add an optional parameter (but not `limit` next to `cursor`), or an enum value.
- Add an operation to the node.

A change in the generator can also break the saved workflows, for example a new
rule for defaults or an update of `pluralize`.

To make a breaking change, do not change the old operation or parameter. Add a
new one, and mark the old one as deprecated. For example, `publishWorkflow`
replaces `activateWorkflow`. If you cannot keep the old one, the node needs a
new version.

### Check for breaking changes

Run `generate --check --base <file>` to find out if your changes break saved
workflows. The check compares the node with the node in `<file>`, for example
with `properties.generated.ts` on master. It fails on the changes from the
table above. The path is relative to `packages/@n8n/n8n-node-codegen`.

To compare with master, save `properties.generated.ts` from the commit where
your branch starts from master, and give this file to the check. Run these
commands from the repository root:

```bash
mkdir -p packages/@n8n/n8n-node-codegen/dist
git show "$(git merge-base HEAD origin/master)":packages/nodes-base/nodes/N8n/v2/generated/properties.generated.ts > packages/@n8n/n8n-node-codegen/dist/base.ts
pnpm --filter @n8n/n8n-node-codegen generate --check --base dist/base.ts
```

### Other limits

- The generator writes one version of the node.
- The texts of the node come from the spec: the field names come from the
  parameter names, and the operation names come from the `summary`.
- To change a text in the node, prefer a change in the spec to an entry in
  `overrides.ts`. A change in the spec also corrects the API docs, and a text
  change does not change the API. Use `fields` when the node needs a different
  field, for example a resource locator, or a text that only the node needs.
- The node lint checks the texts in `properties.generated.ts`. If it reports a
  text, correct the text in the spec. For example, a description with one
  sentence must not end with a period, and `id` must be `ID`. If the text
  contains code, for example the field `id`, change the words around the code,
  or give the node its own text in `fields`.

### Test version 2 locally

The editor does not show version 2 yet. To test it on your computer:

1. In `packages/nodes-base/nodes/N8n/N8n.node.ts`, uncomment the import of
   `N8nV2` and the line `2: new N8nV2(baseDescription)`. Set `defaultVersion`
   to `2`.
2. Remove `exclude` from the entries of the operations that you want to test,
   and run `generate`.
3. Build `n8n-nodes-base` and start n8n:

   ```bash
   pnpm --filter n8n-nodes-base build
   pnpm start
   ```

4. Add the n8n node to a workflow. The editor adds it with version 2.

Do not commit these changes.
