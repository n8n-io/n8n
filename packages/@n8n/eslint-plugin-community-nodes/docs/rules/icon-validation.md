# Validate node and credential icon files exist and use the file: protocol (`@n8n/community-nodes/icon-validation`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## Rule Details

Validates that your node and credential icon files exist and use the correct `file:` protocol. The `light` and `dark` slots can point to the same file: one theme-agnostic icon is a valid choice, and you do not have to copy it under a second filename.

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

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    icon: {
      light: 'file:icons/my-service.svg',
      dark: 'file:icons/my-service.svg', // One file that works on both themes
    },
    // ...
  };
}
```
