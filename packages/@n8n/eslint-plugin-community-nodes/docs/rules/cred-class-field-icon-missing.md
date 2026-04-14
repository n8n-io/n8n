# Credential class must have an `icon` property defined (`@n8n/community-nodes/cred-class-field-icon-missing`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## Rule Details

Validates that credential classes define an `icon` class field. Icons are required for credentials to display correctly in the n8n editor.

## Examples

### ❌ Incorrect

```typescript
export class MyServiceApi implements ICredentialType {
  name = 'myServiceApi';
  displayName = 'My Service API';
  // Missing icon property

  properties: INodeProperties[] = [];
}
```

### ✅ Correct

```typescript
export class MyServiceApi implements ICredentialType {
  name = 'myServiceApi';
  displayName = 'My Service API';
  icon = 'file:myService.svg' as const;

  properties: INodeProperties[] = [];
}
```

```typescript
export class MyServiceApi implements ICredentialType {
  name = 'myServiceApi';
  displayName = 'My Service API';
  icon = { light: 'file:myService.svg', dark: 'file:myService.dark.svg' } as const;

  properties: INodeProperties[] = [];
}
```
