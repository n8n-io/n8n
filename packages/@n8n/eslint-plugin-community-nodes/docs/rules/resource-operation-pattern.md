# Enforce proper resource/operation pattern for better UX in n8n nodes (`@n8n/community-nodes/resource-operation-pattern`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Warns when a node has more than 5 operations without organizing them into resources. The resource/operation pattern improves user experience by grouping related operations together, making complex nodes easier to navigate.

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
