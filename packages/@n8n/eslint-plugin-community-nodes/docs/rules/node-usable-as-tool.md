# Ensure node classes have usableAsTool property (`@n8n/community-nodes/node-usable-as-tool`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

Ensures your nodes declare whether they can be used as tools in AI workflows. This property helps n8n determine if your node is suitable for AI-assisted automation.

Trigger nodes are exempt from this check, since they aren't invoked as tools. A node is treated as a trigger if `description.group` includes `'trigger'`, or (as a fallback) its class name ends with `Trigger`. A trigger node that legitimately supports tool usage can still set `usableAsTool: true` explicitly.

## Examples

### ❌ Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    group: ['input'],
    version: 1,
    // Missing usableAsTool property
    properties: [],
  };
}
```

### ✅ Correct

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    group: ['input'],
    version: 1,
    usableAsTool: true,
    properties: [],
  };
}
```
