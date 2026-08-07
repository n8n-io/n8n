# Encourage node and credential icons to provide light/dark variants instead of a single icon file (`@n8n/community-nodes/icon-prefer-themed-variants`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

n8n supports themed icons via the `{ light, dark }` object form, and the
marketplace/preview UI renders both variants for nodes that aren't installed yet.
A single icon file often renders poorly on one of the two themes (for example, a
dark glyph on a dark background).

This rule warns when a node or credential defines its icon as a single file
string instead of the themed `{ light, dark }` object. It is a **warning**, not
an error: most existing nodes ship a single icon, so this nudges authors toward
themed variants without failing verification.

The companion `icon-validation` rule still validates that the referenced files
exist, use the `file:` protocol, and that the light and dark variants point to
different files.

## Examples

### ❌ Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    icon: 'file:icons/my-icon.svg', // Single file — renders poorly on one theme
    // ...
  };
}
```

```typescript
export class MyApi implements ICredentialType {
  name = 'myApi';
  displayName = 'My API';
  icon = 'file:icons/my-icon.svg'; // Single file
}
```

### ✅ Correct

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    icon: {
      light: 'file:icons/my-icon.light.svg',
      dark: 'file:icons/my-icon.dark.svg',
    },
    // ...
  };
}
```

```typescript
export class MyApi implements ICredentialType {
  name = 'myApi';
  displayName = 'My API';
  icon = {
    light: 'file:icons/my-icon.light.svg',
    dark: 'file:icons/my-icon.dark.svg',
  };
}
```
