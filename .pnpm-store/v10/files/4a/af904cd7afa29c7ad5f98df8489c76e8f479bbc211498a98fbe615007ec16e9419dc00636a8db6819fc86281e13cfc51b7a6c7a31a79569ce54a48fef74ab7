# request.js

> Send parameterized requests to GitHub’s APIs with sensible defaults in browsers and Node

[![@latest](https://img.shields.io/npm/v/@octokit/request.svg)](https://www.npmjs.com/package/@octokit/request)
[![Build Status](https://github.com/octokit/request.js/workflows/Test/badge.svg)](https://github.com/octokit/request.js/actions?query=workflow%3ATest+branch%3Amain)

`@octokit/request` is a request library for browsers & node that makes it easier
to interact with [GitHub’s REST API](https://developer.github.com/v3/) and
[GitHub’s GraphQL API](https://developer.github.com/v4/guides/forming-calls/#the-graphql-endpoint).

It uses [`@octokit/endpoint`](https://github.com/octokit/endpoint.js) to parse
the passed options and sends the request using [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). You can pass a custom `fetch` function using the `options.request.fetch` option, see below.

<!-- update table of contents by running `npx markdown-toc README.md -i` -->

<!-- toc -->

- [request.js](#requestjs)
  - [Features](#features)
  - [Usage](#usage)
    - [REST API example](#rest-api-example)
    - [GraphQL example](#graphql-example)
    - [Alternative: pass `method` \& `url` as part of options](#alternative-pass-method--url-as-part-of-options)
  - [Authentication](#authentication)
  - [request()](#request)
  - [`request.defaults()`](#requestdefaults)
  - [`request.endpoint`](#requestendpoint)
  - [Special cases](#special-cases)
    - [The `data` parameter – set request body directly](#the-data-parameter--set-request-body-directly)
    - [Set parameters for both the URL/query and the request body](#set-parameters-for-both-the-urlquery-and-the-request-body)
    - [Set a custom Agent to your requests](#set-a-custom-agent-to-your-requests)
  - [LICENSE](#license)

<!-- tocstop -->

## Features

🤩 1:1 mapping of REST API endpoint documentation, e.g. [Add labels to an issue](https://developer.github.com/v3/issues/labels/#add-labels-to-an-issue) becomes

```js
request("POST /repos/{owner}/{repo}/issues/{number}/labels", {
  mediaType: {
    previews: ["symmetra"],
  },
  owner: "octokit",
  repo: "request.js",
  number: 1,
  labels: ["🐛 bug"],
});
```

👶 [Small bundle size](https://bundlephobia.com/result?p=@octokit/request@5.0.3) (\<4kb minified + gzipped)

😎 [Authenticate](#authentication) with any of [GitHubs Authentication Strategies](https://github.com/octokit/auth.js).

👍 Sensible defaults

- `baseUrl`: `https://api.github.com`
- `headers.accept`: `application/vnd.github.v3+json`
- `headers['user-agent']`: `octokit-request.js/<current version> <OS information>`, e.g. `octokit-request.js/1.2.3 Node.js/10.15.0 (macOS Mojave; x64)`

👌 Simple to test: mock requests by passing a custom fetch method.

🧐 Simple to debug: Sets `error.request` to request options causing the error (with redacted credentials).

## Usage

<table>
<tbody valign=top align=left>
<tr><th>
Browsers
</th><td width=100%>
Load <code>@octokit/request</code> directly from <a href="https://esm.sh">esm.sh</a>

```html
<script type="module">
  import { request } from "https://esm.sh/@octokit/request";
</script>
```

</td></tr>
<tr><th>
Node
</th><td>

Install with <code>npm install @octokit/request</code>

```js
const { request } = require("@octokit/request");
// or: import { request } from "@octokit/request";
```

</td></tr>
</tbody>
</table>

### REST API example

```js
// Following GitHub docs formatting:
// https://developer.github.com/v3/repos/#list-organization-repositories
const result = await request("GET /orgs/{org}/repos", {
  headers: {
    authorization: "token 0000000000000000000000000000000000000001",
  },
  org: "octokit",
  type: "private",
});

console.log(`${result.data.length} repos found.`);
```

### GraphQL example

For GraphQL request we recommend using [`@octokit/graphql`](https://github.com/octokit/graphql.js#readme)

```js
const result = await request("POST /graphql", {
  headers: {
    authorization: "token 0000000000000000000000000000000000000001",
  },
  query: `query ($login: String!) {
    organization(login: $login) {
      repositories(privacy: PRIVATE) {
        totalCount
      }
    }
  }`,
  variables: {
    login: "octokit",
  },
});
```

### Alternative: pass `method` & `url` as part of options

Alternatively, pass in a method and a url

```js
const result = await request({
  method: "GET",
  url: "/orgs/{org}/repos",
  headers: {
    authorization: "token 0000000000000000000000000000000000000001",
  },
  org: "octokit",
  type: "private",
});
```

## Authentication

The simplest way to authenticate a request is to set the `Authorization` header directly, e.g. to a [personal access token](https://github.com/settings/tokens/).

```js
const requestWithAuth = request.defaults({
  headers: {
    authorization: "token 0000000000000000000000000000000000000001",
  },
});
const result = await requestWithAuth("GET /user");
```

For more complex authentication strategies such as GitHub Apps or Basic, we recommend the according authentication library exported by [`@octokit/auth`](https://github.com/octokit/auth.js).

```js
const { createAppAuth } = require("@octokit/auth-app");
const auth = createAppAuth({
  appId: process.env.APP_ID,
  privateKey: process.env.PRIVATE_KEY,
  installationId: 123,
});
const requestWithAuth = request.defaults({
  request: {
    hook: auth.hook,
  },
  mediaType: {
    previews: ["machine-man"],
  },
});

const { data: app } = await requestWithAuth("GET /app");
const { data: app } = await requestWithAuth(
  "POST /repos/{owner}/{repo}/issues",
  {
    owner: "octocat",
    repo: "hello-world",
    title: "Hello from the engine room",
  },
);
```

## request()

`request(route, options)` or `request(options)`.

**Options**

<table>
  <thead>
    <tr>
      <th align=left>
        name
      </th>
      <th align=left>
        type
      </th>
      <th align=left>
        description
      </th>
    </tr>
  </thead>
  <tr>
    <th align=left>
      <code>route</code>
    </th>
    <td>
      String
    </td>
    <td>
      **Required**. If <code>route</code> is set it has to be a string consisting of the request method and URL, e.g. <code>GET /orgs/{org}</code>
    </td>
  </tr>
  <tr>
    <th align=left>
      <code>options.baseUrl</code>
    </th>
    <td>
      String
    </td>
    <td>
      The base URL that <code>route</code> or <code>url</code> will be prefixed with, if they use relative paths. <em>Defaults to <code>https://api.github.com</code></em>.
    </td>
  </tr>
    <th align=left>
      <code>options.headers</code>
    </th>
    <td>
      Object
    </td>
    <td>
      Custom headers. Passed headers are merged with defaults:<br>
      <em><code>headers['user-agent']</code> defaults to <code>octokit-rest.js/1.2.3</code> (where <code>1.2.3</code> is the released version)</em>.<br>
      <em><code>headers['accept']</code> defaults to <code>application/vnd.github.v3+json</code>.<br> Use <code>options.mediaType.{format,previews}</code> to request API previews and custom media types.
    </td>
  </tr>
  <tr>
    <th align=left>
      <code>options.method</code>
    </th>
    <td>
      String
    </td>
    <td>
      Any supported <a href="https://developer.github.com/v3/#http-verbs">http verb</a>, case-insensitive. <em>Defaults to <code>Get</code></em>.
    </td>
  </tr>
  <tr>
    <th align=left>
      <code>options.mediaType.format</code>
    </th>
    <td>
      String
    </td>
    <td>
      Media type param, such as `raw`, `html`, or `full`. See <a href="https://developer.github.com/v3/media/">Media Types</a>.
    </td>
  </tr>
  <tr>
    <th align=left>
      <code>options.mediaType.previews</code>
    </th>
    <td>
      Array of strings
    </td>
    <td>
      Name of previews, such as `mercy`, `symmetra`, or `scarlet-witch`. See <a href="https://docs.github.com/graphql/overview/schema-previews">GraphQL Schema Previews</a>.
      Note that these only apply to GraphQL requests and have no effect on REST routes.
    </td>
  </tr>
  <tr>
    <th align=left>
      <code>options.url</code>
    </th>
    <td>
      String
    </td>
    <td>
      **Required**. A path or full URL which may contain <code>:variable</code> or <code>{variable}</code> placeholders,
      e.g. <code>/orgs/{org}/repos</code>. The <code>url</code> is parsed using <a href="https://github.com/bramstein/url-template">url-template</a>.
    </td>
  </tr>
  <tr>
    <th align=left>
      <code>options.data</code>
    </th>
    <td>
      Any
    </td>
    <td>
      Set request body directly instead of setting it to JSON based on additional parameters. See <a href="#data-parameter">"The `data` parameter"</a> below.
    </td>
  </tr>

  <tr>
    <th align=left>
      <code>options.request.fetch</code>
    </th>
    <td>
      Function
    </td>
    <td>
     Custom replacement for <a href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API">fetch</a>. Useful for testing or request hooks.
    </td>
  </tr>
  <tr>
    <th align=left>
      <code>options.request.hook</code>
    </th>
    <td>
      Function
    </td>
    <td>
     Function with the signature <code>hook(request, endpointOptions)</code>, where <code>endpointOptions</code> are the parsed options as returned by <a href="https://github.com/octokit/endpoint.js#endpointmergeroute-options-or-endpointmergeoptions"><code>endpoint.merge()</code></a>, and <code>request</code> is <a href="https://github.com/octokit/request.js#request"><code>request()</code></a>. This option works great in conjunction with <a href="https://github.com/gr2m/before-after-hook">before-after-hook</a>.
    </td>
  </tr>
  <tr>
    <th align=left>
      <a name="options-request-signal"></a><code>options.request.signal</code>
    </th>
    <td>
      <a href="https://github.com/bitinn/node-fetch/tree/e996bdab73baf996cf2dbf25643c8fe2698c3249#request-cancellation-with-abortsignal">new AbortController().signal</a>
    </td>
    <td>
      Use an <code>AbortController</code> instance to cancel a request. In node you can only cancel streamed requests.
    </td>
  </tr>
    <th align=left>
      <code>options.request.log</code>
    </th>
    <td>
      <code>object</code>
    </td>
    <td>
      Used for internal logging. Defaults to <a href="https://developer.mozilla.org/en-US/docs/Web/API/console"><code>console</code></a>.
    </td>
  </tr>
  </tr>
    <th align=left>
      <code>options.request.parseSuccessResponseBody</code>
    </th>
    <td>
      <code>boolean</code>
    </td>
    <td>
      If set to <code>false</code> the returned `response` will be passed through from `fetch`. This is useful to stream response.body when downloading files from the GitHub API.
    </td>
  </tr>
</table>

All other options except `options.request.*` will be passed depending on the `method` and `url` options.

1. If the option key is a placeholder in the `url`, it will be used as replacement. For example, if the passed options are `{url: '/orgs/{org}/repos', org: 'foo'}` the returned `options.url` is `https://api.github.com/orgs/foo/repos`
2. If the `method` is `GET` or `HEAD`, the option is passed as query parameter
3. Otherwise the parameter is passed in the request body as JSON key.

**Result**

`request` returns a promise. If the request was successful, the promise resolves with an object containing 4 keys:

<table>
  <thead>
    <tr>
      <th align=left>
        key
      </th>
      <th align=left>
        type
      </th>
      <th align=left>
        description
      </th>
    </tr>
  </thead>
  <tr>
    <th align=left><code>status</code></th>
    <td>Integer</td>
    <td>Response status status</td>
  </tr>
  <tr>
    <th align=left><code>url</code></th>
    <td>String</td>
    <td>URL of response. If a request results in redirects, this is the final URL. You can send a <code>HEAD</code> request to retrieve it without loading the full response body.</td>
  </tr>
  <tr>
    <th align=left><code>headers</code></th>
    <td>Object</td>
    <td>All response headers</td>
  </tr>
  <tr>
    <th align=left><code>data</code></th>
    <td>Any</td>
    <td>The response body as returned from server. If the response is JSON then it will be parsed into an object</td>
  </tr>
</table>

If an error occurs, the promise is rejected with an `error` object containing 3 keys to help with debugging:

- `error.status` The http response status code
- `error.request` The request options such as `method`, `url` and `data`
- `error.response` The http response object with `url`, `headers`, and `data`

If the error is due to an `AbortSignal` being used, the resulting `AbortError` is bubbled up to the caller.

## `request.defaults()`

Override or set default options. Example:

```js
const myrequest = require("@octokit/request").defaults({
  baseUrl: "https://github-enterprise.acme-inc.com/api/v3",
  headers: {
    "user-agent": "myApp/1.2.3",
    authorization: `token 0000000000000000000000000000000000000001`,
  },
  org: "my-project",
  per_page: 100,
});

myrequest(`GET /orgs/{org}/repos`);
```

You can call `.defaults()` again on the returned method, the defaults will cascade.

```js
const myProjectRequest = request.defaults({
  baseUrl: "https://github-enterprise.acme-inc.com/api/v3",
  headers: {
    "user-agent": "myApp/1.2.3",
  },
  org: "my-project",
});
const myProjectRequestWithAuth = myProjectRequest.defaults({
  headers: {
    authorization: `token 0000000000000000000000000000000000000001`,
  },
});
```

`myProjectRequest` now defaults the `baseUrl`, `headers['user-agent']`,
`org` and `headers['authorization']` on top of `headers['accept']` that is set
by the global default.

## `request.endpoint`

See https://github.com/octokit/endpoint.js. Example

```js
const options = request.endpoint("GET /orgs/{org}/repos", {
  org: "my-project",
  type: "private",
});

// {
//   method: 'GET',
//   url: 'https://api.github.com/orgs/my-project/repos?type=private',
//   headers: {
//     accept: 'application/vnd.github.v3+json',
//     authorization: 'token 0000000000000000000000000000000000000001',
//     'user-agent': 'octokit/endpoint.js v1.2.3'
//   }
// }
```

All of the [`@octokit/endpoint`](https://github.com/octokit/endpoint.js) API can be used:

- [`octokitRequest.endpoint()`](#endpoint)
- [`octokitRequest.endpoint.defaults()`](#endpointdefaults)
- [`octokitRequest.endpoint.merge()`](#endpointdefaults)
- [`octokitRequest.endpoint.parse()`](#endpointmerge)

## Special cases

<a name="data-parameter"></a>

### The `data` parameter – set request body directly

Some endpoints such as [Render a Markdown document in raw mode](https://developer.github.com/v3/markdown/#render-a-markdown-document-in-raw-mode) don’t have parameters that are sent as request body keys, instead the request body needs to be set directly. In these cases, set the `data` parameter.

```js
const response = await request("POST /markdown/raw", {
  data: "Hello world github/linguist#1 **cool**, and #1!",
  headers: {
    accept: "text/html;charset=utf-8",
    "content-type": "text/plain",
  },
});

// Request is sent as
//
//     {
//       method: 'post',
//       url: 'https://api.github.com/markdown/raw',
//       headers: {
//         accept: 'text/html;charset=utf-8',
//         'content-type': 'text/plain',
//         'user-agent': userAgent
//       },
//       body: 'Hello world github/linguist#1 **cool**, and #1!'
//     }
//
// not as
//
//     {
//       ...
//       body: '{"data": "Hello world github/linguist#1 **cool**, and #1!"}'
//     }
```

### Set parameters for both the URL/query and the request body

There are API endpoints that accept both query parameters as well as a body. In that case you need to add the query parameters as templates to `options.url`, as defined in the [RFC 6570 URI Template specification](https://tools.ietf.org/html/rfc6570).

Example

```js
request(
  "POST https://uploads.github.com/repos/octocat/Hello-World/releases/1/assets{?name,label}",
  {
    name: "example.zip",
    label: "short description",
    headers: {
      "content-type": "text/plain",
      "content-length": 14,
      authorization: `token 0000000000000000000000000000000000000001`,
    },
    data: "Hello, world!",
  },
);
```

### Set a custom Agent to your requests

The way to pass a custom `Agent` to requests is by creating a custom `fetch` function and pass it as `options.request.fetch`. A good example can be [undici's `fetch` implementation](https://undici.nodejs.org/#/?id=undicifetchinput-init-promise).

Example ([See example in CodeSandbox](https://codesandbox.io/p/sandbox/nifty-stitch-wdlwlf))

```js
import { request } from "@octokit/request";
import { fetch as undiciFetch, Agent } from "undici";

/** @type {typeof import("undici").fetch} */
const myFetch = (url, options) => {
  return undiciFetch(url, {
    ...options,
    dispatcher: new Agent({
      keepAliveTimeout: 10,
      keepAliveMaxTimeout: 10,
    }),
  });
};

const { data } = await request("GET /users/{username}", {
  username: "octocat",
  headers: {
    "X-GitHub-Api-Version": "2022-11-28",
  },
  options: {
    request: {
      fetch: myFetch,
    },
  },
});
```

## LICENSE

[MIT](LICENSE)
