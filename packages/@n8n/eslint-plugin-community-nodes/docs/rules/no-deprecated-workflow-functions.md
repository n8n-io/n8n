# Disallow usage of deprecated functions and types from n8n-workflow package (`@n8n/community-nodes/no-deprecated-workflow-functions`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## Rule Details

Prevents usage of deprecated functions from n8n-workflow package and suggests modern alternatives.

## Examples

### ❌ Incorrect

```typescript
import { NodeOperationError } from 'n8n-workflow';

export class MyNode implements INodeType {
  async execute(this: IExecuteFunctions) {
    throw new NodeOperationError(this.getNode(), 'Error occurred');
  }
}
```

### ✅ Correct

```typescript
import { NodeOperationError } from 'n8n-workflow';

export class MyNode implements INodeType {
  async execute(this: IExecuteFunctions) {
    throw new NodeOperationError(this.getNode(), 'Error occurred', {
      itemIndex: 0,
    });
  }
}
```
