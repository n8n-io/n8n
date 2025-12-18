# Error Output in n8n: How to Use "Continue on Error" with Error Output

## Quick Reference

**TL;DR - Node Implementation:**

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const result = await doSomething(items[i]);
      returnData.push({ json: result, pairedItem: { item: i } });
    } catch (error) {
      if (this.continueOnFail()) {
        returnData.push({
          json: { error: error.message },
          pairedItem: { item: i },  // ← CRITICAL!
        });
        continue;
      }
      throw error;
    }
  }
  return [returnData];
}
```

**In the UI:**
1. Node settings → "On Error" → Select "Continue (using error output)"
2. Connect node's **regular output** to success handlers
3. Connect node's **error output** to error handlers
4. Error data flows to error output with original item index preserved

---

## Overview

In n8n workflows, when a node encounters an error, you have three options for how to handle it:

1. **Stop Workflow** (default) - Stops the entire workflow execution
2. **Continue (regular output)** - Continues with the node's input data
3. **Continue (using error output)** - Continues with the error passed to a dedicated error output port

## Setting Up Error Output

### 1. Configure the Node's Error Handling

In the node settings (the gear icon in the UI), look for the **"On Error"** option:

```typescript
// From: packages/frontend/editor-ui/src/features/ndv/shared/ndv.utils.ts
{
  displayName: 'On Error',
  name: 'onError',
  type: 'options',
  options: [
    {
      name: 'Stop Workflow',
      value: 'stopWorkflow',
    },
    {
      name: 'Continue (regular output)',
      value: 'continueRegularOutput',
    },
    {
      name: 'Continue (using error output)',
      value: 'continueErrorOutput',  // <- This is what you need
    },
  ],
  default: 'stopWorkflow',
}
```

**Select**: `Continue (using error output)`

### 2. Understanding the Error Output Port

When you select `continueErrorOutput`, the node will automatically get an additional output port for errors:

```typescript
// From: packages/workflow/src/node-helpers.ts
if (node.onError === 'continueErrorOutput') {
  // The node gets additional output ports:
  // - Port 0: "Success" (regular output data)
  // - Port N: "Error" (error data with category='error')

  outputs = deepCopy(outputs);
  if (outputs.length === 1) {
    outputs[0].displayName = 'Success';
  }
  return [
    ...outputs,
    {
      category: 'error',
      displayName: 'Error',
      type: 'main',
    },
  ];
}
```

## Error Output Structure

When an error occurs and is sent to the error output:

```typescript
// The error data structure from: packages/core/src/execution-engine/workflow-execute.ts
{
  json: {
    error: {
      message: string,        // Error message
      stack?: string,         // Stack trace
      // ... other error properties
    }
  },
  pairedItem: {
    item: number              // Index of the item that caused the error
  }
}
```

## How It Works in the Workflow Engine

### Step 1: Node Execution with Error

When a node encounters an error and `onError === 'continueErrorOutput'`:

```typescript
// From: packages/core/src/execution-engine/workflow-execute.ts (line 1870)
if (
  executionData.node.continueOnFail === true ||
  ['continueRegularOutput', 'continueErrorOutput'].includes(
    executionData.node.onError || '',
  )
) {
  // Workflow continues - don't stop execution
  if (Object.hasOwn(executionData.data, 'main') &&
      executionData.data.main.length > 0) {
    // Get input data to pass through
    if (executionData.data.main[0] !== null) {
      nodeSuccessData = [executionData.data.main[0]];
    }
  }
}
```

### Step 2: Error Output Handling

The error is processed and split into success and error items:

```typescript
// From: packages/core/src/execution-engine/workflow-execute.ts (line 2482)
handleNodeErrorOutput(workflow, executionData, nodeSuccessData, runIndex) {
  // Separate error items from success items
  const errorItems: INodeExecutionData[] = [];
  const successItems: INodeExecutionData[] = [];

  // Check each item for error data
  for (const item of nodeSuccessData) {
    let errorData = undefined;

    // Check multiple error formats:
    if (item.error) {
      errorData = item.error;
    } else if (item.json.error && Object.keys(item.json).length === 1) {
      errorData = item.json.error;
    } else if (item.json.error && item.json.message &&
               Object.keys(item.json).length === 2) {
      errorData = item.json.error;
    }

    if (errorData) {
      // This item has an error, add to error output
      errorItems.push(item);
    } else {
      // This item is successful
      successItems.push(item);
    }
  }

  // successItems go to regular output
  // errorItems go to error output
}
```

## What to Do Inside the Node

### Step 1: Wrap Your Logic in Try-Catch

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      // Your node logic here
      const result = await someApiCall(items[i].json);

      // If successful, add to return data
      returnData.push({
        json: result,
        pairedItem: { item: i },
      });
    } catch (error) {
      // Error handling happens here
    }
  }

  return [returnData];
}
```

