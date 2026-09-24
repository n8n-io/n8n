# Enforce proper resource/operation pattern for better UX in n8n nodes (`@n8n/community-nodes/resource-operation-pattern`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Warns when a regular node has no operation action. An action makes the node visible in node search and usable by AI. Even a node with one action needs an Operation. The Resource field is optional when the node has one resource.

Warns when a node has more than 5 operations without organizing them into resources. Group related operations to make complex nodes easier to navigate.

When you have many operations, users benefit from having them organized into logical resource groups (e.g., "User", "Project", "File") rather than seeing a long flat list of operations.

## Examples

### ❌ Incorrect

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
          { name: 'Get User', value: 'getUser', action: 'Get a user' },
          { name: 'Create User', value: 'createUser', action: 'Create a user' },
          { name: 'Update User', value: 'updateUser', action: 'Update a user' },
          { name: 'Delete User', value: 'deleteUser', action: 'Delete a user' },
          { name: 'Get Project', value: 'getProject', action: 'Get a project' },
          { name: 'Create Project', value: 'createProject', action: 'Create a project' },
          { name: 'List Files', value: 'listFiles', action: 'List files' },
          // 7+ operations without resources - hard to navigate!
        ],
      },
      // ... other properties
    ],
  };
}
```

### ✅ Correct

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
          { name: 'Get', value: 'get', action: 'Get a user' },
          { name: 'Create', value: 'create', action: 'Create a user' },
          { name: 'Update', value: 'update', action: 'Update a user' },
          { name: 'Delete', value: 'delete', action: 'Delete a user' },
        ],
        default: 'get',
      },
      // ... similar operation blocks for 'project' and 'file' resources
    ],
  };
}
```

For a node with one resource, omit the Resource field. Keep the Operation field and set `action` on its option.
