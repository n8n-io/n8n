# Enforce that non-required node fields live in an "Additional Options" or "Additional Fields" collection (`@n8n/community-nodes/non-required-fields-in-collection`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

The n8n [UX guidelines](https://docs.n8n.io/integrations/creating-nodes/build/reference/ux-guidelines/)
keep the top level of a node to the fields the user must fill in. Put every
other field in a `collection` named `Additional Fields` or `Additional Options`.
The user then sees a short form, and opens the collection only to change a
default.

This rule reports each field in `description.properties` that is not marked
`required: true`. These fields are exempt:

- Fields with `type: 'collection'` or `type: 'fixedCollection'`, because they
  are the containers this rule moves fields into.
- Fields with `type: 'notice'`, `'callout'`, `'hidden'`, or `'curlImport'`,
  because they hold no user input.
- The `resource`, `operation`, and `authentication` selectors, because they
  decide which other fields n8n shows.

A `required` value that is not a boolean literal (for example a variable) is
unknowable at lint time, so the rule makes no report for that field.

## Examples

### ❌ Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Service',
    name: 'myService',
    properties: [
      {
        displayName: 'Email',
        name: 'email',
        type: 'string',
        required: true,
        default: '',
      },
      {
        // Not required, but at the top level
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 50,
      },
    ],
  };
}
```

### ✅ Correct

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Service',
    name: 'myService',
    properties: [
      {
        displayName: 'Email',
        name: 'email',
        type: 'string',
        required: true,
        default: '',
      },
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        options: [
          {
            displayName: 'Limit',
            name: 'limit',
            type: 'number',
            default: 50,
          },
        ],
      },
    ],
  };
}
```
