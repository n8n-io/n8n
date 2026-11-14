# Require community nodes to use a single-package repository (`@n8n/community-nodes/no-monorepo`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

This rule rejects a nested `repository.directory` in `package.json`. A root directory value such as `.` or `./` is valid. The publication scanner checks the source repository layout. It accepts a repository with its only `package.json` in a subdirectory. Omit `repository.directory` for that layout during local linting.

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
