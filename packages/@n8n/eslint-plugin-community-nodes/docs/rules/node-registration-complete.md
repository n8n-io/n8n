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

## Versioned nodes

A versioned node has a single entry file whose class extends `VersionedNodeType`
and pulls in its per-version implementations (`v1/…V1.node.ts`,
`v2/…V2.node.ts`, …) through relative imports. n8n discovers those versions via
the entry file, so **only the entry file needs an `n8n.nodes` entry**. The rule
follows the entry file's imports and treats the imported implementation files as
registered, so they are not flagged even though they are not listed in
`n8n.nodes` directly.

```
nodes/Foo/Foo.node.ts        <- entry file, extends VersionedNodeType
nodes/Foo/v1/FooV1.node.ts   <- imported by the entry file
nodes/Foo/v2/FooV2.node.ts   <- imported by the entry file
```

```json
{
  "name": "n8n-nodes-my-service",
  "n8n": {
    "nodes": ["dist/nodes/Foo/Foo.node.js"]
  }
}
```
