# Node Retries with Connected Nodes in n8n

## Overview

Node retry functionality in n8n allows nodes to automatically retry on failure. When a node has connected nodes (e.g., tool invocations within AI agents), special considerations are needed to ensure retries work correctly.

## Retry Configuration

Nodes can be configured with retry settings via the `INode` interface:

```typescript
export interface INode {
  retryOnFail?: boolean;      // Enable retry on failure
  maxTries?: number;          // Number of retry attempts (clamped to 2-5)
  waitBetweenTries?: number;  // Milliseconds between retries (clamped to 0-5000)
  // ... other properties
}
```

### Configuration Limits

The retry configuration has built-in constraints:

- **maxTries**: Clamped between 2 and 5 (defaults to 3)
  - Minimum 2 ensures at least one retry
  - Maximum 5 prevents excessive retry attempts
- **waitBetweenTries**: Clamped between 0ms and 5000ms (defaults to 1000ms)
  - Allows waiting between retries to avoid overwhelming failing services

## Retry Behavior at Workflow Level

In `packages/core/src/execution-engine/workflow-execute.ts`, the main execution loop implements retry logic:

```typescript
let maxTries = 1;
if (executionData.node.retryOnFail === true) {
  maxTries = Math.min(5, Math.max(2, executionData.node.maxTries || 3));
}

let waitBetweenTries = 0;
if (executionData.node.retryOnFail === true) {
  waitBetweenTries = Math.min(5000, Math.max(0, executionData.node.waitBetweenTries || 1000));
}

for (let tryIndex = 0; tryIndex < maxTries; tryIndex++) {
  try {
    // Node execution logic
    const runNodeData = await this.runNode(workflow, executionData, ...);
    // Handle success
    break; // Exit retry loop on success
  } catch (error) {
    // Handle error and retry
  }
}
```

## Retry Behavior for Connected Nodes (AI Tools)

When a node has connected sub-nodes (like tools invoked by an AI agent), retry logic is handled in `packages/core/src/execution-engine/node-execution-context/utils/get-input-connection-data.ts`.

### Implementation Pattern

```typescript
export function makeHandleToolInvocation(
  contextFactory: (runIndex: number) => ISupplyDataFunctions,
  node: INode,
  nodeType: INodeType,
  runExecutionData: IRunExecutionData,
) {
  let runIndex = getNextRunIndex(runExecutionData, node.name);

  return async (toolArgs: IDataObject) => {
    let maxTries = 1;
    if (node.retryOnFail === true) {
      maxTries = Math.min(5, Math.max(2, node.maxTries ?? 3));
    }

    let waitBetweenTries = 0;
    if (node.retryOnFail === true) {
      waitBetweenTries = Math.min(5000, Math.max(0, node.waitBetweenTries ?? 1000));
    }

    let lastError: NodeOperationError | undefined;

    for (let tryIndex = 0; tryIndex < maxTries; tryIndex++) {
      const localRunIndex = runIndex++;
      const context = contextFactory(localRunIndex);
      const abortSignal = context.getExecutionCancelSignal?.();

      // Check cancellation before retry
      if (abortSignal?.aborted) {
        return 'Error during node execution: Execution was cancelled';
      }

      if (tryIndex !== 0 && waitBetweenTries !== 0) {
        try {
          await sleepWithAbort(waitBetweenTries, abortSignal);
        } catch (abortError) {
          return 'Error during node execution: Execution was cancelled';
        }
      }

      try {
        const result = await nodeType.execute?.call(context as unknown as IExecuteFunctions);
        // Success handling
        return JSON.stringify(response);
      } catch (error) {
        // Error handling and retry
        lastError = new NodeOperationError(node, error as Error);

        if (tryIndex === maxTries - 1) {
          throw lastError;
        }
      }
    }
  };
}
```

## Key Principles for Correct Retry Implementation

### 1. **Increment Run Index on Each Attempt**

Each retry attempt creates a new run index to keep execution data separate:

