# Ensure every `.node.ts` file in the `nodes/` directory is registered in the "n8n.nodes" array of package.json (`@n8n/community-nodes/node-registration-complete`)

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

n8n discovers the nodes in a community package from the `n8n.nodes` array in `package.json`. Any `.node.ts` file that exists in the package's `nodes/` directory but is missing from that array will be silently excluded from the published package — the node simply won't show up in n8n.

This rule cross-references the `.node.ts` files found in the `nodes/` directory against the entries in `n8n.nodes` and flags every node file that is not registered, so missing registrations are caught at lint time rather than after publishing.

## Examples

Given a package with these files on disk:

```
nodes/Foo/Foo.node.ts
nodes/Bar/Bar.node.ts
```

### ❌ Incorrect

`Bar.node.ts` exists but is not registered:

```json
{
  "name": "n8n-nodes-my-service",
  "n8n": {
    "nodes": ["dist/nodes/Foo/Foo.node.js"]
  }
}
```

### ✅ Correct

Every node file is registered:

```json
{
  "name": "n8n-nodes-my-service",
  "n8n": {
    "nodes": ["dist/nodes/Foo/Foo.node.js", "dist/nodes/Bar/Bar.node.js"]
  }
}
```

### Versioned nodes

A versioned node registers only its `VersionedNodeType` entry file. Its per-version
implementations live in subdirectories of that entry file and are pulled in by it, so
they must **not** be listed individually in `n8n.nodes`. The rule recognises this and
does not flag the version files.

Given:

```
nodes/SoterGuard/SoterGuard.node.ts
nodes/SoterGuard/v1/SoterGuardV1.node.ts
nodes/SoterGuard/v2/SoterGuardV2.node.ts
```

registering just the entry file is correct:

```json
{
  "name": "n8n-nodes-my-service",
  "n8n": {
    "nodes": ["dist/nodes/SoterGuard/SoterGuard.node.js"]
  }
}
```