### Step 2: Handle Errors Based on Configuration

Check if error output is enabled using `this.continueOnFail()`:

```typescript
catch (error) {
  // Check if error handling is configured to continue
  if (this.continueOnFail()) {
    // Continue with error output (error output port is enabled)
    returnData.push({
      json: {
        error: error.message,
      },
      pairedItem: {
        item: i,  // Critical: link error to the original item
      },
    });
    continue;  // Skip to next item
  }

  // If not configured to continue, throw the error
  throw error;
}
```

### Complete Working Example

```typescript
// From: packages/nodes-base/nodes/ExecuteCommand/ExecuteCommand.node.ts

async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnItems: INodeExecutionData[] = [];

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    try {
      const command = this.getNodeParameter('command', itemIndex) as string;

      // Perform the operation
      const result = await executeCommand(command);

      // Success: add to return data with metadata
      returnItems.push({
        json: result,
        pairedItem: { item: itemIndex },
      });
    } catch (error) {
      // Error handling
      if (this.continueOnFail()) {
        // Add error to return data instead of throwing
        returnItems.push({
          json: {
            error: error.message,
          },
          pairedItem: {
            item: itemIndex,
          },
        });
        continue;
      }

      // Not configured to continue, throw error
      throw error;
    }
  }

  return [returnItems];
}
```

### Using Helper Methods (Recommended)

For better metadata tracking, use `this.helpers.constructExecutionMetaData`:

```typescript
// From: packages/nodes-base/nodes/Odoo/Odoo.node.ts

async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const result = await someOperation(items[i].json);

      // Success case
      const executionData = this.helpers.constructExecutionMetaData(
        this.helpers.returnJsonArray(result),
        { itemData: { item: i } },
      );
      returnData.push(...executionData);
    } catch (error) {
      if (this.continueOnFail()) {
        // Error case with metadata
        const executionData = this.helpers.constructExecutionMetaData(
          this.helpers.returnJsonArray({ error: error.message }),
          { itemData: { item: i } },
        );
        returnData.push(...executionData);
        continue;
      }
      throw error;
    }
  }

  return [returnData];
}
```

## Key Implementation Details

### Required: `pairedItem` Property

The `pairedItem` is **critical** for error output to work correctly:

```typescript
returnData.push({
  json: {
    error: error.message,
  },
  pairedItem: {
    item: i,  // Index of the input item that caused the error
  },
});
```

This allows the error to be routed to the error output port and correlated with the original input data.

### Data Structure for Errors

Multiple formats are supported by the error detection logic:

```typescript
// Format 1: Direct error property
{
  json: { ... },
  error: new Error('message'),
  pairedItem: { item: 0 }
}

// Format 2: Error in JSON (single key)
{
  json: {
    error: { message: 'API error' }
  },
  pairedItem: { item: 0 }
}

// Format 3: Error in JSON (error + message keys)
{
  json: {
    error: { message: 'API error' },
    message: 'Additional info'
  },
  pairedItem: { item: 0 }
}
```

### Workflow After Error Output

In the workflow UI:
1. Connect the node's **regular output** (labeled "Success") to handlers for successful items
2. Connect the node's **error output** (labeled "Error") to handlers for failed items

