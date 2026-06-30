# Require the "license" field in community node package.json to be "MIT" (`@n8n/community-nodes/require-mit-license`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

Validates that the `package.json` of a community node package declares its `license` as `"MIT"`. Community node packages must be MIT licensed to be distributed through n8n.

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
  "license": "Apache-2.0"
}
```

### ✅ Correct

```json
{
  "name": "n8n-nodes-my-service",
  "license": "MIT"
}
```
