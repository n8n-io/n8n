# Ensure a node uses only one credential at a time (`@n8n/community-nodes/single-credential-per-node`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

This rule prevents a node from using multiple credentials at the same time. A node can declare multiple authentication methods when mutually exclusive `displayOptions.show` conditions let the user select only one credential.

Use a node property or collection for configuration that does not authenticate requests. Node properties support expressions.

## Examples

### Incorrect

```typescript
credentials: [
  { name: 'serviceOAuth2Api', required: true },
  { name: 'senderProfile', required: true },
]
```

### Correct

```typescript
credentials: [
  {
    name: 'serviceApi',
    required: true,
    displayOptions: { show: { authentication: ['apiKey'] } },
  },
  {
    name: 'serviceOAuth2Api',
    required: true,
    displayOptions: { show: { authentication: ['oAuth2'] } },
  },
]
```
