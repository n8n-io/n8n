# Require optional node parameters to be inside a collection (`@n8n/community-nodes/optional-fields-in-collection`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Put optional parameters inside an `Additional Fields` or `Options` collection.
This keeps the default node form focused on required inputs.

The rule starts at `description.properties` in node classes. It follows array
references, spreads, and named imports within the package. It reports exported
fields in their source file. It does not inspect fields inside a `collection`
or `fixedCollection`, or arrays that the node form does not use.

The rule allows these top-level fields:

- `resource`, `operation`, `returnAll`, `limit`, `simplify`, and `authentication`.
- Fields with `required: true` or `noDataExpression: true`.
- Fields with type `collection`, `fixedCollection`, or `notice`.

The rule cannot identify an operation's primary input. Use an ESLint suppression
when that input must stay at the top level without `required: true`.

## Examples

### Incorrect

```typescript
export class Example implements INodeType {
	description = {
		properties: [{ displayName: 'Email', name: 'email', type: 'string', default: '' }],
	};
}
```

### Correct

```typescript
export class Example implements INodeType {
	description = {
		properties: [
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				options: [{ displayName: 'Email', name: 'email', type: 'string', default: '' }],
			},
		],
	};
}
```
