# Ensure node classes have usableAsTool property (`@n8n/community-nodes/node-usable-as-tool`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Rule Details

Ensures your nodes declare whether they can be used as tools in AI workflows. This property helps n8n determine if your node is suitable for AI-assisted automation.

Trigger nodes are exempt from the "must declare `usableAsTool`" requirement, and are additionally forbidden from setting `usableAsTool: true`: trigger nodes cannot be invoked as AI tools, and doing so gets them converted into a synthetic tool variant that pollutes the AI Agent's tool picker. A node is treated as a trigger if `description.group` includes `'trigger'`, or (as a fallback) its class name ends with `Trigger`.

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

```typescript
export class MyTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Trigger',
    name: 'myTrigger',
    group: ['trigger'],
    version: 1,
    // Trigger nodes must not opt into the AI tool picker
    usableAsTool: true,
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

```typescript
export class MyTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Trigger',
    name: 'myTrigger',
    group: ['trigger'],
    version: 1,
    properties: [],
  };
}
```
