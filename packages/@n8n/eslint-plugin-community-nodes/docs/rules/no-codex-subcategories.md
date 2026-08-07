# Disallow the codex.subcategories field in community nodes that do not import the AI Node SDK (`@n8n/community-nodes/no-codex-subcategories`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

`codex.subcategories` values are only meaningful to n8n's built-in node panel
grouping — for example, whether an AI-categorized node shows up in the main
"Add node" search depends on `subcategories.AI` containing `'Root Nodes'`.
There's no schema enforcing which strings are recognized, so an unrecognized
value (a typo, or a value that doesn't exist in the taxonomy) doesn't raise an
error — it just silently misclassifies the node in the editor.

Rather than trying to keep a community-facing lint rule in sync with n8n's
internal, frontend-only taxonomy, this rule disallows `codex.subcategories`
outright for community nodes — in an inline `codex` object in a `.node.ts`
file, or in a sibling `.node.json` codex file — and offers a fix that removes
it.

A node file that imports `@n8n/ai-node-sdk` is exempt: `subcategories.AI` is
how an SDK-built AI node gets properly detected and placed in the node panel
(see also [no-ai-codex-category](no-ai-codex-category.md)). This is checked
per node file, not per package — a single community node package can mix
AI-SDK nodes with ordinary ones, and only the nodes that actually import the
SDK are exempt. For a `.node.json` codex file, the check looks at its sibling
`.node.ts` file, since the JSON file has no imports of its own.

A `.node.json` codex file is also skipped whenever its sibling `.node.ts`
declares an inline `description.codex`: n8n's node loader uses the inline
`codex` as-is when it's set and never even reads the `.node.json` file in
that case (there's no field-by-field merge), so its `subcategories` have no
effect on the running node.

## Examples

### Incorrect

```typescript
// this file does not import @n8n/ai-node-sdk
description: INodeTypeDescription = {
	// ...
	codex: {
		categories: ['Development'],
		subcategories: {
			AI: ['Agents & Tools', 'Tools'],
		},
	},
};
```

```json
{
	"node": "n8n-nodes-example.myNode",
	"categories": ["Core Nodes"],
	"subcategories": {
		"Core Nodes": ["Helpers"]
	}
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
