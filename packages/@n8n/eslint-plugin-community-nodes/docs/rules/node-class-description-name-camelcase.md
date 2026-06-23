# Node class `description.name` must be camelCase (`@n8n/community-nodes/node-class-description-name-camelcase`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

The `name` field inside a node class `description` (those implementing `INodeType` or extending `Node` in `*.node.ts` files) is the internal identifier used to register and reference the node. n8n convention requires this identifier to be camelCase: it must start with a lowercase letter and contain only letters and digits, with no spaces, hyphens, underscores, or other separators.

The value must match `^[a-z][a-zA-Z0-9]*$`.

The rule is automatically fixable: separators are removed, each subsequent word is upper-cased, and the first character is lower-cased (e.g. `My Node` → `myNode`). Names that cannot be repaired into a valid identifier (for example, those starting with a digit) are reported without an autofix.

## Examples

### ❌ Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'My Node',
    // ...
  };
}
```

### ✅ Correct

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    // ...
  };
}
```
