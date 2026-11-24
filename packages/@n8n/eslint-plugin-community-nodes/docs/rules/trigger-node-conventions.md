# Trigger nodes (class name ends with `Trigger`) must label themselves consistently as triggers (`@n8n/community-nodes/trigger-node-conventions`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

When a node class name ends with `Trigger`, the node must consistently present
itself as a trigger so users and the editor recognize it as one. This rule
requires all of:

- `description.name` ends with `Trigger`
- `description.displayName` contains `Trigger`
- `description.inputs` is an empty array (`[]`) — trigger nodes start an
  execution and take no main inputs

This consolidates three checks that form a single conceptual requirement: if
it's a trigger node, label it consistently.

## Examples

### Incorrect

```typescript
export class MyTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'my',
    inputs: ['main'],
    outputs: ['main'],
    // ...
  };
}
```

### Correct

```typescript
export class MyTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Trigger',
    name: 'myTrigger',
    inputs: [],
    outputs: ['main'],
    // ...
  };
}
```
