# Require supported community node codex categories and AI subcategories (`@n8n/community-nodes/valid-node-categories`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

This rule checks `categories` in community node `.node.json` files and inline `description.codex` objects in `.node.ts` files. Each category must match a value in the [node category list](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/codex-files/#node-categories) or the `AI` category. The rule also rejects empty arrays and values that are not strings. The `categories` field is optional.

The `AI` category requires `subcategories.AI` with at least one supported AI subcategory. Use the AI subcategory names from the node creator, such as `Language Models`, `Tools`, or `Root Nodes`. A node must not declare `subcategories.AI` without the `AI` category. Non-AI community nodes must not declare `subcategories`.

## Examples

### ❌ Incorrect

```json
{
  "categories": ["Marketing", "Bananas"]
}
```

```typescript
description: INodeTypeDescription = {
	codex: { categories: ['AI'], subcategories: { AI: ['Agents & Tools'] } },
};
```

### ✅ Correct

```json
{
  "categories": ["Marketing & Content", "Development"]
}
```

```typescript
description: INodeTypeDescription = {
	codex: { categories: ['AI'], subcategories: { AI: ['Language Models', 'Root Nodes'] } },
};
```
