# Disallow emoji characters in node option name and displayName values (`@n8n/community-nodes/no-emoji-in-options`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

User-facing labels in a node — the node's `displayName`, each property's
`displayName`, and the `name` of entries in `options` arrays — are rendered
directly in the n8n editor. Emoji in these labels render inconsistently across
platforms, break alphabetical sorting and search, and clash with the editor's
visual language. This rule flags any emoji character (pictographs such as 🚀 or
✅, and regional-indicator flag emoji such as 🇺🇸) found in a `name` or
`displayName` string within a node's `description`.

Accented and non-Latin characters (e.g. `Café`, `日本語`) are allowed — only
emoji are reported.

## Examples

### Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: '🚀 My Node',
    name: 'myNode',
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [{ name: '✅ Create', value: 'create' }],
        default: 'create',
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
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [{ name: 'Create', value: 'create' }],
        default: 'create',
      },
    ],
  };
}
```
