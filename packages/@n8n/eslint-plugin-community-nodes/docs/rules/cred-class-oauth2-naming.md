# OAuth2 credentials must include `OAuth2` in the class name, `name`, and `displayName` (`@n8n/community-nodes/cred-class-oauth2-naming`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

OAuth2 credentials must consistently identify themselves as OAuth2 across all three naming surfaces. This makes them easy to distinguish from other auth flavours (API key, basic auth) in code, in import statements, and in the credentials picker.

A credential class is considered an OAuth2 credential if **any** of the following are true:

- The class name contains `OAuth2` (e.g. `GoogleOAuth2Api`).
- The class TypeScript-extends a base whose name contains `OAuth2` (e.g. `class GoogleOAuth2Api extends OAuth2Api`).
- The `extends` class field references an `OAuth2` credential (e.g. `extends = ['oAuth2Api']`).
- The `name` or `displayName` field contains `OAuth2`.

When a credential is detected as OAuth2, all of the following must contain `OAuth2`:

- Class name (must end with `OAuth2Api`).
- `name` class field.
- `displayName` class field.

The class name is auto-fixable; `name` and `displayName` must be updated manually because their casing convention varies.

## Examples

### ❌ Incorrect

```typescript
// Class name detected as OAuth2 but `name` and `displayName` lack OAuth2.
export class GoogleOAuth2Api implements ICredentialType {
	name = 'googleApi';
	displayName = 'Google API';
	properties: INodeProperties[] = [];
}
```

```typescript
// Extends OAuth2 base, but neither class name, `name`, nor `displayName` reflect that.
export class GoogleApi implements ICredentialType {
	name = 'googleApi';
	displayName = 'Google API';
	extends = ['oAuth2Api'];
	properties: INodeProperties[] = [];
}
```

### ✅ Correct

```typescript
export class GoogleOAuth2Api implements ICredentialType {
	name = 'googleOAuth2Api';
	displayName = 'Google OAuth2 API';
	extends = ['oAuth2Api'];
	properties: INodeProperties[] = [];
}
```

## Migrated from

This rule consolidates three rules from the legacy `eslint-plugin-n8n-nodes-base` plugin into a single conceptual check:

- `cred-class-name-missing-oauth2-suffix`
- `cred-class-field-name-missing-oauth2`
- `cred-class-field-display-name-missing-oauth2`
