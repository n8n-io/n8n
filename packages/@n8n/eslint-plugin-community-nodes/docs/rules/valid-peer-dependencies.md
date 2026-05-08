# Require community node package.json peerDependencies to contain only "n8n-workflow": "*" (and optionally "ai-node-sdk") (`@n8n/community-nodes/valid-peer-dependencies`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

Community node packages must declare their n8n integration via `peerDependencies` so that they resolve against the host n8n installation rather than bundling their own copy. The only permitted entries are:

- `n8n-workflow` — required, must be exactly `"*"` (no pinned or ranged versions)
- `ai-node-sdk` — optional, present only for AI nodes (its shape is validated by [`ai-node-package-json`](ai-node-package-json.md))

Any other entry (notably `n8n-core`) is flagged because it causes duplicate or incompatible copies of n8n internals to be loaded at runtime.

The rule checks:

- `peerDependencies` is present in `package.json`
- `n8n-workflow` is listed with value `"*"`
- No other packages (besides `ai-node-sdk`) appear in `peerDependencies`

## Examples

### ❌ Incorrect

```json
{
  "name": "n8n-nodes-example"
}
```

```json
{
  "name": "n8n-nodes-example",
  "peerDependencies": {
    "n8n-workflow": "^1.0.0"
  }
}
```

```json
{
  "name": "n8n-nodes-example",
  "peerDependencies": {
    "n8n-workflow": "*",
    "n8n-core": "*"
  }
}
```

### ✅ Correct

```json
{
  "name": "n8n-nodes-example",
  "peerDependencies": {
    "n8n-workflow": "*"
  }
}
```

```json
{
  "name": "n8n-nodes-my-ai-node",
  "peerDependencies": {
    "n8n-workflow": "*",
    "ai-node-sdk": "*"
  }
}
```
