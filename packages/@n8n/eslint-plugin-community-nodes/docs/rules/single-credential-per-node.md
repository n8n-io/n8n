# Ensure a regular node uses only one credential at a time (`@n8n/community-nodes/single-credential-per-node`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

This rule prevents a regular node from using multiple credentials at the same time. A node can declare multiple authentication methods when mutually exclusive `displayOptions.show` conditions on a single-value property let the user select only one credential.

The rule compares values from literals, local constants, and local enum members. It reports credentials when it cannot resolve a condition value. This includes values imported from another file.

The rule does not check trigger nodes. A trigger can use separate credentials for outbound requests and webhook validation.

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
