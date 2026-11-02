# Require a Return All companion and visibility gate for Limit properties (`@n8n/community-nodes/require-return-all-with-limit`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

List operations should offer Return All so users can retrieve every result. Limit must disappear when Return All is on.

This rule checks node descriptions in `*.node.ts` files and exported `INodeProperties[]` arrays. It reports a `limit` without a sibling `returnAll` under the same `displayOptions.show` conditions. It also reports a `limit` unless `displayOptions.show.returnAll` is exactly `[false]`.

The comparison excludes the `returnAll` condition. The order of condition keys and values does not matter. A Return All field for a different resource or operation is not a companion. The rule also reports Return All when it gates another field while Limit has no Return All gate.

The rule compares object-valued conditions, such as `@version: [{ _cnd: { lte: 2.6 } }]`, by their values. It skips companion comparisons when identifiers, object spreads, or other expressions make the conditions unknown. It still checks a Limit gate when it can determine that gate.

The rule does not check whether execution retrieves all pages.

## Examples

### Incorrect

```typescript
properties: [
	{ displayName: 'Return All', name: 'returnAll', type: 'boolean', default: false },
	{ displayName: 'Limit', name: 'limit', type: 'number', default: 50 },
];
```

### Correct

```typescript
properties: [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: { show: { returnAll: [false] } },
	},
];
```

## Search Limits

Vector search, similarity search, and autocomplete can use a bare top-K limit. For these operations, suppress the warning on the Limit property. Include a reason:

```typescript
export const searchFields: INodeProperties[] = [
	// eslint-disable-next-line @n8n/community-nodes/require-return-all-with-limit -- Similarity search returns the top K matches.
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 10,
	},
];
```
