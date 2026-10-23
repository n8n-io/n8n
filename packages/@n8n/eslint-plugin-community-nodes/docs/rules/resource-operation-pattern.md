# Enforce proper resource/operation pattern for better UX in n8n nodes (`@n8n/community-nodes/resource-operation-pattern`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

This rule checks the resources and operations of a node.

### Resources for many operations

Reports an error when a node has more than 5 operations without resources. Use resources to group related operations. This pattern makes complex nodes easier to navigate.

When you have many operations, users benefit from having them organized into logical resource groups (e.g., "User", "Project", "File") rather than seeing a long flat list of operations.

### Examples

#### ❌ Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Service',
    name: 'myService',
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Get User', value: 'getUser' },
          { name: 'Create User', value: 'createUser' },
          { name: 'Update User', value: 'updateUser' },
          { name: 'Delete User', value: 'deleteUser' },
          { name: 'Get Project', value: 'getProject' },
          { name: 'Create Project', value: 'createProject' },
          { name: 'List Files', value: 'listFiles' },
          // 7+ operations without resources - hard to navigate!
        ],
      },
      // ... other properties
    ],
  };
}
```

#### ✅ Correct

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Service',
    name: 'myService',
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        options: [
          { name: 'User', value: 'user' },
          { name: 'Project', value: 'project' },
          { name: 'File', value: 'file' },
        ],
        default: 'user',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['user'],
          },
        },
        options: [
          { name: 'Get', value: 'get' },
          { name: 'Create', value: 'create' },
          { name: 'Update', value: 'update' },
          { name: 'Delete', value: 'delete' },
        ],
        default: 'get',
      },
      // ... similar operation blocks for 'project' and 'file' resources
    ],
  };
}
```

### "Get many" actions

The [UX guidelines for community nodes](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/ux-guidelines) use one wording for the operation that lists items. Its name is "Get Many" and its action starts with "Get many", for example "Get many contacts". Users see the action when they add a node, so the same words make operations easy to find.

The rule checks the action of every operation with the value `getAll`. `n8n-nodes-base/node-param-option-name-wrong-for-get-many` checks the name. `n8n-nodes-base/node-param-operation-option-action-wrong-for-get-many` reports and fixes actions that start with "Get all", so this check skips them.

This check finds the operation parameter by its shape. It also checks operations in description files outside the node class.

### Examples

#### ❌ Incorrect

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

#### ✅ Correct

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
