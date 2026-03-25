# endpoint.js

> Turns GitHub REST API endpoints into generic request options

[![@latest](https://img.shields.io/npm/v/@octokit/endpoint.svg)](https://www.npmjs.com/package/@octokit/endpoint)
[![Build Status](https://github.com/octokit/endpoint.js/workflows/Test/badge.svg)](https://github.com/octokit/endpoint.js/actions/workflows/test.yml?query=branch%3Amain)

`@octokit/endpoint` combines [GitHub REST API routes](https://developer.github.com/v3/) with your parameters and turns them into generic request options that can be used in any request library.

<!-- update table of contents by running `npx markdown-toc README.md -i` -->

<!-- toc -->

- [Usage](#usage)
- [API](#api)
  - [`endpoint(route, options)` or `endpoint(options)`](#endpointroute-options-or-endpointoptions)
  - [`endpoint.defaults()`](#endpointdefaults)
  - [`endpoint.DEFAULTS`](#endpointdefaults)
  - [`endpoint.merge(route, options)` or `endpoint.merge(options)`](#endpointmergeroute-options-or-endpointmergeoptions)
  - [`endpoint.parse()`](#endpointparse)
- [Special cases](#special-cases)
  - [The `data` parameter – set request body directly](#the-data-parameter-%E2%80%93-set-request-body-directly)
  - [Set parameters for both the URL/query and the request body](#set-parameters-for-both-the-urlquery-and-the-request-body)
- [LICENSE](#license)

<!-- tocstop -->

## Usage

<table>
<tbody valign=top align=left>
<tr><th>
Browsers
</th><td width=100%>
Load <code>@octokit/endpoint</code> directly from <a href="https://esm.sh">esm.sh</a>

```html
<script type="module">
  import { endpoint } from "https://esm.sh/@octokit/endpoint";
</script>
```

</td></tr>
<tr><th>
Node
</th><td>

Install with <code>npm install @octokit/endpoint</code>

```js
const { endpoint } = require("@octokit/endpoint");
// or: import { endpoint } from "@octokit/endpoint";
```

</td></tr>
</tbody>
</table>

Example for [List organization repositories](https://developer.github.com/v3/repos/#list-organization-repositories)

```js
const requestOptions = endpoint("GET /orgs/{org}/repos", {
  headers: {
    authorization: "token 0000000000000000000000000000000000000001",
  },
  org: "octokit",
  type: "private",
});
```

The resulting `requestOptions` looks as follows

```json
{
  "method": "GET",
  "url": "https://api.github.com/orgs/octokit/repos?type=private",
  "headers": {
    "accept": "application/vnd.github.v3+json",
    "authorization": "token 0000000000000000000000000000000000000001",
    "user-agent": "octokit/endpoint.js v1.2.3"
  }
}
```

You can pass `requestOptions` to common request libraries

```js
const { url, ...options } = requestOptions;
// using with fetch (https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
fetch(url, options);
// using with request (https://github.com/request/request)
request(requestOptions);
// using with got (https://github.com/sindresorhus/got)
got[options.method](url, options);
// using with axios
axios(requestOptions);
```

## API

### `endpoint(route, options)` or `endpoint(options)`

<table>
  <thead align=left>
    <tr>
      <th>
        name
      </th>
      <th>
        type
      </th>
      <th width=100%>
        description
      </th>
    </tr>
  </thead>
  <tbody align=left valign=top>
    <tr>
      <th>
        <code>route</code>
      </th>
      <td>
        String
      </td>
      <td>
        If set, it has to be a string consisting of URL and the request method, e.g., <code>GET /orgs/{org}</code>. If it’s set to a URL, only the method defaults to <code>GET</code>.
      </td>
    </tr>
    <tr>
      <th>
        <code>options.method</code>
      </th>
      <td>
        String
      </td>
      <td>
        <strong>Required unless <code>route</code> is set.</strong> Any supported <a href="https://developer.github.com/v3/#http-verbs">http verb</a>. <em>Defaults to <code>GET</code></em>.
      </td>
    </tr>
    <tr>
      <th>
        <code>options.url</code>
      </th>
      <td>
        String
      </td>
      <td>
        <strong>Required unless <code>route</code> is set.</strong> A path or full URL which may contain <code>:variable</code> or <code>{variable}</code> placeholders,
        e.g., <code>/orgs/{org}/repos</code>. The <code>url</code> is parsed using <a href="https://github.com/bramstein/url-template">url-template</a>.
      </td>
    </tr>
    <tr>
      <th>
        <code>options.baseUrl</code>
      </th>
      <td>
        String
      </td>
      <td>
        <em>Defaults to <code>https://api.github.com</code></em>.
      </td>
    </tr>
    <tr>
      <th>
        <code>options.headers</code>
      </th>
      <td>
        Object
      </td>
      <td>
        Custom headers. Passed headers are merged with defaults:<br>
        <em><code>headers['user-agent']</code> defaults to <code>octokit-endpoint.js/1.2.3</code> (where <code>1.2.3</code> is the released version)</em>.<br>
        <em><code>headers['accept']</code> defaults to <code>application/vnd.github.v3+json</code></em>.<br>
      </td>
    </tr>
    <tr>
      <th>
        <code>options.mediaType.format</code>
      </th>
      <td>
        String
      </td>
      <td>
        Media type param, such as <code>raw</code>, <code>diff</code>, or <code>text+json</code>. See <a href="https://developer.github.com/v3/media/">Media Types</a>. Setting <code>options.mediaType.format</code> will amend the <code>headers.accept</code> value.
      </td>
    </tr>
    <tr>
      <th>
        <code>options.data</code>
      </th>
      <td>
        Any
      </td>
      <td>
        Set request body directly instead of setting it to JSON based on additional parameters. See <a href="#data-parameter">"The <code>data</code> parameter"</a> below.
      </td>
    </tr>
    <tr>
      <th>
        <code>options.request</code>
      </th>
      <td>
        Object
      </td>
      <td>
        Pass custom meta information for the request. The <code>request</code> object will be returned as is.
      </td>
    </tr>
  </tbody>
</table>

All other options will be passed depending on the `method` and `url` options.

1. If the option key has a placeholder in the `url`, it will be used as the replacement. For example, if the passed options are `{url: '/orgs/{org}/repos', org: 'foo'}` the returned `options.url` is `https://api.github.com/orgs/foo/repos`.
2. If the `method` is `GET` or `HEAD`, the option is passed as a query parameter.
3. Otherwise, the parameter is passed in the request body as a JSON key.

**Result**

`endpoint()` is a synchronous method and returns an object with the following keys:

<table>
  <thead align=left>
    <tr>
      <th>
        key
      </th>
      <th>
        type
      </th>
      <th width=100%>
        description
      </th>
    </tr>
  </thead>
  <tbody align=left valign=top>
    <tr>
      <th><code>method</code></th>
      <td>String</td>
      <td>The http method. Always lowercase.</td>
    </tr>
    <tr>
      <th><code>url</code></th>
      <td>String</td>
      <td>The url with placeholders replaced with passed parameters.</td>
    </tr>
    <tr>
      <th><code>headers</code></th>
      <td>Object</td>
      <td>All header names are lowercased.</td>
    </tr>
    <tr>
      <th><code>body</code></th>
      <td>Any</td>
      <td>The request body if one is present. Only for <code>PATCH</code>, <code>POST</code>, <code>PUT</code>, <code>DELETE</code> requests.</td>
    </tr>
    <tr>
      <th><code>request</code></th>
      <td>Object</td>
      <td>Request meta option, it will be returned as it was passed into <code>endpoint()</code></td>
    </tr>
  </tbody>
</table>

### `endpoint.defaults()`

Override or set default options. Example:

```js
const request = require("request");
const myEndpoint = require("@octokit/endpoint").defaults({
  baseUrl: "https://github-enterprise.acme-inc.com/api/v3",
  headers: {
    "user-agent": "myApp/1.2.3",
    authorization: `token 0000000000000000000000000000000000000001`,
  },
  org: "my-project",
  per_page: 100,
});

request(myEndpoint(`GET /orgs/{org}/repos`));
```

You can call `.defaults()` again on the returned method, the defaults will cascade.

```js
const myProjectEndpoint = endpoint.defaults({
  baseUrl: "https://github-enterprise.acme-inc.com/api/v3",
  headers: {
    "user-agent": "myApp/1.2.3",
  },
  org: "my-project",
});
const myProjectEndpointWithAuth = myProjectEndpoint.defaults({
  headers: {
    authorization: `token 0000000000000000000000000000000000000001`,
  },
});
```

`myProjectEndpointWithAuth` now defaults the `baseUrl`, `headers['user-agent']`,
`org` and `headers['authorization']` on top of `headers['accept']` that is set
by the global default.

### `endpoint.DEFAULTS`

The current default options.

```js
endpoint.DEFAULTS.baseUrl; // https://api.github.com
const myEndpoint = endpoint.defaults({
  baseUrl: "https://github-enterprise.acme-inc.com/api/v3",
});
myEndpoint.DEFAULTS.baseUrl; // https://github-enterprise.acme-inc.com/api/v3
```

### `endpoint.merge(route, options)` or `endpoint.merge(options)`

Get the defaulted endpoint options, but without parsing them into request options:

```js
const myProjectEndpoint = endpoint.defaults({
  baseUrl: "https://github-enterprise.acme-inc.com/api/v3",
  headers: {
    "user-agent": "myApp/1.2.3",
  },
  org: "my-project",
});
myProjectEndpoint.merge("GET /orgs/{org}/repos", {
  headers: {
    authorization: `token 0000000000000000000000000000000000000001`,
  },
  org: "my-secret-project",
  type: "private",
});

// {
//   baseUrl: 'https://github-enterprise.acme-inc.com/api/v3',
//   method: 'GET',
//   url: '/orgs/{org}/repos',
//   headers: {
//     accept: 'application/vnd.github.v3+json',
//     authorization: `token 0000000000000000000000000000000000000001`,
//     'user-agent': 'myApp/1.2.3'
//   },
//   org: 'my-secret-project',
//   type: 'private'
// }
```

### `endpoint.parse()`

Stateless method to turn endpoint options into request options. Calling
`endpoint(options)` is the same as calling `endpoint.parse(endpoint.merge(options))`.

## Special cases

<a name="data-parameter"></a>

### The `data` parameter – set request body directly

Some endpoints such as [Render a Markdown document in raw mode](https://developer.github.com/v3/markdown/#render-a-markdown-document-in-raw-mode) don’t have parameters that are sent as request body keys, instead, the request body needs to be set directly. In these cases, set the `data` parameter.

```js
const options = endpoint("POST /markdown/raw", {
  data: "Hello world github/linguist#1 **cool**, and #1!",
  headers: {
    accept: "text/html;charset=utf-8",
    "content-type": "text/plain",
  },
});

// options is
// {
//   method: 'post',
//   url: 'https://api.github.com/markdown/raw',
//   headers: {
//     accept: 'text/html;charset=utf-8',
//     'content-type': 'text/plain',
//     'user-agent': userAgent
//   },
//   body: 'Hello world github/linguist#1 **cool**, and #1!'
// }
```

### Set parameters for both the URL/query and the request body

There are API endpoints that accept both query parameters as well as a body. In that case, you need to add the query parameters as templates to `options.url`, as defined in the [RFC 6570 URI Template specification](https://tools.ietf.org/html/rfc6570).

Example

```js
endpoint(
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

## LICENSE

[MIT](LICENSE)
