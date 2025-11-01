# Prevent credential re-use security issues by ensuring nodes only reference credentials from the same package (`@n8n/community-nodes/no-credential-reuse`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## Rule Details

Ensures your nodes only reference credentials by their `name` property that match credential classes declared in your package's `package.json` file. This prevents security issues where nodes could access credentials from other packages.

## Examples

### ❌ Incorrect

```typescript
// MyApiCredential.credentials.ts
export class MyApiCredential implements ICredentialType {
  name = 'myApiCredential';
  displayName = 'My API';
  // ...
}

// package.json: "n8n": { "credentials": ["dist/credentials/MyApiCredential.credentials.js"] }

export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    credentials: [
      {
        name: 'someOtherCredential', // No credential class with this name in package
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
  name = 'myApiCredential'; // This name must match what's used in nodes
  displayName = 'My API';
  // ...
}

// package.json: "n8n": { "credentials": ["dist/credentials/MyApiCredential.credentials.js"] }

export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    credentials: [
      {
        name: 'myApiCredential', // Matches credential class name property
        required: true,
      },
    ],
    // ...
  };
}
```

## Setup

Declare your credential files in `package.json` and ensure the credential name in nodes matches the `name` property in your credential classes:

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