```typescript
let runIndex = getNextRunIndex(runExecutionData, node.name);

for (let tryIndex = 0; tryIndex < maxTries; tryIndex++) {
  const localRunIndex = runIndex++;  // Increment for each attempt
  const context = contextFactory(localRunIndex);
  // ...
}
```

This ensures that:
- Each attempt's output is stored separately in `runExecutionData.resultData.runData[nodeName]`
- Multiple invocations of the same tool are tracked independently
- The execution history shows all retry attempts

### 2. **Handle Execution Cancellation**

Always check for abort signals before and during retry:

```typescript
const abortSignal = context.getExecutionCancelSignal?.();

// Check before starting
if (abortSignal?.aborted) {
  return 'Error during node execution: Execution was cancelled';
}

// Check during wait between retries
if (waitBetweenTries !== 0) {
  try {
    await sleepWithAbort(waitBetweenTries, abortSignal);
  } catch (abortError) {
    return 'Error during node execution: Execution was cancelled';
  }
}

// Check during execution
if (abortSignal?.aborted) {
  throw new NodeOperationError(node, 'Execution was cancelled');
}
```

### 3. **Proper Error Handling and Propagation**

- Store the last error from each failed attempt
- Throw the error only on the final attempt
- On earlier attempts, log the error but continue retrying
- On final attempt, include detailed error information

```typescript
let lastError: NodeOperationError | undefined;

for (let tryIndex = 0; tryIndex < maxTries; tryIndex++) {
  try {
    // execution
    return JSON.stringify(response);
  } catch (error) {
    lastError = new NodeOperationError(node, error as Error);

    if (tryIndex === maxTries - 1) {
      // Last attempt - throw the error
      if (lastError.description && !lastError.message.includes(lastError.description)) {
        lastError.message = `${lastError.message}\n\nDetails: ${lastError.description}`;
      }
      throw lastError;
    }
    // Earlier attempts - continue loop
  }
}
```

### 4. **Context and Output Data Management**

For each retry attempt:

1. Create a new context with the current run index
2. Add input data to the context
3. Execute the node/tool
4. Add output data to the context (both success and error cases)

```typescript
context.addInputData(NodeConnectionTypes.AiTool, [[{ json: toolArgs }]]);

try {
  const result = await nodeType.execute?.call(context as unknown as IExecuteFunctions);
  // ... process result
  context.addOutputData(NodeConnectionTypes.AiTool, localRunIndex, [
    [{ json: { response } }],
  ]);
} catch (error) {
  context.addOutputData(NodeConnectionTypes.AiTool, localRunIndex, nodeError);
  // ...
}
```

### 5. **Wait Between Retries**

Implement proper wait timing:

```typescript
if (tryIndex !== 0 && waitBetweenTries !== 0) {
  try {
    await sleepWithAbort(waitBetweenTries, abortSignal);
  } catch (abortError) {
    // Handle cancellation during wait
    return 'Error during node execution: Execution was cancelled';
  }
}
```

## Configuration Clamping

Always clamp retry configuration to defined limits:

```typescript
// Clamp maxTries to 2-5
maxTries = Math.min(5, Math.max(2, node.maxTries ?? 3));

// Clamp waitBetweenTries to 0-5000ms
waitBetweenTries = Math.min(5000, Math.max(0, node.waitBetweenTries ?? 1000));
```

This prevents:
- Infinite loops (maxTries too high)
- No meaningful retry (maxTries too low)
- Excessive wait times (waitBetweenTries too high)

## Testing Retry Functionality

When testing retry logic, use these patterns:

```typescript
// Test: Retry succeeds after initial failure
const connectedNodeType = mock<INodeType>({
  execute: jest
    .fn()
    .mockRejectedValueOnce(new Error('First attempt fails'))
    .mockResolvedValueOnce([[{ json: { result: 'success' } }]]),
});

// Test: Exceeding maxTries throws error
const connectedNodeType = mock<INodeType>({
  execute: jest.fn().mockRejectedValue(new Error('Persistent error')),
});
// Expect to throw after maxTries attempts

// Test: Respecting maxTries limits
const testCases = [
  { maxTries: 1, expected: 2 }, // Clamped to minimum
  { maxTries: 3, expected: 3 },
  { maxTries: 6, expected: 5 }, // Clamped to maximum
];

// Test: Abort signal handling
abortController.abort();
// Expect immediate cancellation
```

