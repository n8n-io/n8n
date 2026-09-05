# Disallow the reserved "AI" codex category in community nodes that do not import the AI Node SDK (`@n8n/community-nodes/no-ai-codex-category`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

n8n's node panel decides what to show in the main "Add node" search by
special-casing `codex.categories` containing `'AI'`: an AI-categorized node is
filtered out of the main search entirely unless it also declares
`'Root Nodes'` in `codex.subcategories.AI`. Community nodes have no reliable
way to pair these correctly, so declaring the `'AI'` category on a community
node risks the node silently disappearing from the main search panel with no
error raised anywhere.

This rule flags `'AI'` wherever it appears in `codex.categories` — in an
inline `codex` object in a `.node.ts` file, or in a sibling `.node.json` codex
file — and offers a fix that removes it.

A node file that imports `@n8n/ai-node-sdk` is exempt: the SDK requires the
`'AI'` category (paired with the right subcategories, see
[no-codex-subcategories](no-codex-subcategories.md)) to get built-in AI nodes
correctly detected and placed in the node panel. This is checked per node
file, not per package — a single community node package can mix AI-SDK nodes
with ordinary ones, and only the nodes that actually import the SDK are
exempt. For a `.node.json` codex file, the check looks at its sibling
`.node.ts` file, since the JSON file has no imports of its own.

A `.node.json` codex file is also skipped whenever its sibling `.node.ts`
declares an inline `description.codex`: n8n's node loader uses the inline
`codex` as-is when it's set and never even reads the `.node.json` file in
that case (there's no field-by-field merge), so its `categories` have no
effect on the running node.

## Examples

### Incorrect

```typescript
// this file does not import @n8n/ai-node-sdk
description: INodeTypeDescription = {
	// ...
	codex: {
		categories: ['AI'],
	},
};
```

```json
{
	"node": "n8n-nodes-example.myNode",
	"categories": ["AI"]
}
```

### Correct

```typescript
description: INodeTypeDescription = {
	// ...
	codex: {
		categories: ['Development'],
	},
};
```

```typescript
import { AiNode } from '@n8n/ai-node-sdk';

description: INodeTypeDescription = {
	// ...
	codex: {
		categories: ['AI'],
		subcategories: {
			AI: ['Root Nodes'],
		},
	},
};
```
