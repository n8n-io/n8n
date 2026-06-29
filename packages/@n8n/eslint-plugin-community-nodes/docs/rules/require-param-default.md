# Require every node parameter to declare a default value (`@n8n/community-nodes/require-param-default`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Every node parameter must declare a `default` property. A parameter is detected
by its shape: an object inside the node's `description` with `displayName`,
`name`, and `type` all set to string literals — the shape every
`INodeProperties` entry has. Entries in an `options` array (which carry
`name`/`value` but no `displayName`/`type`) are not treated as parameters.

Without a `default`, n8n cannot reliably initialise the parameter's value. This
leads to inconsistent behaviour in the editor (empty or `undefined` fields) and
at execution time. Even non-input types such as `notice` are expected to declare
`default: ''`.

This rule also checks parameters nested inside `options` of `collection` and
`fixedCollection` parameters.

## Examples

### Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    properties: [
      {
        displayName: 'Field',
        name: 'field',
        type: 'string',
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
        displayName: 'Field',
        name: 'field',
        type: 'string',
        default: '',
      },
    ],
  };
}
```
