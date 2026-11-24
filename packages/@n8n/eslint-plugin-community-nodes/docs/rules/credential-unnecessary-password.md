# Warn when a credential field with no sensitive name uses typeOptions.password = true (`@n8n/community-nodes/credential-unnecessary-password`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

This is the inverse of [`credential-password-field`](credential-password-field.md). A field that clearly does not hold a secret — URLs, IDs, regions, and similar — should not be masked with `typeOptions.password = true`, since masking a non-secret value only hurts usability.

The check only flags a masked field when its name carries **no** sensitive marker at all (`password`, `secret`, `token`, `cert`, `key`-like words, …). A name that contains a sensitive marker is left alone even if it also looks like a URL or ID — for example `androidToken` is a real secret despite containing the substring `id`, so it is never flagged.

It is reported as a **warning without an autofix**: the sensitivity check is a name-based heuristic, so removing masking could be wrong for a secret whose name isn't in the recognised list. The author must confirm before removing it.

## Examples

### ❌ Incorrect

```typescript
export class MyApiCredential implements ICredentialType {
  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: '',
      typeOptions: { password: true }, // A URL is not a secret
    },
  ];
}
```

### ✅ Correct

```typescript
export class MyApiCredential implements ICredentialType {
  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: '',
    },
  ];
}
```
