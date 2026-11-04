# Place optional node parameters inside a collection (`@n8n/community-nodes/optional-fields-in-collection`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

This rule warns about optional fields at the top level of `description.properties` in `.node.ts` files. Put optional fields inside an Additional Fields or Options collection. This keeps the required inputs easy to find.

The rule exempts required fields, collections, fixed collections, and notices. It also exempts `resource`, `operation`, `returnAll`, `limit`, `simplify`, `authentication`, and fields with `noDataExpression: true`.

The rule checks inline top-level fields only. It does not inspect separate arrays or fields inside collections.

## Examples

### Incorrect

```typescript
properties: [
	{ displayName: 'Email', name: 'email', type: 'string', default: '' },
];
```

### Correct

```typescript
properties: [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		options: [{ displayName: 'Email', name: 'email', type: 'string', default: '' }],
	},
];
```

## When Not To Use It

An operation's primary input can need a top-level field even when it is optional. Use an ESLint comment to suppress that warning. State why the field must stay at the top level.

```typescript
properties: [
	// eslint-disable-next-line @n8n/community-nodes/optional-fields-in-collection -- This is the operation's primary input.
	{ displayName: 'Binary Property', name: 'binaryPropertyName', type: 'string', default: 'data' },
];
```
