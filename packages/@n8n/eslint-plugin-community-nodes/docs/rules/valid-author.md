# Require a non-empty author name and email in package.json (`@n8n/community-nodes/valid-author`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

A published community node package should identify its author. This rule
requires the `package.json` to declare an `author` with at minimum a non-empty
`name` and `email`, so users and n8n can reach the maintainer.

Both npm `author` forms are supported:

- the object form `{ "name": "...", "email": "..." }`
- the shorthand string form `"Name <email> (url)"`

Whitespace-only values count as empty. The literal `<...>` placeholder pattern
left over from the node starter template is handled separately by the
[`no-template-placeholders`](./no-template-placeholders.md) rule.

## Examples

### ❌ Incorrect

```json
{
  "name": "n8n-nodes-my-service"
}
```

```json
{
  "name": "n8n-nodes-my-service",
  "author": { "name": "Jane Doe" }
}
```

```json
{
  "name": "n8n-nodes-my-service",
  "author": "Jane Doe"
}
```

### ✅ Correct

```json
{
  "name": "n8n-nodes-my-service",
  "author": { "name": "Jane Doe", "email": "jane@example.com" }
}
```

```json
{
  "name": "n8n-nodes-my-service",
  "author": "Jane Doe <jane@example.com> (https://example.com)"
}
```
