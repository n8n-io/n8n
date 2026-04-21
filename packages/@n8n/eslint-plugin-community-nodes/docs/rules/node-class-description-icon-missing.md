# Node class description must have an `icon` property defined (`@n8n/community-nodes/node-class-description-icon-missing`)

❌ This rule is **deprecated**. Use [`require-node-description-fields`](require-node-description-fields.md) instead.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## Rule Details

Validates that node classes define an `icon` property in their `description` object. Icons are required for nodes to display correctly in the n8n editor.

## Examples

### ❌ Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    // Missing icon property
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
    // ...
  };
}
```

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    icon: {
      light: 'file:myNode.svg',
      dark: 'file:myNode.dark.svg',
    },
    // ...
  };
}
```
