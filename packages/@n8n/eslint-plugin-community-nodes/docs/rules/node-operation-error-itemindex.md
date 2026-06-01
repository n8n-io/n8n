# Require { itemIndex } in NodeOperationError / NodeApiError options inside item loops (`@n8n/community-nodes/node-operation-error-itemindex`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

When throwing `NodeOperationError` or `NodeApiError` inside the item-processing loop of an `execute()` method, the options object (third argument) must contain an `itemIndex` property. Without it, n8n cannot associate the error with the specific item that caused it, which breaks per-item error reporting and `continueOnFail` behaviour.

The rule only fires inside **item loops** — `for` or `for...of` statements that iterate over the result of `this.getInputData()`. Errors thrown outside such loops (e.g. in webhook handlers, trigger setup, or credential testing helpers) are not flagged.

## Examples

### ❌ Incorrect

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = { /* ... */ };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        // ...
      } catch (error) {
        // Missing { itemIndex } — n8n cannot map this error back to item i
        throw new NodeOperationError(this.getNode(), error);
      }
    }

    return [returnData];
  }
}
```

### ✅ Correct

```typescript
export class MyNode implements INodeType {
  description: INodeTypeDescription = { /* ... */ };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        // ...
      } catch (error) {
        throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
      }
    }

    return [returnData];
  }
}
```

Using `for...of` with a named loop variable:

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];
  let itemIndex = 0;

  for (const item of items) {
    try {
      // ...
    } catch (error) {
      throw new NodeApiError(this.getNode(), error, { itemIndex });
    }
    itemIndex++;
  }

  return [returnData];
}
```
