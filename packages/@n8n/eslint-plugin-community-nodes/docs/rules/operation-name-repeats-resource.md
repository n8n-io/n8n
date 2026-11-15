# Disallow operation names that only repeat the resource selected above them, like "Get Contact" for the Contact resource (`@n8n/community-nodes/operation-name-repeats-resource`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

The editor shows the resource above the operation. The [UX guidelines for community nodes](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/ux-guidelines) say not to repeat the resource in the operation name. Name only the action, for example "Delete" for the Contact resource.

When the operation works on an object inside the resource, name that object. "Get Columns" for the Table resource and "Create Payment Link" for the Payment resource are correct.

The rule compares the operation name with the resource value in `displayOptions.show.resource`. It ignores articles, plurals and the case of the value, so `directoryContext` matches "Get Directory Context". It skips operation lists that are shown for more than one resource.

The standard names "Get Many", "Create or Update", "Insert or Update", "Append or Update" and "Insert or Append" count as one action, so "Get Many Contacts" also repeats the Contact resource. For `getAll` and `upsert`, the rule suggests a standard name for the operation value. A name that already starts with one of them keeps it. Otherwise the rule suggests the default:

| `value` | Standard names | Default |
| --- | --- | --- |
| `getAll` | "Get Many" | "Get Many" |
| `upsert` | "Create or Update", "Insert or Update", "Append or Update" | "Create or Update" |

Change only `name`. Keep `value` as it is: saved workflows store it, so changing it breaks them.

The rule is a warning, because the standard names assume an API with REST-like operations on resources. Not every API a node calls works like that.

## Examples

### ❌ Incorrect

```typescript
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  displayOptions: { show: { resource: ['contact'] } },
  options: [
    { name: 'Create Contact', value: 'create', action: 'Create a contact' },
    { name: 'Delete a Contact', value: 'delete', action: 'Delete a contact' },
  ],
  default: 'create',
}
```

### ✅ Correct

```typescript
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  displayOptions: { show: { resource: ['contact'] } },
  options: [
    { name: 'Create', value: 'create', action: 'Create a contact' },
    { name: 'Delete', value: 'delete', action: 'Delete a contact' },
    { name: 'Add Tag', value: 'addTag', action: 'Add a tag to a contact' },
  ],
  default: 'create',
}
```
