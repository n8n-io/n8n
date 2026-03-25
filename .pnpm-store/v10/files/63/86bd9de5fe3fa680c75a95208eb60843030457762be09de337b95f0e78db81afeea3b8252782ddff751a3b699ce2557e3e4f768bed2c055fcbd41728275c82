# core.js

> Extendable client for GitHub's REST & GraphQL APIs

[![@latest](https://img.shields.io/npm/v/@octokit/core.svg)](https://www.npmjs.com/package/@octokit/core)
[![Build Status](https://github.com/octokit/core.js/workflows/Test/badge.svg)](https://github.com/octokit/core.js/actions?query=workflow%3ATest+branch%3Amain)

<!-- toc -->

- [Usage](#usage)
  - [REST API example](#rest-api-example)
  - [GraphQL example](#graphql-example)
- [Options](#options)
- [Defaults](#defaults)
- [Authentication](#authentication)
- [Logging](#logging)
- [Hooks](#hooks)
- [Plugins](#plugins)
- [Build your own Octokit with Plugins and Defaults](#build-your-own-octokit-with-plugins-and-defaults)
- [LICENSE](#license)

<!-- tocstop -->

If you need a minimalistic library to utilize GitHub's [REST API](https://developer.github.com/v3/) and [GraphQL API](https://developer.github.com/v4/) which you can extend with plugins as needed, then `@octokit/core` is a great starting point.

If you don't need the Plugin API then using [`@octokit/request`](https://github.com/octokit/request.js/) or [`@octokit/graphql`](https://github.com/octokit/graphql.js/) directly is a good alternative.

## Usage

<table>
<tbody valign=top align=left>
<tr><th>
Browsers
</th><td width=100%>
Load <code>@octokit/core</code> directly from <a href="https://esm.sh">esm.sh</a>

```html
<script type="module">
  import { Octokit } from "https://esm.sh/@octokit/core";
</script>
```

</td></tr>
<tr><th>
Node
</th><td>

Install with <code>npm install @octokit/core</code>

```js
const { Octokit } = require("@octokit/core");
// or: import { Octokit } from "@octokit/core";
```

</td></tr>
</tbody>
</table>

### REST API example

```js
// Create a personal access token at https://github.com/settings/tokens/new?scopes=repo
const octokit = new Octokit({ auth: `personal-access-token123` });

const response = await octokit.request("GET /orgs/{org}/repos", {
  org: "octokit",
  type: "private",
});
```

See [`@octokit/request`](https://github.com/octokit/request.js) for full documentation of the `.request` method.

### GraphQL example

```js
const octokit = new Octokit({ auth: `secret123` });

const response = await octokit.graphql(
  `query ($login: String!) {
    organization(login: $login) {
      repositories(privacy: PRIVATE) {
        totalCount
      }
    }
  }`,
  { login: "octokit" },
);
```

See [`@octokit/graphql`](https://github.com/octokit/graphql.js) for full documentation of the `.graphql` method.

## Options

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
        <code>options.authStrategy</code>
      </th>
      <td>
        <code>Function<code>
      </td>
      <td>
        Defaults to <a href="https://github.com/octokit/auth-token.js#readme"><code>@octokit/auth-token</code></a>. See <a href="#authentication">Authentication</a> below for examples.
      </td>
    </tr>
    <tr>
      <th>
        <code>options.auth</code>
      </th>
      <td>
        <code>String</code> or <code>Object</code>
      </td>
      <td>
        See <a href="#authentication">Authentication</a> below for examples.
      </td>
    </tr>
    <tr>
      <th>
        <code>options.baseUrl</code>
      </th>
      <td>
        <code>String</code>
      </td>
      <td>

When using with GitHub Enterprise Server, set `options.baseUrl` to the root URL of the API. For example, if your GitHub Enterprise Server's hostname is `github.acme-inc.com`, then set `options.baseUrl` to `https://github.acme-inc.com/api/v3`. Example

```js
const octokit = new Octokit({
  baseUrl: "https://github.acme-inc.com/api/v3",
});
```

</td></tr>
    <tr>
      <th>
        <code>options.previews</code>
      </th>
      <td>
        <code>Array of Strings</code>
      </td>
      <td>

Some REST API endpoints require preview headers to be set, or enable
additional features. Preview headers can be set on a per-request basis, e.g.

```js
octokit.request("POST /repos/{owner}/{repo}/pulls", {
  mediaType: {
    previews: ["shadow-cat"],
  },
  owner,
  repo,
  title: "My pull request",
  base: "main",
  head: "my-feature",
  draft: true,
});
```

You can also set previews globally, by setting the `options.previews` option on the constructor. Example:

```js
const octokit = new Octokit({
  previews: ["shadow-cat"],
});
```

</td></tr>
    <tr>
      <th>
        <code>options.request</code>
      </th>
      <td>
        <code>Object</code>
      </td>
      <td>

Set a default request timeout (`options.request.timeout`) or an [`http(s).Agent`](https://nodejs.org/api/http.html#http_class_http_agent) e.g. for proxy usage (Node only, `options.request.agent`).

There are more `options.request.*` options, see [`@octokit/request` options](https://github.com/octokit/request.js#request). `options.request` can also be set on a per-request basis.

</td></tr>
    <tr>
      <th>
        <code>options.timeZone</code>
      </th>
      <td>
        <code>String</code>
      </td>
      <td>

Sets the `Time-Zone` header which defines a timezone according to the [list of names from the Olson database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).

```js
const octokit = new Octokit({
  timeZone: "America/Los_Angeles",
});
```

The time zone header will determine the timezone used for generating the timestamp when creating commits. See [GitHub's Timezones documentation](https://developer.github.com/v3/#timezones).

</td></tr>
    <tr>
      <th>
        <code>options.userAgent</code>
      </th>
      <td>
        <code>String</code>
      </td>
      <td>

A custom user agent string for your app or library. Example

```js
const octokit = new Octokit({
  userAgent: "my-app/v1.2.3",
});
```

</td></tr>
  </tbody>
</table>

## Defaults

You can create a new Octokit class with customized default options.

```js
const MyOctokit = Octokit.defaults({
  auth: "personal-access-token123",
  baseUrl: "https://github.acme-inc.com/api/v3",
  userAgent: "my-app/v1.2.3",
});
const octokit1 = new MyOctokit();
const octokit2 = new MyOctokit();
```

If you pass additional options to your new constructor, the options will be merged shallowly.

```js
const MyOctokit = Octokit.defaults({
  foo: {
    opt1: 1,
  },
});
const octokit = new MyOctokit({
  foo: {
    opt2: 1,
  },
});
// options will be { foo: { opt2: 1 }}
```

If you need a deep or conditional merge, you can pass a function instead.

```js
const MyOctokit = Octokit.defaults((options) => {
  return {
    foo: Object.assign({}, options.foo, { opt1: 1 }),
  };
});
const octokit = new MyOctokit({
  foo: { opt2: 1 },
});
// options will be { foo: { opt1: 1, opt2: 1 }}
```

Be careful about mutating the `options` object in the `Octokit.defaults` callback, as it can have unforeseen consequences.

## Authentication

Authentication is optional for some REST API endpoints accessing public data, but is required for GraphQL queries. Using authentication also increases your [API rate limit](https://developer.github.com/v3/#rate-limiting).

By default, Octokit authenticates using the [token authentication strategy](https://github.com/octokit/auth-token.js). Pass in a token using `options.auth`. It can be a personal access token, an OAuth token, an installation access token or a JSON Web Token for GitHub App authentication. The `Authorization` header will be set according to the type of token.

```js
import { Octokit } from "@octokit/core";

const octokit = new Octokit({
  auth: "mypersonalaccesstoken123",
});

const { data } = await octokit.request("/user");
```

To use a different authentication strategy, set `options.authStrategy`. A list of authentication strategies is available at [octokit/authentication-strategies.js](https://github.com/octokit/authentication-strategies.js/#readme).

Example

```js
import { Octokit } from "@octokit/core";
import { createAppAuth } from "@octokit/auth-app";

const appOctokit = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: 123,
    privateKey: process.env.PRIVATE_KEY,
  },
});

const { data } = await appOctokit.request("/app");
```

The `.auth()` method returned by the current authentication strategy can be accessed at `octokit.auth()`. Example

```js
const { token } = await appOctokit.auth({
  type: "installation",
  installationId: 123,
});
```

## Logging

There are four built-in log methods

1. `octokit.log.debug(message[, additionalInfo])`
1. `octokit.log.info(message[, additionalInfo])`
1. `octokit.log.warn(message[, additionalInfo])`
1. `octokit.log.error(message[, additionalInfo])`

They can be configured using the [`log` client option](client-options). By default, `octokit.log.debug()` and `octokit.log.info()` are no-ops, while the other two call `console.warn()` and `console.error()` respectively.

This is useful if you build reusable [plugins](#plugins).

If you would like to make the log level configurable using an environment variable or external option, we recommend the [console-log-level](https://github.com/watson/console-log-level) package. Example

```js
const octokit = new Octokit({
  log: require("console-log-level")({ level: "info" }),
});
```

## Hooks

You can customize Octokit's request lifecycle with hooks.

```js
octokit.hook.before("request", async (options) => {
  validate(options);
});
octokit.hook.after("request", async (response, options) => {
  console.log(`${options.method} ${options.url}: ${response.status}`);
});
octokit.hook.error("request", async (error, options) => {
  if (error.status === 304) {
    return findInCache(error.response.headers.etag);
  }

  throw error;
});
octokit.hook.wrap("request", async (request, options) => {
  // add logic before, after, catch errors or replace the request altogether
  return request(options);
});
```

See [before-after-hook](https://github.com/gr2m/before-after-hook#readme) for more documentation on hooks.

## Plugins

Octokit’s functionality can be extended using plugins. The `Octokit.plugin()` method accepts a plugin (or many) and returns a new constructor.

A plugin is a function which gets two arguments:

1. the current instance
2. the options passed to the constructor.

In order to extend `octokit`'s API, the plugin must return an object with the new methods. Please refrain from adding methods directly to the `octokit` instance, especialy if you depend on keys that do not exist in `@octokit/core`, such as `octokit.rest`.

```js
// index.js
const { Octokit } = require("@octokit/core")
const MyOctokit = Octokit.plugin(
  require("./lib/my-plugin"),
  require("octokit-plugin-example")
);

const octokit = new MyOctokit({ greeting: "Moin moin" });
octokit.helloWorld(); // logs "Moin moin, world!"
octokit.request("GET /"); // logs "GET / - 200 in 123ms"

// lib/my-plugin.js
module.exports = (octokit, options = { greeting: "Hello" }) => {
  // hook into the request lifecycle
  octokit.hook.wrap("request", async (request, options) => {
    const time = Date.now();
    const response = await request(options);
    console.log(
      `${options.method} ${options.url} – ${response.status} in ${Date.now() -
        time}ms`
    );
    return response;
  });

  // add a custom method
  return {
    helloWorld: () => console.log(`${options.greeting}, world!`);
  }
};
```

## Build your own Octokit with Plugins and Defaults

You can build your own Octokit class with preset default options and plugins. In fact, this is mostly how the `@octokit/<context>` modules work, such as [`@octokit/action`](https://github.com/octokit/action.js):

```js
const { Octokit } = require("@octokit/core");
const MyActionOctokit = Octokit.plugin(
  require("@octokit/plugin-paginate-rest").paginateRest,
  require("@octokit/plugin-throttling").throttling,
  require("@octokit/plugin-retry").retry,
).defaults({
  throttle: {
    onAbuseLimit: (retryAfter, options) => {
      /* ... */
    },
    onRateLimit: (retryAfter, options) => {
      /* ... */
    },
  },
  authStrategy: require("@octokit/auth-action").createActionAuth,
  userAgent: `my-octokit-action/v1.2.3`,
});

const octokit = new MyActionOctokit();
const installations = await octokit.paginate("GET /app/installations");
```

## LICENSE

[MIT](LICENSE)
