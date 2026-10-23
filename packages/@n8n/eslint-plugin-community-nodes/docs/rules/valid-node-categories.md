# Require supported community node categories in .node.json codex files (`@n8n/community-nodes/valid-node-categories`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

This rule checks `categories` in community node `.node.json` codex files. Each category must match a value in the [node category list](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/codex-files/#node-categories). The rule also rejects empty arrays and values that are not strings. The `categories` field is optional.

## Examples

### ❌ Incorrect

```json
{
  "categories": ["Marketing", "Bananas"]
}
```

### ✅ Correct

```json
{
  "categories": ["Marketing & Content", "Development"]
}
```