## Common Pitfalls to Avoid

1. **Not incrementing run index on retries**
   - This causes output data to overwrite instead of accumulate
   - All retry attempts appear as single execution

2. **Not checking abort signals**
   - Retries continue even when execution should be cancelled
   - Wastes resources and creates unexpected delays

3. **Not storing separate error context per attempt**
   - Hard to debug which attempt failed and why
   - Error information gets lost

4. **Not respecting configuration limits**
   - Can cause infinite loops or excessive load
   - User configuration not validated

5. **Not handling wait timing correctly**
   - Can cause abrupt execution if not checking for abort during wait
   - Can cause long unexpected delays

6. **Not properly propagating error details**
   - Missing context for troubleshooting
   - Unclear error messages to users

## Example: Implementing Retry for Connected Nodes

```typescript
async function invokeConnectedNode(
  node: INode,
  nodeType: INodeType,
  toolArgs: IDataObject,
  contextFactory: (runIndex: number) => ISupplyDataFunctions,
  runExecutionData: IRunExecutionData,
): Promise<string> {
  // 1. Calculate retry limits
  let maxTries = 1;
  if (node.retryOnFail === true) {
    maxTries = Math.min(5, Math.max(2, node.maxTries ?? 3));
  }

  let waitBetweenTries = 0;
  if (node.retryOnFail === true) {
    waitBetweenTries = Math.min(5000, Math.max(0, node.waitBetweenTries ?? 1000));
  }

  let runIndex = getNextRunIndex(runExecutionData, node.name);
  let lastError: NodeOperationError | undefined;

  // 2. Retry loop
  for (let tryIndex = 0; tryIndex < maxTries; tryIndex++) {
    const localRunIndex = runIndex++;
    const context = contextFactory(localRunIndex);
    const abortSignal = context.getExecutionCancelSignal?.();

    // 3. Check cancellation before attempt
    if (abortSignal?.aborted) {
      throw new NodeOperationError(node, 'Execution was cancelled');
    }

    // 4. Wait before retry (if not first attempt)
    if (tryIndex !== 0 && waitBetweenTries !== 0) {
      try {
        await sleepWithAbort(waitBetweenTries, abortSignal);
      } catch {
        throw new NodeOperationError(node, 'Execution was cancelled during wait');
      }
    }

    // 5. Add input and execute
    context.addInputData(NodeConnectionTypes.AiTool, [[{ json: toolArgs }]]);

    try {
      const result = await nodeType.execute?.call(context as unknown as IExecuteFunctions);
      const { response } = mapResult(result);

      // 6. Add output and return on success
      context.addOutputData(NodeConnectionTypes.AiTool, localRunIndex, [
        [{ json: { response } }],
      ]);

      return JSON.stringify(response);
    } catch (error) {
      // 7. Store error and handle
      const nodeError = new NodeOperationError(node, error as Error);
      context.addOutputData(NodeConnectionTypes.AiTool, localRunIndex, nodeError);
      lastError = nodeError;

      // 8. Throw on final attempt
      if (tryIndex === maxTries - 1) {
        throw nodeError;
      }

      // 9. Otherwise continue retry loop
    }
  }

  // Should not reach here
  throw lastError ?? new NodeOperationError(node, 'Unknown error');
}
```

## Clarification: The Role of `execute()` vs Retries

### Important Distinction

**Retries are NOT handled inside your node's `execute()` method.** This is a critical point of confusion.

#### Where NOT to Handle Retries

You do NOT need to implement retry logic in:

