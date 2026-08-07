# Programmatic nodes

Programmatic-style nodes implement an `execute` method and have full
control over HTTP calls, loops, transformations, etc.

Also read `.agents/nodes.md` for shared node anatomy and conventions.

## When to use
- You need multiple dependent API calls per node execution.
- You need complex transformations or branching logic.
- The API doesn't map cleanly into simple "one request per item"
  patterns.

If the integration is mostly simple HTTP/REST requests, prefer
declarative-style instead (see `.agents/nodes-declarative.md`).

If you choose programmatic-style, briefly explain **why**
declarative-style won't work for this particular node.

## Canonical execute pattern
```typescript
async execute(
  this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const resource = this.getNodeParameter('resource', i) as string;
      const operation = this.getNodeParameter('operation', i) as string;

      // Implement logic based on resource + operation
      // Use this.helpers.httpRequest / httpRequestWithAuthentication, etc.
      const responseData = {};

      returnData.push({
        json: responseData,
        pairedItem: { item: i },
      });
    } catch (error) {
      if (this.continueOnFail()) {
        returnData.push({
          json: {
            error: (error as Error).message,
          },
          pairedItem: { item: i },
        });
        continue;
      }

      // Implement a check to see what error we have
      const isApiError = true;
      // Use NodeApiError for API-related errors
      if (isApiError) {
        throw new NodeApiError(this.getNode(), error as Error, { itemIndex: i });
      }

      // Use NodeOperationError for configuration/validation errors
      throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
    }
  }

  return [returnData];
}
```

## Guidelines
- Always get input items via `this.getInputData()`
- Pass the correct item index as the second argument to
  `getNodeParameter`
- Handle errors using `NodeApiError` (for API failures) and
  `NodeOperationError` (for operational/validation errors)
- Support `continueOnFail()` to allow workflows to proceed when possible
- Programmatic-style nodes support both **light and full versioning**.
  See `.agents/versioning.md` for details.
