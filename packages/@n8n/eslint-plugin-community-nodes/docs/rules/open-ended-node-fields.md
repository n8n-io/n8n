# Discourage optional open-ended JSON fields in node properties (`@n8n/community-nodes/open-ended-node-fields`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

This rule warns about optional top-level JSON properties in node descriptions. A JSON configuration field can hide parameters from the editor. Typed parameters make configuration easier to find, validate, and change.

Place optional parameters under Additional Options or Additional Fields. The rule does not report required JSON properties or typed collection options.

## Examples

### Incorrect

```typescript
properties: [
	{ displayName: 'Configuration', name: 'configuration', type: 'json', default: '{}' },
];
```

### Correct

```typescript
properties: [
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		options: [{ displayName: 'Limit', name: 'limit', type: 'number', default: 10 }],
	},
];
```
