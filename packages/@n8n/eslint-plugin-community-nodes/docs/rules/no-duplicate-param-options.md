# Disallow duplicate option names or values within a single node parameter (`@n8n/community-nodes/no-duplicate-param-options`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Within an `options`- or `multiOptions`-typed node parameter, each option must
have a unique `name` and a unique `value`. Duplicate names confuse users in the
dropdown, and duplicate values make selections ambiguous and break value-based
logic downstream.

## Examples

### Incorrect

```typescript
{
  displayName: 'Resource',
  name: 'resource',
  type: 'options',
  options: [
    { name: 'Contact', value: 'contact' },
    { name: 'Contact', value: 'person' }, // duplicate name
    { name: 'User', value: 'contact' },   // duplicate value
  ],
  default: 'contact',
}
```

### Correct

```typescript
{
  displayName: 'Resource',
  name: 'resource',
  type: 'options',
  options: [
    { name: 'Contact', value: 'contact' },
    { name: 'Person', value: 'person' },
    { name: 'User', value: 'user' },
  ],
  default: 'contact',
}
```
