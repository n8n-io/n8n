# Disallow user-facing pagination parameters in node properties (`@n8n/community-nodes/no-raw-pagination-parameters`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Nodes must handle pagination internally. Users should not need to run a node for each page or combine pages themselves.

This rule checks node descriptions in `*.node.ts` files and exported `INodeProperties[]` arrays. It includes fields in collections and fixed collections. It warns about these parameter names:

`offset`, `cursor`, `page`, `pageToken`, `page_token`, `pageSize`, `page_size`, `skip`, `perPage`, `per_page`, `startIndex`, and `nextToken`.

The rule ignores fields with `type: 'hidden'`. If an API requires a caller-supplied cursor, use an ESLint suppression comment with a reason.

## Examples

### Incorrect

```typescript
properties: [
	{ displayName: 'Offset', name: 'offset', type: 'number', default: 0 },
];
```

### Correct

```typescript
properties: [
	{ displayName: 'Return All', name: 'returnAll', type: 'boolean', default: false },
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 100,
		displayOptions: { show: { returnAll: [false] } },
	},
];
```

In the execute path, request each page until the results run out or the limit is reached. The rule does not check that loop or enforce the Return All and Limit pattern.