The error output automatically contains:
```typescript
{
  json: {
    error: { message: string, ... }  // Error details
  },
  pairedItem: {
    item: 0  // Index of the original input item
  }
}
```

### Processing Error Data in Downstream Nodes

```typescript
// In a node connected to the error output port

async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();

  for (const item of items) {
    // Access error information
    const errorMessage = item.json.error?.message;
    const originalItemIndex = item.pairedItem.item;

    // Log or process the error
    console.log(`Item ${originalItemIndex} failed: ${errorMessage}`);
  }

  return [items];
}
```

## Practical Example

### Node Configuration in Workflow JSON

```json
{
  "name": "My API Call",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4,
  "position": [100, 200],
  "onError": "continueErrorOutput",
  "parameters": {
    "url": "https://api.example.com/data",
    "method": "GET"
  }
}
```

### Flow Diagram

```
Input Items
    ↓
API Call Node (onError: continueErrorOutput)
    ↙ Success                    ↘ Error
    ↓                             ↓
Success Handler              Error Handler
(processes items)            (handles errors)
```

## Difference: continueOnFail vs continueErrorOutput

| Feature | `continueOnFail` | `continueErrorOutput` |
|---------|------------------|----------------------|
| **When Error Occurs** | Passes input data to next node | Passes error data to error port |
| **Data Passed** | Original input (line 1883) | Error details + paired item |
| **Use Case** | Fallback to original data | Detailed error handling |
| **Connection** | Single output | Dual outputs (success + error) |

From workflow-execute.ts line 1883:
```typescript
// continueOnFail or continueRegularOutput:
if (executionData.data.main[0] !== null) {
  nodeSuccessData = [executionData.data.main[0]];  // <- Input data
}

// continueErrorOutput:
// Error is separated into error output port
```

## Key Implementation Details

### Error Detection Logic (line 2482)

The system detects errors in three formats:

1. **Native error format**: `item.error` property
2. **JSON error (single key)**: `{ error: {...} }`
3. **JSON error (two keys)**: `{ error: {...}, message: "..." }`

### Paired Items

Each error item maintains a reference to the original input that caused the error:

```typescript
pairedItem: {
  item: 0,  // Index of the input item
  input: 0  // Optional input connection index
}
```

This allows you to correlate errors with their source data and implement sophisticated error recovery workflows.

## Common Patterns

### Pattern 1: Simple Error Wrapping

For quick error handling without complex metadata:

```typescript
catch (error) {
  if (this.continueOnFail()) {
    returnData.push({
      json: { error: error.message },
      pairedItem: { item: i },
    });
    continue;
  }
  throw error;
}
```

### Pattern 2: Using Helpers (Recommended)

For consistency with n8n standards and proper metadata handling:

```typescript
catch (error) {
  if (this.continueOnFail()) {
    const executionData = this.helpers.constructExecutionMetaData(
      this.helpers.returnJsonArray({ error: error.message }),
      { itemData: { item: i } },
    );
    returnData.push(...executionData);
    continue;
  }
  throw error;
}
```

### Pattern 3: Preserving Input Data with Error

When you want to include the original input along with error info:

```typescript
catch (error) {
  if (this.continueOnFail()) {
    returnData.push({
      json: {
        ...items[i].json,  // Preserve original input
        _error: error.message,
      },
      pairedItem: { item: i },
    });
    continue;
  }
  throw error;
}
```

## Troubleshooting

### Problem: Error Output Port Not Showing

**Cause**: `onError` is not set to `'continueErrorOutput'` in the node configuration.

**Solution**:
1. Open the node settings (gear icon)
2. Look for "On Error" option
3. Select "Continue (using error output)"

### Problem: Errors Still Stopping the Workflow

**Cause**: Not checking `this.continueOnFail()` before throwing the error.

**Solution**: Ensure your catch block checks `this.continueOnFail()`:

```typescript
catch (error) {
  // ✗ Wrong: Always throws
  throw error;

  // ✓ Correct: Only throws if not configured
  if (this.continueOnFail()) {
    returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
    continue;
  }
  throw error;
}
```

