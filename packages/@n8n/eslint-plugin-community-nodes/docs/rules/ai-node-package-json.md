# Enforce consistency between n8n.aiNodeSdkVersion and ai-node-sdk peer dependency in community node packages (`@n8n/community-nodes/ai-node-package-json`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Enforces consistency between `n8n.aiNodeSdkVersion` in `package.json` and the `ai-node-sdk` peer dependency. When a community node uses the AI Node SDK, both fields must be present and correct.

The rule checks four conditions:

- `aiNodeSdkVersion` is declared inside the `n8n` section (not at the root level)
- `aiNodeSdkVersion` is a positive integer
- If `n8n.aiNodeSdkVersion` is set, `ai-node-sdk` must appear in `peerDependencies`
- If `ai-node-sdk` is in `peerDependencies`, `n8n.aiNodeSdkVersion` must be set

## Examples

### ❌ Incorrect

```json
{
  "name": "n8n-nodes-my-ai-node",
  "n8n": {
    "aiNodeSdkVersion": "1"
  }
}
```

```json
{
  "name": "n8n-nodes-my-ai-node",
  "aiNodeSdkVersion": 1,
  "peerDependencies": {
    "ai-node-sdk": "*"
  }
}
```

```json
{
  "name": "n8n-nodes-my-ai-node",
  "peerDependencies": {
    "ai-node-sdk": "*"
  }
}
```

### ✅ Correct

```json
{
  "name": "n8n-nodes-my-ai-node",
  "n8n": {
    "aiNodeSdkVersion": 1
  },
  "peerDependencies": {
    "ai-node-sdk": "*"
  }
}
```
