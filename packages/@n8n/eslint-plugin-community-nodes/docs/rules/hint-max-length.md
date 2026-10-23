# Limit the length of a node property "hint" (`@n8n/community-nodes/hint-max-length`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

A property `hint` renders inline under the field in the node parameter panel. A
long hint fills the panel and pushes the other fields down, so it makes the node
harder to read. A hint must be a short inline nudge.

For longer text, use the property `description`. It renders as the tooltip, so
it holds documentation without cost to the panel layout.

The rule reports a `hint` of more than 120 characters. This limit is the 95th
percentile of `hint` length in first-party nodes, so it only cuts the long tail.
The rule checks every property in the node `description`, which includes the
properties nested in a collection.

## Examples

### Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    properties: [
      {
        displayName: 'Query',
        name: 'query',
        type: 'string',
        default: '',
        hint: 'The query must be an array of operations with the required selection and the optional filtering, sorting and pagination fields',
      },
    ],
  };
}
```

### Correct

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    properties: [
      {
        displayName: 'Query',
        name: 'query',
        type: 'string',
        default: '',
        hint: 'An array of operations',
        description:
          'The query must be an array of operations with the required selection and the optional filtering, sorting and pagination fields',
      },
    ],
  };
}
```
