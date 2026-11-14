# Reserve webhook options for trigger nodes (`@n8n/community-nodes/no-webhooks-on-action-nodes`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Webhook options are reserved for trigger nodes in community packages. This rule
checks node classes in `*.node.ts` files. It reports each of these patterns
on an action node:

- A `webhooks` property in the node description.
- A `webhookMethods` class property.
- An `async webhook()` method.
- A `$execution.resumeUrl` or `$execution.resumeFormUrl` reference in code or an
  expression string, even without a `webhooks` declaration. This includes
  optional chaining (`$execution?.resumeUrl`) and access through the workflow
  data proxy (`this.getWorkflowDataProxy(0).$execution.resumeUrl`).

The rule identifies a trigger when its description group includes `'trigger'`,
its class name ends with `Trigger`, or its class defines `poll()` or `trigger()`.

Move webhook behavior to a dedicated trigger node, or use polling in the action
node. A complete webhook lifecycle does not exempt an action node.

### Wait-node resume pattern

The Wait-node resume pattern is not exempt. This includes `restartWebhook: true`,
`path: ''`, and `$execution.resumeUrl`. For a wait-for-completion feature, move
the webhook behavior to the package's trigger node, or use polling.

## Examples

### Incorrect

```typescript
export class Job implements INodeType {
  description: INodeTypeDescription = {
    // Other description fields are omitted.
    group: ['input'],
    webhooks: [
      { name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' },
    ],
  };
}
```

### Correct

```typescript
export class JobTrigger implements INodeType {
  description: INodeTypeDescription = {
    // Other description fields are omitted.
    group: ['trigger'],
    webhooks: [
      { name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' },
    ],
  };

  webhookMethods = {
    default: {
      async checkExists() { return await checkRemoteWebhook(); },
      async create() { return await createRemoteWebhook(); },
      async delete() { return await deleteRemoteWebhook(); },
    },
  };
}
```
