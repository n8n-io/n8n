# Credential class names must be suffixed with `Api` (`@n8n/community-nodes/cred-class-name-suffix`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

Credential classes (those implementing `ICredentialType` in `*.credentials.ts` files) must have a class name ending in `Api`. This is the n8n convention so credentials are easily recognisable in code, in import statements, and across the credential registry.

For OAuth2 credentials extending the OAuth2 base, see the sibling rule `cred-class-oauth2-naming` which enforces the more specific `OAuth2Api` suffix.

## Opt-out

For legitimate exceptions (for example credentials representing custom auth headers where the `Api` suffix would be misleading), disable the rule for the specific class with a standard ESLint comment:

```typescript
// eslint-disable-next-line @n8n/community-nodes/cred-class-name-suffix
export class CustomAuthHeader implements ICredentialType {
  // ...
}
```

## Examples

### ❌ Incorrect

```typescript
export class MyService implements ICredentialType {
  name = 'myServiceApi';
  displayName = 'My Service API';
  properties: INodeProperties[] = [];
}
```

### ✅ Correct

```typescript
export class MyServiceApi implements ICredentialType {
  name = 'myServiceApi';
  displayName = 'My Service API';
  properties: INodeProperties[] = [];
}
```
