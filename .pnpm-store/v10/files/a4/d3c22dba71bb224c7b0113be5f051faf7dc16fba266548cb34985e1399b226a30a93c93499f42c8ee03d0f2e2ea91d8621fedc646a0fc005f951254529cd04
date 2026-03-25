# retry-axios

> Use Axios interceptors to automatically retry failed requests.  Super flexible. Built in exponential backoff.

[![NPM Version][npm-image]][npm-url]
[![GitHub Actions][github-image]][github-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![codecov][codecov-image]][codecov-url]
[![style badge][gts-image]][gts-url]

## Installation

```sh
npm install retry-axios
```

## Usage

To use this library, import it alongside of `axios`:

```js
// Just import rax and your favorite version of axios
const rax = require('retry-axios');
const axios = require('axios');
```

Or, if you're using TypeScript / es modules:

```js
import * as rax from 'retry-axios';
import axios from 'axios';
```

You can attach to the global `axios` object, and retry 3 times by default:

```js
const interceptorId = rax.attach();
const res = await axios('https://test.local');
```

Or you can create your own axios instance to make scoped requests:

```js
const myAxiosInstance = axios.create();
myAxiosInstance.defaults.raxConfig = {
  instance: myAxiosInstance
};
const interceptorId = rax.attach(myAxiosInstance);
const res = await myAxiosInstance.get('https://test.local');
```

You have a lot of options...

```js
const interceptorId = rax.attach();
const res = await axios({
  url: 'https://test.local',
  raxConfig: {
    // Retry 3 times on requests that return a response (500, etc) before giving up.  Defaults to 3.
    retry: 3,

    // Retry twice on errors that don't return a response (ENOTFOUND, ETIMEDOUT, etc).
    noResponseRetries: 2,

    // Milliseconds to delay at first.  Defaults to 100. Only considered when backoffType is 'static'
    retryDelay: 100,

    // HTTP methods to automatically retry.  Defaults to:
    // ['GET', 'HEAD', 'OPTIONS', 'DELETE', 'PUT']
    httpMethodsToRetry: ['GET', 'HEAD', 'OPTIONS', 'DELETE', 'PUT'],

    // The response status codes to retry.  Supports a double
    // array with a list of ranges.  Defaults to:
    // [[100, 199], [429, 429], [500, 599]]
    statusCodesToRetry: [[100, 199], [429, 429], [500, 599]],

    // If you are using a non static instance of Axios you need
    // to pass that instance here (const ax = axios.create())
    instance: ax,

    // You can set the backoff type.
    // options are 'exponential' (default), 'static' or 'linear'
    backoffType: 'exponential',

    // You can detect when a retry is happening, and figure out how many
    // retry attempts have been made
    onRetryAttempt: err => {
      const cfg = rax.getConfig(err);
      console.log(`Retry attempt #${cfg.currentRetryAttempt}`);
    }
  }
});
```

If the logic in onRetryAttempt requires to be asynchronous, you can return a promise, then retry will be executed only after the promise is resolved:

```js
const res = await axios({
  url: 'https://test.local',
  raxConfig: {
    onRetryAttempt: err => {
      return new Promise((resolve, reject) => {
        // call a custom asynchronous function
        refreshToken(err, function(token, error) {
          if (!error) {
            window.localStorage.setItem('token', token);
            resolve();
          } else {
            reject();
          }
        });
      });
    }
  }
});
```

Or if you want, you can just decide if it should retry or not:

```js
const res = await axios({
  url: 'https://test.local',
  raxConfig: {
    // Override the decision making process on if you should retry
    shouldRetry: err => {
      const cfg = rax.getConfig(err);
      return true;
    }
  }
});
```

If you want to add custom retry logic without duplicating too much of the built-in logic, `rax.shouldRetryRequest` will tell you if a request would normally be retried:
```js
const res = await axios({
  url: 'https://test.local',
  raxConfig: {
    // Override the decision making process on if you should retry
    shouldRetry: err => {
      const cfg = rax.getConfig(err);
      if (cfg.currentRetryAttempt >= cfg.retry) return false // ensure max retries is always respected

      // Always retry this status text, regardless of code or request type
      if (err.response.statusText.includes('Try again')) return true

      // Handle the request based on your other config options, e.g. `statusCodesToRetry`
      return rax.shouldRetryRequest(err)
    }
  }
});
```

## How it works

This library attaches an `interceptor` to an axios instance you pass to the API. This way you get to choose which version of `axios` you want to run, and you can compose many interceptors on the same request pipeline.

## License

[Apache-2.0](LICENSE)

[github-image]: https://github.com/JustinBeckwith/retry-axios/workflows/ci/badge.svg
[github-url]: https://github.com/JustinBeckwith/retry-axios/actions/
[codecov-image]: https://codecov.io/gh/JustinBeckwith/retry-axios/branch/main/graph/badge.svg
[codecov-url]: https://codecov.io/gh/JustinBeckwith/retry-axios
[gts-image]: https://img.shields.io/badge/code%20style-Google%20%E2%98%82%EF%B8%8F-blue.svg
[gts-url]: https://www.npmjs.com/package/gts
[npm-image]: https://img.shields.io/npm/v/retry-axios.svg
[npm-url]: https://npmjs.org/package/retry-axios
[snyk-image]: https://snyk.io/test/github/JustinBeckwith/retry-axios/badge.svg
[snyk-url]: https://snyk.io/test/github/JustinBeckwith/retry-axios
