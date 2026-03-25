# Node.js Invoke Store for AWS Lambda

`@aws/lambda-invoke-store` provides a generic, per-invocation context store for
AWS Lambda Node.js Runtime Environment. It enables storing and retrieving data
within the scope of a single Lambda invocation, with proper isolation between
concurrent executions.

## Features

- **Invocation Isolation**: Safely store and retrieve data within a single Lambda invocation.
- **Protected Lambda Context**: Built-in protection for Lambda execution metadata (requestId, [traceId](https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html#xray-concepts-traces))
- **Custom Data Storage**: Store any custom data within the invocation context
- **Async/Await Support**: Full support for asynchronous operations with context preservation
- **Type Safety**: Complete TypeScript type definitions
- **Singleton Pattern**: Ensures a single shared instance across all imports
- **Global Namespace Integration**: Integrates with the Lambda runtime global namespace

## Installation

```bash
npm install @aws/lambda-invoke-store
```

## Quick Start

> **Note**: In the AWS Lambda environment, the Runtime Interface Client (RIC) automatically initializes the InvokeStore context at the beginning of each invocation. Lambda function developers typically don't need to call `InvokeStore.run()` directly.

```typescript
import { InvokeStore } from "@aws/lambda-invoke-store";

// Lambda handler with invoke store
export const handler = async (event, context) => {
  // The RIC has already initialized the InvokeStore with requestId and X-Ray traceId

  // Access Lambda context data
  const invokeStore = await InvokeStore.getInstanceAsync();
  console.log(`Processing request: ${invokeStore.getRequestId()}`);

  // Store custom data
  invokeStore.set("userId", event.userId);

  // Data persists across async operations
  await processData(event);

  // Retrieve custom data
  const userId = invokeStore.get("userId");

  return {
    requestId: invokeStore.getRequestId(),
    userId,
  };
};

// Context is preserved in async operations
async function processData(event) {
  // Still has access to the same invoke context
  const invokeStore = await InvokeStore.getInstanceAsync();
  console.log(`Processing in same context: ${invokeStore.getRequestId()}`);

  // Can set additional data
  invokeStore.set("processedData", { result: "success" });
}
```

## API Reference

### InvokeStore.getInstanceAsync()
First, get an instance of the InvokeStore:
```typescript
const invokeStore = await InvokeStore.getInstanceAsync();
```

### invokeStore.getContext()

Returns the complete current context or `undefined` if outside a context.

```typescript
const context = invokeStore.getContext();
```

### invokeStore.get(key)

Gets a value from the current context.

```typescript
const requestId = invokeStore.get(InvokeStoreBase.PROTECTED_KEYS.REQUEST_ID);
const customValue = invokeStore.get("customKey");
```

### invokeStore.set(key, value)

Sets a custom value in the current context. Protected Lambda fields cannot be modified.

```typescript
invokeStore.set("userId", "user-123");
invokeStore.set("timestamp", Date.now());

// This will throw an error:
// invokeStore.set(InvokeStoreBase.PROTECTED_KEYS.REQUEST_ID, 'new-id');
```

### invokeStore.getRequestId()

Convenience method to get the current request ID.

```typescript
const requestId = invokeStore.getRequestId(); // Returns '-' if outside context
```

### invokeStore.getTenantId()

Convenience method to get the tenant ID.

```typescript
const requestId = invokeStore.getTenantId();
```

### invokeStore.getXRayTraceId()

Convenience method to get the current [X-Ray trace ID](https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html#xray-concepts-traces). This ID is used for distributed tracing across AWS services.

```typescript
const traceId = invokeStore.getXRayTraceId(); // Returns undefined if not set or outside context
```

### invokeStore.hasContext()

Checks if code is currently running within an invoke context.

```typescript
if (invokeStore.hasContext()) {
  // We're inside an invoke context
}
```

### invokeStore.run(context, fn)

> **Note**: This method is primarily used by the Lambda Runtime Interface Client (RIC) to initialize the context for each invocation. Lambda function developers typically don't need to call this method directly.

Runs a function within an invoke context.

```typescript
invokeStore.run(
  {
    [InvokeStoreBase.PROTECTED_KEYS.REQUEST_ID]: "request-123",
    [InvokeStoreBase.PROTECTED_KEYS.X_RAY_TRACE_ID]: "trace-456", // Optional X-Ray trace ID
    customField: "value", // Optional custom fields
  },
  () => {
    // Function to execute within context
  }
);
```

## Integration with AWS Lambda Runtime

The `@aws/lambda-invoke-store` package is designed to be integrated with the AWS Lambda Node.js Runtime Interface Client (RIC). The RIC automatically:

1. Initializes the InvokeStore context at the beginning of each Lambda invocation
2. Sets the `requestId` and [X-Ray `traceId`](https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html#xray-concepts-traces) in the context
3. Ensures proper context isolation between concurrent invocations
4. Cleans up the context after the invocation completes

Lambda function developers can focus on using the context without worrying about initialization or cleanup.

## Global Namespace and Singleton Pattern

The InvokeStore uses a singleton pattern to ensure that all imports of the module use the same instance, which is critical for maintaining proper context isolation across different parts of your application.

### Global Namespace Integration

The InvokeStore integrates with the Lambda runtime's global namespace:

```typescript
// The InvokeStore is available globally
const globalInstance = globalThis.awslambda.InvokeStore;
```

This enables seamless integration between the Lambda Runtime Interface Client (RIC), AWS SDK, and your function code, ensuring they all share the same context.

### Environment Variable Opt-Out

If you prefer not to modify the global namespace, you can opt out by setting the environment variable:

```bash
# Disable global namespace modification
AWS_LAMBDA_NODEJS_NO_GLOBAL_AWSLAMBDA=1
```

When this environment variable is set, the InvokeStore will still function correctly, but it won't be stored in the global namespace.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
