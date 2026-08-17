# Disallow hardcoded secrets (API keys, tokens, passwords) embedded as string literals in source (`@n8n/community-nodes/no-hardcoded-secrets`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Credentials must never be committed to source. A hardcoded API key, token, or
password ends up in the package published to the community registry and in every
git history that ever contained it, where anyone can extract it.

This rule flags string literals that _look like_ real secrets: a value longer
than 16 characters, with the shape of a hex digest or a base64/token string,
assigned to a variable, property, or field whose name contains `key`, `secret`,
`token`, `password`, `passwd`, or `auth`.

Secrets belong in n8n credentials or environment variables, never in code:

```typescript
// Read from the node's configured credential instead.
const credentials = await this.getCredentials('myServiceApi');
const apiKey = credentials.apiKey;
```

> [!NOTE]
> This rule is heuristic and will produce some false positives — it supplements
> a human/automated security review, it does not replace one. When a flagged
> value is genuinely not a secret (for example a public constant that happens to
> look token-shaped), rename the variable so it no longer reads as a credential,
> or move the value out of the literal. Obvious placeholders (`your-...`,
> `example`, `changeme`, `xxxx`, `<...>`, `{{...}}`) are ignored automatically.

## Examples

### ❌ Incorrect

```typescript
const apiKey = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';

const config = { clientSecret: 'sk-1a2B3c4D5e6F7g8H9i0J-kLmNoP' };

class MyNode {
  private authToken = 'ghp_1a2B3c4D5e6F7g8H9i0J0k1L2m3N4o5P6q7R';
}
```

### ✅ Correct

```typescript
// Pull secrets from configured credentials at runtime.
const { apiKey } = await this.getCredentials('myServiceApi');

// Or from the environment.
const apiKey = process.env.MY_SERVICE_API_KEY;

// Placeholders and short/non-secret values are fine.
const apiKey = 'your-api-key-here';
```
