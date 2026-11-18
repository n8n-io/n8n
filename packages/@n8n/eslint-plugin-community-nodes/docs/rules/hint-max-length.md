# Limit the length of a node property "hint" (`@n8n/community-nodes/hint-max-length`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

A property `hint` renders inline under the field in the node parameter panel. A
long hint fills the panel and pushes the other fields down, so it makes the node
harder to read. A hint must be a short inline nudge.

For longer text, use the property `description`. It renders as the tooltip, so
it holds documentation without cost to the panel layout.

The rule reports a `hint` of more than 120 characters. Almost all first-party
hints are within this limit, so it only cuts the long tail. The hint renders as
HTML, so the rule ignores HTML tags and counts each HTML entity, such as `&lt;`,
as one character. Plain-text comparisons such as `< 10` count as text.

The rule checks static strings. This includes template literals, concatenated
strings, and local constants. It skips values that need runtime data.

The rule checks the properties in every file, so it also checks properties that
you define in a separate resource file, and the credential properties. It also
checks the modes of a resource locator.

A spread alone does not identify a node property. The rule checks spread-based
overrides in property arrays and typed `INodeProperties` declarations. It ignores
unrelated objects, such as default values and request bodies.

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
