# Validate node and credential icon files exist, use the file: protocol, and that light/dark icons are different (`@n8n/community-nodes/icon-validation`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## Rule Details

Validates that your node and credential icon files exist and use the correct `file:` protocol. Icons must be different files when providing light/dark theme variants.

Both SVG and PNG icons are accepted. SVG is recommended (it scales cleanly and supports theming), but PNG is allowed — see the `icon-prefer-themed-variants` rule for the related light/dark nudge.

## Examples

### ❌ Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    icon: 'icons/my-icon.svg', // Missing 'file:' prefix
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
      light: 'file:icons/my-icon.svg',
      dark: 'file:icons/my-icon.svg', // Same file for both themes
    },
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
    icon: 'file:icons/my-service.svg', // Correct format
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
      light: 'file:icons/my-service-light.svg',
      dark: 'file:icons/my-service-dark.svg', // Different files
    },
    // ...
  };
}
```
