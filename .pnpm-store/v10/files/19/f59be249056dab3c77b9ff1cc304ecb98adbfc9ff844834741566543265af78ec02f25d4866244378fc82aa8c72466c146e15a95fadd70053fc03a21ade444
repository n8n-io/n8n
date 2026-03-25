# axios-retry

[![Node.js CI](https://github.com/softonic/axios-retry/actions/workflows/node.js.yml/badge.svg)](https://github.com/softonic/axios-retry/actions/workflows/node.js.yml)

Axios plugin that intercepts failed requests and retries them whenever possible.

## Installation

```bash
npm install axios-retry
```

## Usage

```js
// CommonJS
// const axiosRetry = require('axios-retry').default;

// ES6
import axiosRetry from 'axios-retry';

axiosRetry(axios, { retries: 3 });

axios.get('http://example.com/test') // The first request fails and the second returns 'ok'
  .then(result => {
    result.data; // 'ok'
  });

// Exponential back-off retry delay between requests
axiosRetry(axios, { retryDelay: axiosRetry.exponentialDelay });

// Liner retry delay between requests
axiosRetry(axios, { retryDelay: axiosRetry.linearDelay() });

// Custom retry delay
axiosRetry(axios, { retryDelay: (retryCount) => {
  return retryCount * 1000;
}});

// Works with custom axios instances
const client = axios.create({ baseURL: 'http://example.com' });
axiosRetry(client, { retries: 3 });

client.get('/test') // The first request fails and the second returns 'ok'
  .then(result => {
    result.data; // 'ok'
  });

// Allows request-specific configuration
client
  .get('/test', {
    'axios-retry': {
      retries: 0
    }
  })
  .catch(error => { // The first request fails
    error !== undefined
  });
```

**Note:** Unless `shouldResetTimeout` is set, the plugin interprets the request timeout as a global value, so it is not used for each retry but for the whole request lifecycle.

## Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| retries | `Number` | `3` | The number of times to retry before failing. 1 = One retry after first failure |
| retryCondition | `Function` | `isNetworkOrIdempotentRequestError` | A callback to further control if a request should be retried.  By default, it retries if it is a network error or a 5xx error on an idempotent request (GET, HEAD, OPTIONS, PUT or DELETE). |
| shouldResetTimeout | `Boolean` | false | Defines if the timeout should be reset between retries |
| retryDelay | `Function` | `function noDelay() { return 0; }` | A callback to further control the delay in milliseconds between retried requests. By default there is no delay between retries. Another option is exponentialDelay ([Exponential Backoff](https://developers.google.com/analytics/devguides/reporting/core/v3/errors#backoff)) or `linearDelay`. The function is passed `retryCount` and `error`. |
| onRetry | `Function` | `function onRetry(retryCount, error, requestConfig) { return; }` | A callback to notify when a retry is about to occur. Useful for tracing and you can any async process for example refresh a token on 401. By default nothing will occur. The function is passed `retryCount`, `error`, and `requestConfig`. |
| onMaxRetryTimesExceeded | `Function` | `function onMaxRetryTimesExceeded(error, retryCount) { return; }` | After all the retries are failed, this callback will be called with the last error before throwing the error. |
| validateResponse | `Function \| null` | `null` | A callback to define whether a response should be resolved or rejected. If null is passed, it will fallback to the axios default (only 2xx status codes are resolved). |

## Testing

Clone the repository and execute:

```bash
npm test
```

## Contribute

1. Fork it: `git clone https://github.com/softonic/axios-retry.git`
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Added some feature'`
4. Check the build: `npm run build`
5. Push to the branch: `git push origin my-new-feature`
6. Submit a pull request :D