```typescript
// ❌ WRONG - Don't implement retry logic here
export class MyNode implements INodeType {
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // Your node logic
    // The framework handles retries, NOT you
    return [[{ json: { result: 'success' } }]];
  }
}
```

#### Where Retries ARE Handled

**The framework handles retries automatically** at two levels:

##### 1. **Main Workflow Execution Level** (`workflow-execute.ts`)
When a regular node has `retryOnFail: true`:

```typescript
// In packages/core/src/execution-engine/workflow-execute.ts (lines ~1600-1720)
let maxTries = 1;
if (executionData.node.retryOnFail === true) {
  maxTries = Math.min(5, Math.max(2, executionData.node.maxTries || 3));
}

let waitBetweenTries = 0;
if (executionData.node.retryOnFail === true) {
  waitBetweenTries = Math.min(5000, Math.max(0, executionData.node.waitBetweenTries || 1000));
}

for (let tryIndex = 0; tryIndex < maxTries; tryIndex++) {
  try {
    if (tryIndex !== 0 && waitBetweenTries !== 0) {
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(undefined);
        }, waitBetweenTries);
      });
    }

    // Call your node's execute() method
    const runNodeData = await this.runNode(
      workflow,
      executionData,
      this.runExecutionData,
      runIndex,
      this.additionalData,
      this.mode,
      this.abortController.signal,
    );

    // Check if node failed
    let nodeFailed = runNodeData.data?.[0]?.[0]?.json?.error !== undefined;

    // If failed, retry loop continues automatically
    // If succeeded, break out of retry loop
  } catch (error) {
    // Error handling
    if (tryIndex === maxTries - 1) {
      throw error; // Throw on final attempt
    }
    // Otherwise continue retry loop
  }
}
```

**Your job:** Just return success/error normally. The framework retries if needed.

##### 2. **Connected Nodes (AI Tools) Level** (`get-input-connection-data.ts`)
When a node invokes connected sub-nodes (tools in AI agents), retries happen at invocation time:

```typescript
// In packages/core/src/execution-engine/node-execution-context/utils/get-input-connection-data.ts
export function makeHandleToolInvocation(
  contextFactory: (runIndex: number) => ISupplyDataFunctions,
  node: INode,
  nodeType: INodeType,
  runExecutionData: IRunExecutionData,
) {
  let runIndex = getNextRunIndex(runExecutionData, node.name);

  return async (toolArgs: IDataObject) => {
    let maxTries = 1;
    if (node.retryOnFail === true) {
      maxTries = Math.min(5, Math.max(2, node.maxTries ?? 3));
    }

    let waitBetweenTries = 0;
    if (node.retryOnFail === true) {
      waitBetweenTries = Math.min(5000, Math.max(0, node.waitBetweenTries ?? 1000));
    }

    let lastError: NodeOperationError | undefined;

    for (let tryIndex = 0; tryIndex < maxTries; tryIndex++) {
      const localRunIndex = runIndex++;
      const context = contextFactory(localRunIndex);
      const abortSignal = context.getExecutionCancelSignal?.();

      if (abortSignal?.aborted) {
        return 'Error during node execution: Execution was cancelled';
      }

      if (tryIndex !== 0 && waitBetweenTries !== 0) {
        try {
          await sleepWithAbort(waitBetweenTries, abortSignal);
        } catch (abortError) {
          return 'Error during node execution: Execution was cancelled';
        }
      }

      context.addInputData(NodeConnectionTypes.AiTool, [[{ json: toolArgs }]]);

      try {
        // Call the tool node's execute() method
        const result = await nodeType.execute?.call(context as unknown as IExecuteFunctions);
        const { response } = mapResult(result);

        context.addOutputData(NodeConnectionTypes.AiTool, localRunIndex, [
          [{ json: { response } }],
        ]);

        return JSON.stringify(response);
      } catch (error) {
        const nodeError = new NodeOperationError(node, error as Error);
        context.addOutputData(NodeConnectionTypes.AiTool, localRunIndex, nodeError);
        lastError = nodeError;

        if (tryIndex === maxTries - 1) {
          throw nodeError;
        }
        // Otherwise continue retry loop
      }
    }
  };
}
```