### Problem: Errors Going to Success Output Instead of Error Output

**Cause**: Missing or incorrect `pairedItem` property.

**Solution**: Always include `pairedItem` when handling errors:

```typescript
// ✗ Wrong: Missing pairedItem
returnData.push({
  json: { error: error.message },
});

// ✓ Correct: Includes pairedItem
returnData.push({
  json: { error: error.message },
  pairedItem: { item: i },  // <- Critical!
});
```

### Problem: Can't Correlate Errors to Original Input

**Cause**: Not including the original item index in `pairedItem`.

**Solution**: Always store the loop index in `pairedItem.item`:

```typescript
for (let i = 0; i < items.length; i++) {
  try {
    // ...
  } catch (error) {
    if (this.continueOnFail()) {
      returnData.push({
        json: { error: error.message },
        pairedItem: { item: i },  // <- Use current loop index
      });
      continue;
    }
    throw error;
  }
}
```

### Problem: Error Format Not Recognized

**Cause**: Error data in unsupported format. The system recognizes three formats:

**Solution**: Use one of the supported formats:

```typescript
// ✓ Format 1: Direct error property
{ error: new Error('msg'), pairedItem: { item: 0 } }

// ✓ Format 2: error in json (single key)
{ json: { error: { message: 'msg' } }, pairedItem: { item: 0 } }

// ✓ Format 3: error + message in json
{ json: { error: { message: 'msg' }, message: 'info' }, pairedItem: { item: 0 } }

// ✗ Unsupported: error with other properties
{ json: { error: 'msg', other: 'data' }, pairedItem: { item: 0 } }
```

## Comparison with Other Error Handling Options

| Option | Behavior | Use Case |
|--------|----------|----------|
| **Stop Workflow** | Stops immediately on error | Simple workflows, errors need attention |
| **Continue (regular output)** | Passes input data forward | Fallback to original data, simple retries |
| **Continue (error output)** | Dedicated error handling path | Complex error workflows, detailed error processing |

## Best Practices

1. **Always include `pairedItem`** - Essential for error routing and correlation
2. **Use `this.continueOnFail()` check** - Allows users to control error behavior
3. **Use `constructExecutionMetaData` helper** - Maintains consistency and metadata
4. **Log meaningful error messages** - Include context that helps debugging
5. **Test error paths** - Verify errors route to error output correctly
6. **Document error scenarios** - Help users understand what errors mean

## Example: Real-World Implementation

```typescript
// From: packages/nodes-base/nodes/SentryIo/SentryIo.node.ts

async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      // Extract parameters
      const organizationSlug = this.getNodeParameter('organizationSlug', i) as string;
      const projectSlug = this.getNodeParameter('projectSlug', i) as string;

      // Make API call
      const responseData = await sendToSentry(organizationSlug, projectSlug);

      // Success: add to return data with metadata
      const executionData = this.helpers.constructExecutionMetaData(
        this.helpers.returnJsonArray(responseData),
        { itemData: { item: i } },
      );
      returnData.push(...executionData);
    } catch (error) {
      if (this.continueOnFail()) {
        // Error: add to return data with proper error format
        const executionErrorData = this.helpers.constructExecutionMetaData(
          this.helpers.returnJsonArray({ error: error.message }),
          { itemData: { item: i } },
        );
        returnData.push(...executionErrorData);
        continue;
      }

      // Not configured to continue, throw error
      throw error;
    }
  }

  return [returnData];
}
```

## Summary

- **Set** `onError: 'continueErrorOutput'` in node settings (UI or JSON)
- **Inside the node**, wrap logic in **try-catch**
- **In catch block**, check `this.continueOnFail()`
- **If true**, create error item with `json: { error: ... }` and `pairedItem: { item: i }`
- **Push to returnData** and `continue` to next item
- **If false**, throw the error
- **Connect** success output to success handlers
- **Connect** error output to error handlers
- **Downstream nodes** receive error data with `pairedItem` correlation

This approach enables sophisticated error handling workflows while keeping the main execution path separate from error handling logic.
