# Understanding `addInputData()` in n8n

## Overview

`addInputData()` is a **deprecated utility function** used to manually log/track input data for connected sub-nodes (like AI tools) during execution. It's primarily used in contexts where nodes invoke other nodes and need to record what data was passed to them.

## Signature

```typescript
addInputData(
  connectionType: AINodeConnectionType,
  data: INodeExecutionData[][],
  runIndex?: number,
): { index: number }
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `connectionType` | `AINodeConnectionType` | Yes | Type of connection (e.g., `NodeConnectionTypes.AiTool`, `NodeConnectionTypes.AiOutputParser`) |
| `data` | `INodeExecutionData[][]` | Yes | The input data to log, typically `[[{ json: { ...args } }]]` |
| `runIndex` | `number` | No | Specific run index to associate with this input (defaults to current) |

### Return Value

```typescript
{ index: number }
```

Returns an object with the `index` property indicating which run index this input was assigned to.

## When to Use

### ✅ When You SHOULD Use It

**In `supplyData()` context when invoking connected nodes:**

```typescript
async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
  // When you're about to invoke a connected tool/node
  const toolArgs = { query: 'find documents', limit: 10 };

  // Log what you're sending to the tool
  const { index } = this.addInputData(NodeConnectionTypes.AiTool, [
    [{ json: toolArgs }]
  ]);

  // Then invoke the tool
  const result = await invokeToolNode(toolArgs, index);

  return {
    data: result,
    noData: false,
  };
}
```

**In LangChain utilities when calling external tools:**

```typescript
// packages/@n8n/nodes-langchain/utils/N8nTool.ts
async invoke(input: string): Promise<string> {
  const { index } = this.context.addInputData(NodeConnectionTypes.AiTool, [
    [{ json: { query: input } }]
  ]);

  const result = await this.executeNode(input);

  return result;
}
```

### ❌ When You Should NOT Use It

**In regular `execute()` methods** - the framework handles input tracking:

```typescript
// ❌ WRONG
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const input = this.getNodeParameter('input', 0);

  // Don't do this - framework already tracks inputs
  this.addInputData(NodeConnectionTypes.AiTool, [[{ json: input }]]);

  return [[{ json: { result: 'success' } }]];
}
```

**When not invoking connected nodes** - the framework handles it automatically:

```typescript
// ❌ WRONG - Framework already handles this
async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
  // Framework automatically tracks inputs in supplyData
  // Don't manually call addInputData unless you're invoking connected nodes

  return {
    data: ['item1', 'item2'],
    noData: false,
  };
}
```

## Real-World Examples

### Example 1: Retry Loop with Connected Nodes

In `get-input-connection-data.ts`, each retry attempt logs input:

```typescript
export function makeHandleToolInvocation(
  contextFactory: (runIndex: number) => ISupplyDataFunctions,
  node: INode,
  nodeType: INodeType,
  runExecutionData: IRunExecutionData,
) {
  let runIndex = getNextRunIndex(runExecutionData, node.name);

  return async (toolArgs: IDataObject) => {
    let maxTries = Math.min(5, Math.max(2, node.maxTries ?? 3));
    let waitBetweenTries = Math.min(5000, Math.max(0, node.waitBetweenTries ?? 1000));

    for (let tryIndex = 0; tryIndex < maxTries; tryIndex++) {
      const localRunIndex = runIndex++;
      const context = contextFactory(localRunIndex);

      // Log what we're sending to the tool
      // This creates a separate log entry for each retry attempt
      context.addInputData(NodeConnectionTypes.AiTool, [[{ json: toolArgs }]]);

      try {
        const result = await nodeType.execute?.call(context as unknown as IExecuteFunctions);
        const { response } = mapResult(result);

        // Log the successful output
        context.addOutputData(NodeConnectionTypes.AiTool, localRunIndex, [
          [{ json: { response } }],
        ]);

        return JSON.stringify(response);
      } catch (error) {
        const nodeError = new NodeOperationError(node, error as Error);

        // Log the error output
        context.addOutputData(NodeConnectionTypes.AiTool, localRunIndex, nodeError);

        if (tryIndex === maxTries - 1) {
          throw nodeError;
        }
      }
    }
  };
}
```

**Key Points:**
- `runIndex++` increments for each retry, so each attempt gets its own execution record
- `addInputData()` logs what was sent to the tool for that specific attempt
- `addOutputData()` logs the result (success or error) for that specific attempt
- Execution history shows all retry attempts separately

### Example 2: LangChain Tool Invocation

In `packages/@n8n/nodes-langchain/utils/N8nTool.ts`:

```typescript
export class N8nTool extends Tool {
  private context: ISupplyDataFunctions;