**Your job:** Just return success/error normally. The framework retries if needed.

### What Your Node Should Do

Your `execute()` and `supplyData()` methods should be simple and follow these rules:

#### For `execute()` method:

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  try {
    // 1. Get your inputs
    const input = this.getNodeParameter('input', 0);

    // 2. Do your work (API call, calculation, etc.)
    const result = await doWork(input);

    // 3. Return results or error
    if (result.success) {
      return [[{ json: result.data }]];
    } else {
      // Return error as JSON
      return [[{ json: { error: result.error } }]];
    }
  } catch (error) {
    // Or throw the error - framework will handle retry
    throw error;
  }
}
```

#### For `supplyData()` method:

```typescript
async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
  try {
    // 1. Get your inputs
    const config = this.getNodeParameter('config', 0);

    // 2. Do your work
    const data = await fetchData(config);

    // 3. Return the supply data
    return {
      data: data,
      noData: false,
    };
  } catch (error) {
    // Or throw the error - framework will handle retry
    throw error;
  }
}
```

### Key Points

1. **You don't implement retry logic in your methods** - the framework does
2. **Your methods should just succeed or fail normally**
3. **If `node.retryOnFail === true`, the framework will:**
   - Call your method up to `maxTries` times (clamped 2-5)
   - Wait `waitBetweenTries` ms between attempts (clamped 0-5000ms)
   - Throw the error only on the final attempt
   - Track each attempt separately in execution data

### When Retries Happen

| Scenario | Framework | Your Method |
|----------|-----------|------------|
| Main node execution | ✅ Retries automatically at `workflow-execute.ts` level | ✅ Called 1-N times (N = maxTries) |
| Connected node invocation | ✅ Retries automatically at `get-input-connection-data.ts` level | ✅ Called 1-N times (N = maxTries) |
| Your node's `execute()` | ❌ You don't implement | ✅ Just return data or throw |
| Your node's `supplyData()` | ❌ You don't implement | ✅ Just return data or throw |

### Example: Correct Implementation

```typescript
export class MyToolNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'My Tool',
    name: 'myTool',
    group: ['tools'],
    // ... node settings ...
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const input = this.getNodeParameter('input', 0) as string;

    try {
      // Just do the work
      const result = await externalApi.call(input);

      // Return success
      return [[{ json: { result } }]];
    } catch (error) {
      // Just throw - framework will retry if configured
      throw error;
    }
  }

  async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
    try {
      // Just get the data
      const items = await fetchItems();

      return {
        data: items.map((item) => ({ name: item.name, value: item.id })),
        noData: items.length === 0,
      };
    } catch (error) {
      // Just throw - framework will retry if configured
      throw error;
    }
  }
}
```

The framework handles:
- ✅ Retry loops
- ✅ Waiting between retries
- ✅ Checking abort signals
- ✅ Incrementing run indices
- ✅ Storing execution data
- ✅ Error propagation

You handle:
- ✅ Core business logic
- ✅ Success/error states (success = return data, error = throw)

## Summary

Implementing node retries correctly with connected nodes requires:

1. ✅ **Understanding the framework handles retries, not you**
2. ✅ **Incrementing run index on each retry attempt (framework does this)**
3. ✅ **Checking abort signals before and during retries (framework does this)**
4. ✅ **Clamping configuration to defined limits (framework does this: maxTries: 2-5, waitBetweenTries: 0-5000ms)**
5. ✅ **Storing separate execution data for each attempt (framework does this)**
6. ✅ **Handling wait times with abort signal support (framework does this)**
7. ✅ **Proper error management and propagation (framework does this)**
8. ✅ **Your code: just return success or throw errors**
9. ✅ **Comprehensive testing of all retry scenarios**

These principles ensure reliable, predictable, and cancellable retry behavior when nodes invoke connected nodes within workflows.
