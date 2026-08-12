# Require webhook trigger nodes to implement the complete webhookMethods lifecycle (checkExists, create, delete) (`@n8n/community-nodes/webhook-lifecycle-complete`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Webhook-based trigger nodes must implement a complete webhook lifecycle so that
n8n can register, verify, and clean up webhooks on the third-party service.
Missing any of the three methods results in leaked webhooks, duplicated
registrations, or workflows that silently stop firing.

This rule applies to node classes that:

- declare a non-empty `webhooks` array in their `description`, or
- define a `webhookMethods` class property.

For every webhook group inside `webhookMethods` (typically `default`), the
methods `checkExists`, `create`, and `delete` must all be implemented.

Polling triggers (trigger nodes without a `webhooks` array and without
`webhookMethods`) are intentionally out of scope.

## Examples

### ❌ Incorrect

Webhook trigger without any lifecycle methods:

```typescript
export class MyTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Trigger',
    name: 'myTrigger',
    group: ['trigger'],
    version: 1,
    description: 'Trigger on events',
    defaults: { name: 'My Trigger' },
    inputs: [],
    outputs: ['main'],
    webhooks: [
      { name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' },
    ],
    properties: [],
  };
}
```

Webhook trigger with an incomplete `webhookMethods.default`:

```typescript
export class MyTrigger implements INodeType {
  description: INodeTypeDescription = { /* ... */ };

  webhookMethods = {
    default: {
      async create(this: IHookFunctions): Promise<boolean> { /* ... */ return true; },
      // Missing checkExists and delete
    },
  };
}
```

### ✅ Correct

```typescript
export class MyTrigger implements INodeType {
  description: INodeTypeDescription = { /* ... */ };

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        // Return true if the webhook is already registered on the third-party service.
        return true;
      },
      async create(this: IHookFunctions): Promise<boolean> {
        // Register the webhook with the third-party service and persist any IDs.
        return true;
      },
      async delete(this: IHookFunctions): Promise<boolean> {
        // Remove the webhook from the third-party service.
        return true;
      },
    },
  };
}
```
