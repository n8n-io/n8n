# Ban the "overrides" field in community node package.json (`@n8n/community-nodes/no-overrides-field`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

The `overrides` field in `package.json` forces specific versions of (transitive) dependencies. n8n installs each community package into an isolated `node_modules` tree (peer deps stripped before install, `require()` walks up from each node's compiled file), so an override in one node only affects that node's own resolution — it does **not** bleed into other nodes or into n8n core. The rule bans the field anyway because:

- **Almost always unintentional.** In practice, `overrides` blocks in community nodes are copy-pasted boilerplate from unrelated projects, sometimes alongside an empty `dependencies` so the override is a literal no-op.
- **No useful effect today.** Because of isolation, a maintainer who believes their override coordinates versions across nodes is wrong about what it does. The block is dead weight at best, actively misleading at worst.
- **Future-proofing.** If the install layout ever moves toward hoisting or partial sharing, today's "harmless" overrides start affecting other nodes' resolution. Banning the field now keeps that change safe to make.

Most community nodes do not need third-party runtime libraries at all. n8n core already provides HTTP requests (`this.helpers.httpRequest`, `this.helpers.httpRequestWithAuthentication`), credential resolution, binary data helpers, and other common building blocks via the execute context — these should be the default. `dependencies` and `peerDependencies` are restricted by [`no-runtime-dependencies`](no-runtime-dependencies.md) and [`valid-peer-dependencies`](valid-peer-dependencies.md) respectively, so neither is a workaround for `overrides`.

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
