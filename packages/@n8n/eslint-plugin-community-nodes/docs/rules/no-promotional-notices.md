# Disallow promotional copy in node notices (`@n8n/community-nodes/no-promotional-notices`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Node notices must not contain pricing, sign-up, or plan-upgrade messages. This rule checks the `displayName` of properties with `type: 'notice'` in `.node.ts` files and exported `INodeProperties[]` arrays. It excludes credential notices.

The rule warns about plan sales copy, pricing and sign-up links, free trials, monthly prices, discount codes, and sales contact messages. It allows non-promotional notices, such as webhook lifecycle warnings and event delivery guarantees.

Remove promotional notices. If a capability requires a specific plan, state that fact in the related field's `description`.

## Examples

### Incorrect

```typescript
export const properties: INodeProperties[] = [
  {
    displayName: 'Needs the Starter plan or above',
    name: 'notice',
    type: 'notice',
    default: '',
  },
];
```

### Correct

```typescript
export const properties: INodeProperties[] = [
  {
    displayName: 'Events may be delivered more than once. Deduplicate by eventId before performing side effects.',
    name: 'notice',
    type: 'notice',
    default: '',
  },
  {
    displayName: 'Workspace ID',
    name: 'workspaceId',
    type: 'string',
    default: '',
    description: 'Requires the Enterprise plan',
  },
];
```