  async _call(input: string): Promise<string> {
    // Log the input being sent to this tool
    const { index } = this.context.addInputData(
      NodeConnectionTypes.AiTool,
      [[{ json: { query: input } }]]
    );

    try {
      // Invoke the connected node
      const result = await this.executeConnectedNode(input);

      // Log the output
      this.context.addOutputData(NodeConnectionTypes.AiTool, index, [
        [{ json: { result } }]
      ]);

      return result;
    } catch (error) {
      // Log the error
      this.context.addOutputData(
        NodeConnectionTypes.AiTool,
        index,
        new NodeOperationError(this.node, error)
      );
      throw error;
    }
  }
}
```

### Example 3: Translation Supply Provider

In `packages/@intento/translation/types/TranslationSupplier.ts`:

```typescript
export class TranslationSupplier {
  async callApi(request: IDataObject, attemptIndex: number = 0): Promise<SupplyData> {
    // Log the request being sent to the translation API
    this.supplyData.addInputData(this.connection, [[{ json: request }]], attemptIndex);

    try {
      const response = await this.apiClient.translate(request);

      // Log successful response
      this.supplyData.addOutputData(this.connection, attemptIndex, [
        [{ json: response }]
      ]);

      return {
        data: response,
        noData: false,
      };
    } catch (error) {
      // Log error
      this.supplyData.addOutputData(this.connection, attemptIndex, error);
      throw error;
    }
  }
}
```

## Data Flow

```
Execution Context Created
    ↓
addInputData() called with tool args
    ↓
Input data logged to execution history
    ↓
Connected node invoked
    ↓
addOutputData() called with result
    ↓
Output data logged to execution history
    ↓
Both input and output visible in execution trace
```

## Deprecated Warning

Note the deprecation comment in the code:

```typescript
/** @deprecated create a context object with inputData for every runIndex */
addInputData(
  connectionType: AINodeConnectionType,
  data: INodeExecutionData[][],
  runIndex?: number,
): { index: number }
```

This suggests the future approach will be:
- Create a new context object for each run index
- Pass input data directly when creating context
- No need for separate `addInputData()` call

However, the current implementation still uses it widely for tracking multi-attempt executions.

## Best Practices

### ✅ DO

1. **Call it before invoking a connected node** to log what you're sending:
```typescript
context.addInputData(NodeConnectionTypes.AiTool, [[{ json: args }]]);
const result = await nodeType.execute?.call(context);
```

2. **Increment run index for each attempt** to keep attempts separate:
```typescript
let runIndex = getNextRunIndex(runExecutionData, node.name);
for (let tryIndex = 0; tryIndex < maxTries; tryIndex++) {
  const localRunIndex = runIndex++;
  const context = contextFactory(localRunIndex);
  context.addInputData(NodeConnectionTypes.AiTool, [[{ json: toolArgs }]]);
  // ...
}
```

3. **Always pair with `addOutputData()`** to log results:
```typescript
context.addInputData(NodeConnectionTypes.AiTool, [[{ json: input }]]);
try {
  const result = await invoke(input);
  context.addOutputData(NodeConnectionTypes.AiTool, runIndex, output);
} catch (error) {
  context.addOutputData(NodeConnectionTypes.AiTool, runIndex, error);
}
```

### ❌ DON'T

1. **Don't use it in regular `execute()` methods** - framework handles it
2. **Don't forget the data format** - must be `[[{ json: {...} }]]` (nested arrays)
3. **Don't use same runIndex twice** - increment it for each separate invocation
4. **Don't call without pairing with `addOutputData()`** - leave incomplete traces

## Common Data Formats

### Single invocation
```typescript
context.addInputData(NodeConnectionTypes.AiTool, [[{ json: { query: 'search' } }]]);
```

### Multiple items
```typescript
context.addInputData(NodeConnectionTypes.AiTool, [
  [{ json: { query: 'item1' } }],
  [{ json: { query: 'item2' } }],
]);
```

### With binary data
```typescript
context.addInputData(NodeConnectionTypes.AiTool, [[{
  json: { text: 'content' },
  binary: { data: binaryDataObject }
}]]);
```

## Relationship to Other Methods

| Method | Purpose | When Called |
|--------|---------|-------------|
| `addInputData()` | Log input sent to connected node | Before invoking connected node |
| `addOutputData()` | Log output from connected node | After connected node completes |
| `getNextRunIndex()` | Get next available run index | To track separate invocations |
| `context.addInputData()` | Create context with pre-populated input | Framework use (future approach) |

## Execution History Impact

When you use `addInputData()` and `addOutputData()`, the execution history shows:

```
Node: MyTool
├── Run 0 (First attempt)
│   ├── Input: { query: 'search' }
│   └── Output: { result: 'found' }
├── Run 1 (Retry after failure)
│   ├── Input: { query: 'search' }
│   └── Output: { result: 'found' }
└── Run 2 (Retry)
    ├── Input: { query: 'search' }
    └── Output: Error: timeout
```

Each retry attempt has separate input/output logged because `runIndex` is incremented.

## Summary

- **Purpose**: Manually log input data for connected node invocations
- **When to use**: In `supplyData()` when invoking connected nodes
- **When NOT to use**: In regular `execute()` methods
- **Always pair with**: `addOutputData()` to log the result
- **Increment runIndex**: For each separate invocation/retry attempt
- **Data format**: `[[{ json: {...} }]]` (nested arrays)
- **Deprecated**: Future versions will handle this automatically with context objects

The key insight: `addInputData()` is about **tracking execution history** when your node orchestrates other nodes, not about normal data flow in your `execute()` method.
