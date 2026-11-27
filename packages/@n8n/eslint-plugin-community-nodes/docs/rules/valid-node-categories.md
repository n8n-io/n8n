# Require supported community node codex categories and AI subcategories (`@n8n/community-nodes/valid-node-categories`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

This rule checks `categories` and `subcategories.AI` in community node `.node.json` files and inline `description.codex` objects in `.node.ts` and `.node.js` files. The `categories` field is optional. When `categories` includes `AI`, add at least one supported `subcategories.AI` value. Add `AI` to `categories` when you set `subcategories.AI`.

AI main nodes need `Root Nodes` in `subcategories.AI` to appear in regular **Add node** search. The rule checks for `Root Nodes` when it can determine the node's connection types from its source.

## Supported values

Use `AI` or a category in the [node category list](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/codex-files/#node-categories).

Use one or more of these values in `subcategories.AI`:

- `Agents`
- `Chains`
- `Document Loaders`
- `Embeddings`
- `Evaluation`
- `Human in the Loop`
- `Language Models`
- `Memory`
- `Miscellaneous`
- `Model Context Protocol`
- `Output Parsers`
- `Rerankers`
- `Retrievers`
- `Root Nodes`
- `Text Splitters`
- `Tools`
- `Vector Stores`

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
  "subcategories": { "AI": ["Agents", "Root Nodes"] }
}
```
