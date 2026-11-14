# Require supported community node codex categories and AI subcategories (`@n8n/community-nodes/valid-node-categories`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

This rule checks `categories` and `subcategories.AI` in community node `.node.json` files and inline `description.codex` objects in `.node.ts` and `.node.js` files. Each category must match a value in the [node category list](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/codex-files/#node-categories). The `categories` field is optional. When `categories` includes `AI`, add at least one supported `subcategories.AI` value. Add `AI` to `categories` when you set `subcategories.AI`.

## Examples

### ❌ Incorrect

```json
{
  "categories": ["AI"],
  "subcategories": { "AI": ["Agents & Tools"] }
}
```

### ✅ Correct

```json
{
  "categories": ["AI"],
  "subcategories": { "AI": ["Agents", "Tools"] }
}
```
