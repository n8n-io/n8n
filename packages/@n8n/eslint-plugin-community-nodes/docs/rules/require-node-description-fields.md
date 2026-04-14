# Node class description must define all required fields (`@n8n/community-nodes/require-node-description-fields`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Enforces that community node class descriptions include fields that are optional in the TypeScript interface but required by community node review standards.

This rule supersedes `node-class-description-icon-missing`, which only checked for the `icon` field.

## Examples

### ❌ Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    icon: 'file:myNode.svg',
    group: ['transform'],
    version: 1,
    description: 'My node description',
    // Missing subtitle
  };
}
```

### ✅ Correct

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    icon: 'file:myNode.svg',
    group: ['transform'],
    version: 1,
    description: 'My node description',
    subtitle: '={{$parameter["operation"]}}',
    // ...
  };
}
```
