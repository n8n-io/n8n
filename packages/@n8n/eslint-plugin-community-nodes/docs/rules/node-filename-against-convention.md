# Node filename must match the node `description.name` (`@n8n/community-nodes/node-filename-against-convention`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

Every `*.node.ts` file must be named after its node's `description.name`, with the
first character upper-cased. The source of truth is `description.name` — **not**
the class name. Keeping the filename in sync with the registered node name makes
nodes predictable to locate and matches the convention n8n tooling expects.

A trailing version suffix (`V2`, `V3`, …) is allowed, so versioned implementations
such as `GithubV2.node.ts` are accepted for a node whose `description.name` is
`github`.

The comparison is case-sensitive: a node named `github` must live in
`Github.node.ts`, not `github.node.ts` or `GitHub.node.ts`.

This rule is not auto-fixable because ESLint cannot rename files. Rename the file
to the reported name.

## Examples

### ❌ Incorrect

```typescript
// File: Gitlab.node.ts
export class Github implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'GitHub',
    name: 'github', // expected file to be named "Github.node.ts"
    // ...
  };
}
```

### ✅ Correct

```typescript
// File: Github.node.ts (or GithubV2.node.ts)
export class Github implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'GitHub',
    name: 'github',
    // ...
  };
}
```
