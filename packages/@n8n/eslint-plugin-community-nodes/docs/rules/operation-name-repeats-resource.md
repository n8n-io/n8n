# Disallow operation names that repeat the resource (`@n8n/community-nodes/operation-name-repeats-resource`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule details

The editor shows the resource above the operation. Name only the action when the operation acts on that resource.

This rule checks operation lists whose `displayOptions.show.resource` contains exactly one resource. It reports names that contain only the resource or end with the resource after one or more action words. It ignores case, articles, plural `s` or `es`, and text in parentheses or square brackets. For example, `status` matches "Get Statuses", and `contact` matches "Create New Contact". It splits resource values into words, so `httpRequest` matches "HTTP Request".

Names can include a different object. For example, "Get Columns" under `table` and "Create Payment Link" under `payment` are correct. The rule skips operation lists shared by multiple resources.

## Examples

### Incorrect

```typescript
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  displayOptions: { show: { resource: ['contact'] } },
  options: [
    { name: 'Create Contact', value: 'create' },
    { name: 'Delete a Contact', value: 'delete' },
  ],
  default: 'create',
}
```

### Correct

```typescript
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  displayOptions: { show: { resource: ['contact'] } },
  options: [
    { name: 'Create', value: 'create' },
    { name: 'Delete', value: 'delete' },
  ],
  default: 'create',
}
```
