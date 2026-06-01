# Credential `name` field must end with `Api` and start with a lowercase letter (`@n8n/community-nodes/cred-class-name-field-conventions`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

The `name` field of a credential class (those implementing `ICredentialType` in `*.credentials.ts` files) is the internal identifier referenced by nodes and stored in the credential registry. n8n convention requires this identifier to:

- End with `Api` (e.g. `githubApi`), so credentials are easily recognisable across the codebase.
- Start with a lowercase letter (camelCase), since it is an identifier value rather than a class name.

Both checks are automatically fixable.

## Examples

### ❌ Incorrect

```typescript
export class GithubApi implements ICredentialType {
  name = 'Github';
  displayName = 'GitHub API';
  properties: INodeProperties[] = [];
}
```

### ✅ Correct

```typescript
export class GithubApi implements ICredentialType {
  name = 'githubApi';
  displayName = 'GitHub API';
  properties: INodeProperties[] = [];
}
```
