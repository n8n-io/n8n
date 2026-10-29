# Disallow confirmation checkboxes that gate node operations (`@n8n/community-nodes/no-confirmation-checkbox`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

The user selects an operation before execution. A second confirmation checkbox can block unattended workflows.

This rule checks properties in `.node.ts` node classes and exported `INodeProperties[]` arrays. It reports boolean fields that default to `false` when either condition applies:

- The `name` starts with `confirm`.
- The `displayName` starts with `confirm`, `I confirm`, or `Are you sure`.

The checks ignore letter case. Remove the confirmation field and its execution guard. Describe destructive actions in the operation's `description`.

Behavior switches, such as Dry Run and Estimate Only, can stay. These switches change what an operation does instead of blocking execution. Genuine API booleans can also stay when their names do not match the confirmation patterns.

## Examples

### Incorrect

```typescript
export const alertFields: INodeProperties[] = [
	{
		displayName: 'Confirm Write Operation',
		name: 'confirmWrite',
		type: 'boolean',
		default: false,
	},
];
```

### Correct

```typescript
export const alertFields: INodeProperties[] = [
	{
		displayName: 'Dry Run',
		name: 'dryRun',
		type: 'boolean',
		default: false,
		description: 'Whether to estimate changes without applying them',
	},
];
```
