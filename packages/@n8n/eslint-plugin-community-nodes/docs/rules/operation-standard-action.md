# Require the actions of the "getAll" and "upsert" operations to start with their standard names, like "Get many" and "Create or update" (`@n8n/community-nodes/operation-standard-action`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

The [UX guidelines for community nodes](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/ux-guidelines) give standard names to some operations. Users see the action when they add a node, so the same words make operations easy to find.

The rule uses the operation `value` to find the standard name, because `value` is the stable ID of the operation:

| `value` | The action starts with |
| --- | --- |
| `getAll` | "Get many", for example "Get many contacts" |
| `upsert` | "Create or update", or "Insert or update" or "Append or update" for databases and spreadsheets |

`n8n-nodes-base/node-param-operation-option-action-wrong-for-get-many` reports and fixes `getAll` actions that start with "Get all", so this rule skips them. `n8n-nodes-base/node-param-operation-option-action-miscased` checks the case, so this rule ignores it.

The rule finds the operation parameter by its shape. It also checks operations in description files outside the node class.

Change only `action`. Keep `value` as it is: saved workflows store it, so changing it breaks them.

## Examples

### ❌ Incorrect

```typescript
export const contactOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: { show: { resource: ['contact'] } },
    options: [
      { name: 'Get Many', value: 'getAll', action: 'List contacts' },
      { name: 'Upsert', value: 'upsert', action: 'Upsert contact' },
    ],
    default: 'getAll',
  },
];
```

### ✅ Correct

```typescript
export const contactOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: { show: { resource: ['contact'] } },
    options: [
      { name: 'Get Many', value: 'getAll', action: 'Get many contacts' },
      { name: 'Create or Update', value: 'upsert', action: 'Create or update contact' },
    ],
    default: 'getAll',
  },
];
```
