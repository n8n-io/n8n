# Node class description must not use the n8n core color (`@n8n/community-nodes/node-class-description-non-core-color`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

The n8n core color `#FF6D5A` is reserved for built-in nodes. Community nodes
should pick their own color so they stay visually distinguishable from n8n's
own nodes. This rule flags `description.defaults.color` and top-level
`description.color` when they equal the core color (case-insensitive). Any
other color is allowed — community nodes are free to use their own branding.

## Examples

### ❌ Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    defaults: { name: 'My Node', color: '#FF6D5A' },
    // ...
  };
}
```

### ✅ Correct

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    defaults: { name: 'My Node', color: '#1A82E2' },
    // ...
  };
}
```
