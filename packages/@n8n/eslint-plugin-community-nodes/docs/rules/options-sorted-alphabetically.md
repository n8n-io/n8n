# Enforce alphabetical ordering of options arrays in n8n node properties (`@n8n/community-nodes/options-sorted-alphabetically`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Warns when an `options`-type parameter has its options array not sorted alphabetically by name. Applies to all `type: 'options'` parameters — including `resource`, `operation`, and any other dropdowns.

Alphabetical ordering is an [official n8n UI design requirement](https://docs.n8n.io/integrations/creating-nodes/plan/node-ui-design/#lists) and the most frequently flagged issue in community node reviews.

Comparison is case-insensitive and locale-aware (handles non-ASCII names such as Spanish or Portuguese labels).

## Examples

### ❌ Incorrect

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
          { name: 'Contact', value: 'contact' }, // out of order
          { name: 'Project', value: 'project' },
        ],
        default: 'user',
      },
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
          { name: 'Contact', value: 'contact' },
          { name: 'Project', value: 'project' },
          { name: 'User', value: 'user' },
        ],
        default: 'contact',
      },
    ],
  };
}
```
