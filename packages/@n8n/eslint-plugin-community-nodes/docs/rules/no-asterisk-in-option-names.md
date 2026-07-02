# Disallow asterisk characters in node option name values (`@n8n/community-nodes/no-asterisk-in-option-names`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## Rule Details

The `name` of each entry in an `options` array is rendered directly in the n8n
editor. An asterisk (`*`) in these labels renders ambiguously — it reads like a
markdown bullet or emphasis marker rather than literal text. This rule flags any
option `name` containing `*` and suggests replacing it with bracketed notation
such as `[All]`.

The rule only inspects `name` values inside `options` arrays (including nested
`collection` and `fixedCollection` options); asterisks elsewhere are not
reported.

## Examples

### Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        options: [{ name: '* All', value: 'all' }],
        default: 'all',
      },
    ],
  };
}
```

### Correct

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        options: [{ name: '[All]', value: 'all' }],
        default: 'all',
      },
    ],
  };
}
```
