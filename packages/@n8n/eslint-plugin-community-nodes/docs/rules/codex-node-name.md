# Require the "node" field in .node.json codex files to be "<package-name>.<node-name>" (`@n8n/community-nodes/codex-node-name`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

The `node` field in a node's `.node.json` codex file identifies the node it describes. It should be the package name and the node's `name` joined by a dot, the same format n8n's built-in nodes use (`n8n-nodes-base.github`, `n8n-nodes-base.githubTrigger`). Using only the package name gives a node and its trigger the same value.

The rule follows how n8n finds a codex: it takes each file in `n8n.nodes` in `package.json`, reads the node's `name` from its description, and checks the codex next to it. n8n builds the codex path by appending `on` to the registered path, so `Foo.node.js` pairs with `Foo.node.json`. A codex in the source tree is checked against the TypeScript source next to it, even when a compiled file exists in `dist`. It can fix the value. A codex that belongs to no registered node is skipped, and when the node file is missing or its `name` isn't a plain string, the rule only checks that the value starts with the package name and a dot.

For example, with `"n8n": { "nodes": ["dist/nodes/LumaTrigger/LumaTrigger.node.js"] }` in a package named `n8n-nodes-luma`, and `name: 'lumaTrigger'` in the node's description, `LumaTrigger.node.json` needs `"node": "n8n-nodes-luma.lumaTrigger"`.

See [codex files](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/codex-files).

## Examples

### ❌ Incorrect

```json
{
  "node": "n8n-nodes-luma"
}
```

### ✅ Correct

```json
{
  "node": "n8n-nodes-luma.lumaTrigger"
}
```
