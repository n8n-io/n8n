# Ensure credentials referenced in node descriptions exist as credential classes in the package (`@n8n/community-nodes/valid-credential-references`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## Rule Details

For each entry in `description.credentials[]`, this rule verifies that the referenced `name` matches the `name` class field of a credential class declared in the same package (as listed in `package.json` under `n8n.credentials`).

This catches typos and broken references. When `cred-class-name-suffix` is also enabled, this rule naturally enforces the naming convention in the common case while still allowing legitimately named credentials such as `httpHeaderAuth` or `webhookAuth`.

## Examples

### ❌ Incorrect

```typescript
// MyApiCredential.credentials.ts
export class MyApiCredential implements ICredentialType {
  name = 'myApiCredential';
  // ...
}

// package.json: "n8n": { "credentials": ["dist/credentials/MyApiCredential.credentials.js"] }

export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    credentials: [
      {
        name: 'myApiCredentail', // Typo — no credential with this name exists
        required: true,
      },
    ],
    // ...
  };
}
```

### ✅ Correct

```typescript
// MyApiCredential.credentials.ts
export class MyApiCredential implements ICredentialType {
  name = 'myApiCredential';
  // ...
}

// package.json: "n8n": { "credentials": ["dist/credentials/MyApiCredential.credentials.js"] }

export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    credentials: [
      {
        name: 'myApiCredential', // Matches the credential class name property
        required: true,
      },
    ],
    // ...
  };
}
```

## Setup

Declare your credential files in `package.json` so the rule can resolve credential class names:

```json
{
  "name": "n8n-nodes-my-service",
  "n8n": {
    "credentials": [
      "dist/credentials/MyApiCredential.credentials.js"
    ]
  }
}
```
