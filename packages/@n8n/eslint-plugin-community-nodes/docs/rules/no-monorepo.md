# Require community nodes to use a single-package repository (`@n8n/community-nodes/no-monorepo`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

This rule rejects a `repository.directory` field in `package.json`. This field identifies a package in a monorepo. Community node tooling requires each published package to use a dedicated repository.

## Examples

### Incorrect

```json
{
  "name": "n8n-nodes-example",
  "repository": {
    "type": "git",
    "url": "https://github.com/example/packages.git",
    "directory": "packages/n8n-nodes-example"
  }
}
```

### Correct

```json
{
  "name": "n8n-nodes-example",
  "repository": {
    "type": "git",
    "url": "https://github.com/example/n8n-nodes-example.git"
  }
}
```
