# Require NodeApiError or NodeOperationError for error wrapping in catch blocks. Raw errors lose HTTP context in the n8n UI (`@n8n/community-nodes/require-node-api-error`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

<!-- end auto-generated rule header -->

## Rule Details

When errors are caught and re-thrown in n8n nodes, they must be wrapped in
`NodeApiError` or `NodeOperationError`. Raw re-throws and generic `Error`
constructors lose HTTP context (status code, response body, etc.) that the n8n
UI relies on to display meaningful error information to users.

## Examples

### Incorrect

```js
try {
  await apiRequest();
} catch (error) {
  throw error;
}
```

```js
try {
  await apiRequest();
} catch (error) {
  throw new Error('Request failed');
}
```

### Correct

```js
try {
  await apiRequest();
} catch (error) {
  throw new NodeApiError(this.getNode(), error as JsonObject);
}
```

```js
try {
  await apiRequest();
} catch (error) {
  throw new NodeOperationError(this.getNode(), 'Operation failed', { itemIndex: i });
}
```

```js
try {
  await apiRequest();
} catch (error) {
  if (this.continueOnFail()) {
    returnData.push({ json: { error: error.message } });
    continue;
  }
  throw new NodeApiError(this.getNode(), error as JsonObject);
}
```
