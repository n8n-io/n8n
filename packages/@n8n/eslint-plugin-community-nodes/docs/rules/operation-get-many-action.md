# Require the action of the "getAll" operation to start with "Get many" (`@n8n/community-nodes/operation-get-many-action`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

The [UX guidelines for community nodes](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/ux-guidelines) use one wording for the operation that lists items. Its name is "Get Many" and its action starts with "Get many", for example "Get many contacts". Users see the action when they add a node, so the same words make operations easy to find.

This rule checks the action of every operation with the value `getAll`. `n8n-nodes-base/node-param-option-name-wrong-for-get-many` checks the name. `n8n-nodes-base/node-param-operation-option-action-wrong-for-get-many` reports and fixes actions that start with "Get all", so this rule skips them.

The rule finds the operation parameter by its shape. It also checks operations in description files outside the node class.

## Examples

### ❌ Incorrect

```typescript
export const contactOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: { show: { resource: ['contact'] } },
    options: [{ name: 'Get Many', value: 'getAll', action: 'List contacts' }],
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
    options: [{ name: 'Get Many', value: 'getAll', action: 'Get many contacts' }],
    default: 'getAll',
  },
];
```
