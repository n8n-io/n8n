# Require the "n8n-community-node-package" keyword in package.json (`@n8n/community-nodes/require-community-node-keyword`)

⚠️ This rule is set to `warn` in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/use/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

Validates that the `package.json` of a community node package includes `"n8n-community-node-package"` in its `keywords` array. This keyword is required for n8n to discover and list community node packages.

## Examples

### ❌ Incorrect

```json
{
  "name": "n8n-nodes-my-service",
  "version": "1.0.0"
}
```

```json
{
  "name": "n8n-nodes-my-service",
  "keywords": ["n8n", "automation"]
}
```

### ✅ Correct

```json
{
  "name": "n8n-nodes-my-service",
  "keywords": ["n8n-community-node-package"]
}
```

```json
{
  "name": "n8n-nodes-my-service",
  "keywords": ["n8n", "automation", "n8n-community-node-package"]
}
```
