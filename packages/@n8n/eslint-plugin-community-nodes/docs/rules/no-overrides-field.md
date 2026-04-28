# Ban the "overrides" field in community node package.json (`@n8n/community-nodes/no-overrides-field`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

The `overrides` field in `package.json` lets a package force specific versions of its (transitive) dependencies. In the context of n8n community nodes this is dangerous:

- Community nodes are installed into a shared n8n runtime alongside other nodes. Overriding a shared library (e.g. `axios`, `@langchain/core`, `minimatch`) can silently substitute an incompatible version for every other node that depends on it, causing hard-to-diagnose runtime failures.
- Community nodes are distributed as pre-built packages with their dependencies already bundled or declared as `peerDependencies`. Any version pinning that the node actually needs should happen during development, not at install time on the user's n8n instance.
- `overrides` is frequently copy-pasted from an unrelated internal project and is almost never intentional in a community node.

If you have a genuine compatibility need, bundle the dependency into the published artifact or declare it via `peerDependencies` instead.

## Examples

### Incorrect

```json
{
  "name": "n8n-nodes-example",
  "overrides": {
    "axios": "1.7.0"
  }
}
```

```json
{
  "name": "n8n-nodes-example",
  "overrides": {
    "axios": "1.7.0",
    "@langchain/core": "0.3.0",
    "minimatch": "9.0.5"
  }
}
```

### Correct

```json
{
  "name": "n8n-nodes-example",
  "peerDependencies": {
    "n8n-workflow": "*"
  }
}
```
