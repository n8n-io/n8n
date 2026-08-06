# Ensure codex categories and subcategories only use values from n8n's known taxonomy (`@n8n/community-nodes/valid-codex-categories`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## Rule Details

n8n's node panel filters and groups nodes based on the exact string values
declared in `codex.categories` and `codex.subcategories`. These values are not
type-checked against a fixed enum, so an unrecognized string (a typo, or a
value that simply doesn't exist in n8n's taxonomy) doesn't raise an error —
it silently misclassifies the node instead. For example, an AI node with an
unrecognized subcategory can be filtered out of the main "Add node" search
panel entirely, only surfacing in the AI browse view.

This rule flags:

- Any `codex.categories` entry that isn't a recognized top-level category.
- Any `codex.subcategories` key that isn't a recognized top-level category.
- Any string inside a `codex.subcategories` array that isn't a recognized
  subcategory value.
- `codex.subcategories` declared as a plain array instead of a map of
  category name to subcategory array.

When a flagged value is a close match to a known one, the rule offers a "did
you mean" suggestion fix.

This rule does not check that a subcategory is nested under its "correct"
category (e.g. it won't flag `subcategories: { 'Core Nodes': ['Agents'] }`
even though `'Agents'` is an AI subcategory) — only that every value used is
part of the known taxonomy somewhere.

## Examples

### ❌ Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    /* ... */
    codex: {
      categories: ['AI'],
      subcategories: {
        AI: ['Agents & Tools'], // not a recognized subcategory
      },
    },
  };
}
```

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    /* ... */
    codex: {
      categories: ['Core Nodes'],
      subcategories: ['Helpers'], // must be a category -> subcategories map
    },
  };
}
```

### ✅ Correct

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    /* ... */
    codex: {
      categories: ['AI'],
      subcategories: {
        AI: ['Agents', 'Tools'],
      },
    },
  };
}
```
