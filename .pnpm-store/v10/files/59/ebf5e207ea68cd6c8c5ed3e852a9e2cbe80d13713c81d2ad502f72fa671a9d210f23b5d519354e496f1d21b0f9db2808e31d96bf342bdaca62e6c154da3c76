# Class: RetryAgent

Extends: `undici.Dispatcher`

A `undici.Dispatcher` that allows to automatically retry a request.
Wraps a `undici.RetryHandler`.

## `new RetryAgent(dispatcher, [options])`

Arguments:

* **dispatcher** `undici.Dispatcher` (required) - the dispatcher to wrap
* **options** `RetryHandlerOptions` (optional) - the options

Returns: `ProxyAgent`

### Parameter: `RetryHandlerOptions`

- **throwOnError** `boolean` (optional) - Disable to prevent throwing error on last retry attept, useful if you need the body on errors from server or if you have custom error handler. Default: `true`
- **retry** `(err: Error, context: RetryContext, callback: (err?: Error | null) => void) => void` (optional) - Function to be called after every retry. It should pass error if no more retries should be performed.
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

Example:

```js
import { Agent, RetryAgent } from 'undici'

const agent = new RetryAgent(new Agent())

const res = await agent.request({
  method: 'GET',
  origin: 'http://example.com',
  path: '/',
})
console.log(res.statusCode)
console.log(await res.body.text())
```
