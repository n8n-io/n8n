# Disallow type-erasing casts (`as never`, `as any`, `as unknown`) on node description `inputs`/`outputs` (`@n8n/community-nodes/no-unsafe-connection-type-cast`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## Rule Details

A cast such as `inputs: ['main'] as never` compiles, so nothing in CI objects to it. It also switches off the check that makes `inputs` and `outputs` trustworthy. TypeScript stops verifying the value against `INodeTypeDescription`, and the [`node-connection-type-literal`](node-connection-type-literal.md) rule stops seeing the array, because the cast wraps it. A malformed connection declaration then reaches review and build with no automated signal at all. Removing the cast restores both checks.

There is no legitimate reason to erase the type here. Dynamic connection lists are already allowed as expression strings, and correct static lists type-check on their own:

```typescript
inputs: `={{ (${configureInputs})($parameter) }}`,
```

The rule flags `as never`, `as any` and `as unknown`, including inside a chain like `as unknown as NodeConnectionType[]`, where the intermediate `unknown` is what defeats the checker. Expressions that keep the value structurally checked are left alone: `as const`, `satisfies T` and a plain `as NodeConnectionType[]`.

A `satisfies` around a cast does not restore the check, so `['main'] as never satisfies NodeConnectionType[]` is still reported. The suggestion removes the cast and keeps the `satisfies`.

Removing the cast is offered as a suggestion rather than an autofix, because it may surface a real type error that was being suppressed. That error is the point: it is the bug the cast was hiding.

## Examples

### ❌ Incorrect

```typescript
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    inputs: ['main'] as never,
    outputs: ['main'] as never,
    properties: [],
  };
}
```

### ✅ Correct

```typescript
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class MyNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Node',
    name: 'myNode',
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    properties: [],
  };
}
```
