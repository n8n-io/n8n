# Class: RetryHandler

Extends: `undici.DispatcherHandlers`

A handler class that implements the retry logic for a request.

## `new RetryHandler(dispatchOptions, retryHandlers, [retryOptions])`

Arguments:

- **options** `Dispatch.DispatchOptions & RetryOptions` (required) - It is an intersection of `Dispatcher.DispatchOptions` and `RetryOptions`.
- **retryHandlers** `RetryHandlers` (required) - Object containing the `dispatch` to be used on every retry, and `handler` for handling the `dispatch` lifecycle.

Returns: `retryHandler`

### Parameter: `Dispatch.DispatchOptions & RetryOptions`

Extends: [`Dispatch.DispatchOptions`](/docs/docs/api/Dispatcher.md#parameter-dispatchoptions).

#### `RetryOptions`

- **throwOnError** `boolean` (optional) - Disable to prevent throwing error on last retry attept, useful if you need the body on errors from server or if you have custom error handler.
- **retry** `(err: Error, context: RetryContext, callback: (err?: Error | null) => void) => number | null` (optional) - Function to be called after every retry. It should pass error if no more retries should be performed.
- **maxRetries** `number` (optional) - Maximum number of retries. Default: `5`
- **maxTimeout** `number` (optional) - Maximum number of milliseconds to wait before retrying. Default: `30000` (30 seconds)
- **minTimeout** `number` (optional) - Minimum number of milliseconds to wait before retrying. Default: `500` (half a second)
- **timeoutFactor** `number` (optional) - Factor to multiply the timeout by for each retry attempt. Default: `2`
- **retryAfter** `boolean` (optional) - It enables automatic retry after the `Retry-After` header is received. Default: `true`
-
- **methods** `string[]` (optional) - Array of HTTP methods to retry. Default: `['GET', 'PUT', 'HEAD', 'OPTIONS', 'DELETE']`
- **statusCodes** `number[]` (optional) - Array of HTTP status codes to retry. Default: `[429, 500, 502, 503, 504]`
- **errorCodes** `string[]` (optional) - Array of Error codes to retry. Default: `['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ENETDOWN','ENETUNREACH', 'EHOSTDOWN', 'UND_ERR_SOCKET']`

**`RetryContext`**

- `state`: `RetryState` - Current retry state. It can be mutated.
- `opts`: `Dispatch.DispatchOptions & RetryOptions` - Options passed to the retry handler.

**`RetryState`**

It represents the retry state for a given request.

- `counter`: `number` - Current retry attempt.

### Parameter `RetryHandlers`

- **dispatch** `(options: Dispatch.DispatchOptions, handlers: Dispatch.DispatchHandler) => Promise<Dispatch.DispatchResponse>` (required) - Dispatch function to be called after every retry.
- **handler** Extends [`Dispatch.DispatchHandler`](/docs/docs/api/Dispatcher.md#dispatcherdispatchoptions-handler) (required) - Handler function to be called after the request is successful or the retries are exhausted.

>__Note__: The `RetryHandler` does not retry over stateful bodies (e.g. streams, AsyncIterable) as those, once consumed, are left in a state that cannot be reutilized. For these situations the `RetryHandler` will identify
>the body as stateful and will not retry the request rejecting with the error `UND_ERR_REQ_RETRY`.

Examples:

```js
const client = new Client(`http://localhost:${server.address().port}`);
const chunks = [];
const handler = new RetryHandler(
  {
    ...dispatchOptions,
    retryOptions: {
      // custom retry function
      retry: function (err, state, callback) {
        counter++;

        if (err.code && err.code === "UND_ERR_DESTROYED") {
          callback(err);
          return;
        }

        if (err.statusCode === 206) {
          callback(err);
          return;
        }

        setTimeout(() => callback(null), 1000);
      },
    },
  },
  {
    dispatch: (...args) => {
      return client.dispatch(...args);
    },
    handler: {
      onConnect() {},
      onBodySent() {},
      onHeaders(status, _rawHeaders, resume, _statusMessage) {
        // do something with headers
      },
      onData(chunk) {
        chunks.push(chunk);
        return true;
      },
      onComplete() {},
      onError() {
        // handle error properly
      },
    },
  }
);
```

#### Example - Basic RetryHandler with defaults

```js
const client = new Client(`http://localhost:${server.address().port}`);
const handler = new RetryHandler(dispatchOptions, {
  dispatch: client.dispatch.bind(client),
  handler: {
    onConnect() {},
    onBodySent() {},
    onHeaders(status, _rawHeaders, resume, _statusMessage) {},
    onData(chunk) {},
    onComplete() {},
    onError(err) {},
  },
});
```
