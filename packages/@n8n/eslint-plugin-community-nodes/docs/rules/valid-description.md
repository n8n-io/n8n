# Require a non-empty "description" field in community node package.json (`@n8n/community-nodes/valid-description`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

The `description` field in `package.json` is what users see when discovering your community node package on npm and inside n8n. It must be present and non-empty so that users can understand what the package does before installing it.

The `n8n-nodes-starter` template ships with `"description": ""`, which is a common oversight. This rule catches both a missing `description` key and the unchanged placeholder.

## Examples

### ❌ Incorrect

```json
{
  "name": "n8n-nodes-acme"
}
```

```json
{
  "name": "n8n-nodes-acme",
  "description": ""
}
```

### ✅ Correct

```json
{
  "name": "n8n-nodes-acme",
  "description": "n8n community node for the Acme Corp API"
}
```
