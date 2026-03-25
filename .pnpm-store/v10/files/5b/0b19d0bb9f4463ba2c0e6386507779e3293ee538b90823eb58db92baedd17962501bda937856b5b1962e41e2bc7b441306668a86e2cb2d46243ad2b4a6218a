# gaxios

[![npm version](https://img.shields.io/npm/v/gaxios.svg)](https://www.npmjs.org/package/gaxios)
[![codecov](https://codecov.io/gh/googleapis/gaxios/branch/master/graph/badge.svg)](https://codecov.io/gh/googleapis/gaxios)
[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)

> An HTTP request client that provides an `axios` like interface over top of `node-fetch`.

## Install

```sh
$ npm install gaxios
```

## Example

```js
import {request} from 'gaxios';
const res = await request({url: 'https://google.com/'});
```

## `fetch`-Compatible API Example

We offer a drop-in `fetch`-compatible API as well.

```js
import {instance} from 'gaxios';
const res = await instance.fetch('https://google.com/');
```

To disable the auto-processing of the request body in `res.data`, set `{responseType: 'stream'}` or `.adapter` on a Gaxios instance's defaults or per-request.

## Setting Defaults

Gaxios supports setting default properties both on the default instance, and on additional instances. This is often useful when making many requests to the same domain with the same base settings. For example:

```js
import {Gaxios} from 'gaxios';

const gaxios = new Gaxios();

gaxios.defaults = {
  baseURL: 'https://example.com'
  headers: new Headers({
    Authorization: 'SOME_TOKEN'
  })
}

await gaxios.request({url: '/data'});
```

Note that setting default values will take precedence
over other authentication methods, i.e., application default credentials.

## `GaxiosResponse`

The `GaxiosResponse` object extends the `fetch` API's [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) object, with the addition of:

- `config`: the configuration used for the request.
- `data`: the transformed `.body`, such as JSON, text, arrayBuffer, or more.

## Request Options

```ts
interface GaxiosOptions = {
  // The url to which the request should be sent.  Required.
  url: string | URL,

  // The HTTP method to use for the request.  Defaults to `GET`.
  method: 'GET',

  // The base Url to use for the request.
  // Resolved as `new URL(url, baseURL)`
  baseURL: 'https://example.com/v1/' | URL;

  // The HTTP methods to be sent with the request.
  headers: new Headers(),

  // The data to send in the body of the request. Objects will be serialized as JSON
  // except for:
  // - `ArrayBuffer`
  // - `Blob`
  // - `Buffer` (Node.js)
  // - `DataView`
  // - `File`
  // - `FormData`
  // - `ReadableStream`
  // - `stream.Readable` (Node.js)
  // - strings
  // - `TypedArray` (e.g. `Uint8Array`, `BigInt64Array`)
  // - `URLSearchParams`
  // - all other objects where:
  //   - headers.get('Content-Type') === 'application/x-www-form-urlencoded' (as they will be serialized as `URLSearchParams`)
  //
  // Here are a few examples that would prevent setting `Content-Type: application/json` by default:
  // - data: JSON.stringify({some: 'data'}) // a `string`
  // - data: fs.readFile('./some-data.jpeg') // a `stream.Readable`
  data: {
    some: 'data'
  },

  // The max size of the http response content in bytes allowed.
  // Defaults to `0`, which is the same as unset.
  maxContentLength: 2000,

  // The query parameters that will be encoded using `URLSearchParams` and
  // appended to the url
  params: {
    querystring: 'parameters'
  },

  // The timeout for the HTTP request in milliseconds. No timeout by default.
  timeout: 60000,

  // Optional method to override making the actual HTTP request. Useful
  // for writing tests and instrumentation
  adapter?: async (options, defaultAdapter) => {
    const res = await defaultAdapter(options);
    res.data = {
      ...res.data,
      extraProperty: 'your extra property',
    };
    return res;
  };

  // The expected return type of the request.  Options are:
  // 'json' | 'stream' | 'blob' | 'arraybuffer' | 'text' | 'unknown'
  // Defaults to `unknown`.
  //
  // If the `fetchImplementation` is native `fetch`, the
  // stream is a `ReadableStream`, otherwise `readable.Stream`.
  //
  // Note: Setting 'stream' does not consume the `Response#body` - this can
  // be useful for passthrough requests, where a consumer would like to
  // transform the `Response#body`, or for using Gaxios as a drop-in `fetch`
  // replacement.
  responseType: 'unknown',

  // The node.js http agent to use for the request.
  agent: someHttpsAgent,

  // Custom function to determine if the response is valid based on the
  // status code.  Defaults to (>= 200 && < 300)
  validateStatus: (status: number) => true,

  /**
   * Implementation of `fetch` to use when making the API call. Will use
   * `node-fetch` by default.
   */
  fetchImplementation?: typeof fetch;

  // Configuration for retrying of requests.
  retryConfig: {
    // The number of times to retry the request.  Defaults to 3.
    retry?: number;

    // The number of retries already attempted.
    currentRetryAttempt?: number;

    // The HTTP Methods that will be automatically retried.
    // Defaults to ['GET','PUT','HEAD','OPTIONS','DELETE']
    httpMethodsToRetry?: string[];

    // The HTTP response status codes that will automatically be retried.
    // Defaults to: [[100, 199], [408, 408], [429, 429], [500, 599]]
    statusCodesToRetry?: number[][];

    // Function to invoke when a retry attempt is made.
    onRetryAttempt?: (err: GaxiosError) => Promise<void> | void;

    // Function to invoke which determines if you should retry
    shouldRetry?: (err: GaxiosError) => Promise<boolean> | boolean;

    // When there is no response, the number of retries to attempt. Defaults to 2.
    noResponseRetries?: number;

    // The amount of time to initially delay the retry, in ms.  Defaults to 100ms.
    retryDelay?: number;
  },

  // Enables default configuration for retries.
  retry: boolean,

  // Enables aborting via AbortController
  signal?: AbortSignal

  /**
   * A collection of parts to send as a `Content-Type: multipart/related` request.
   */
  multipart?: GaxiosMultipartOptions;

  /**
   * An optional proxy to use for requests.
   * Available via `process.env.HTTP_PROXY` and `process.env.HTTPS_PROXY` as well - with a preference for the this config option when multiple are available.
   * The `agent` option overrides this.
   *
   * @see {@link GaxiosOptions.noProxy}
   * @see {@link GaxiosOptions.agent}
   */
  proxy?: string | URL;

  /**
   * A list for excluding traffic for proxies.
   * Available via `process.env.NO_PROXY` as well as a common-separated list of strings - merged with any local `noProxy` rules.
   *
   * - When provided a string, it is matched by
   *   - Wildcard `*.` and `.` matching are available. (e.g. `.example.com` or `*.example.com`)
   * - When provided a URL, it is matched by the `.origin` property.
   *   - For example, requesting `https://example.com` with the following `noProxy`s would result in a no proxy use:
   *     - new URL('https://example.com')
   *     - new URL('https://example.com:443')
   *   - The following would be used with a proxy:
   *     - new URL('http://example.com:80')
   *     - new URL('https://example.com:8443')
   * - When provided a regular expression it is used to match the stringified URL
   *
   * @see {@link GaxiosOptions.proxy}
   */
  noProxy?: (string | URL | RegExp)[];

  /**
   * An experimental, customizable error redactor.
   *
   * Set `false` to disable.
   *
   * @remarks
   *
   * This does not replace the requirement for an active Data Loss Prevention (DLP) provider. For DLP suggestions, see:
   * - https://cloud.google.com/sensitive-data-protection/docs/redacting-sensitive-data#dlp_deidentify_replace_infotype-nodejs
   * - https://cloud.google.com/sensitive-data-protection/docs/infotypes-reference#credentials_and_secrets
   *
   * @experimental
   */
  errorRedactor?: typeof defaultErrorRedactor | false;
}
```

## License

[Apache-2.0](https://github.com/googleapis/gaxios/blob/main/LICENSE)
