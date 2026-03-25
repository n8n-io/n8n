# plugin-paginate-rest.js

> Octokit plugin to paginate REST API endpoint responses

[![@latest](https://img.shields.io/npm/v/@octokit/plugin-paginate-rest.svg)](https://www.npmjs.com/package/@octokit/plugin-paginate-rest)
[![Build Status](https://github.com/octokit/plugin-paginate-rest.js/workflows/Test/badge.svg)](https://github.com/octokit/plugin-paginate-rest.js/actions?workflow=Test)

## Usage

<table>
<tbody valign=top align=left>
<tr><th>
Browsers
</th><td width=100%>

Load `@octokit/plugin-paginate-rest` and [`@octokit/core`](https://github.com/octokit/core.js) (or core-compatible module) directly from [esm.sh](https://esm.sh)

```html
<script type="module">
  import { Octokit } from "https://esm.sh/@octokit/core";
  import {
    paginateRest,
    composePaginateRest,
  } from "https://esm.sh/@octokit/plugin-paginate-rest";
</script>
```

</td></tr>
<tr><th>
Node
</th><td>

Install with `npm install @octokit/core @octokit/plugin-paginate-rest`. Optionally replace `@octokit/core` with a core-compatible module

```js
const { Octokit } = require("@octokit/core");
const {
  paginateRest,
  composePaginateRest,
} = require("@octokit/plugin-paginate-rest");
```

</td></tr>
</tbody>
</table>

```js
const MyOctokit = Octokit.plugin(paginateRest);
const octokit = new MyOctokit({ auth: "secret123" });

// See https://developer.github.com/v3/issues/#list-issues-for-a-repository
const issues = await octokit.paginate("GET /repos/{owner}/{repo}/issues", {
  owner: "octocat",
  repo: "hello-world",
  since: "2010-10-01",
  per_page: 100,
});
```

If you want to utilize the pagination methods in another plugin, use `composePaginateRest`.

```js
function myPlugin(octokit, options) {
  return {
    allStars({owner, repo}) => {
      return composePaginateRest(
        octokit,
        "GET /repos/{owner}/{repo}/stargazers",
        {owner, repo }
      )
    }
  }
}
```

## `octokit.paginate()`

The `paginateRest` plugin adds a new `octokit.paginate()` method which accepts the same parameters as [`octokit.request`](https://github.com/octokit/request.js#request). Only "List ..." endpoints such as [List issues for a repository](https://developer.github.com/v3/issues/#list-issues-for-a-repository) are supporting pagination. Their [response includes a Link header](https://developer.github.com/v3/issues/#response-1). For other endpoints, `octokit.paginate()` behaves the same as `octokit.request()`.

The `per_page` parameter is usually defaulting to `30`, and can be set to up to `100`, which helps retrieving a big amount of data without hitting the rate limits too soon.

An optional `mapFunction` can be passed to map each page response to a new value, usually an array with only the data you need. This can help to reduce memory usage, as only the relevant data has to be kept in memory until the pagination is complete.

```js
const issueTitles = await octokit.paginate(
  "GET /repos/{owner}/{repo}/issues",
  {
    owner: "octocat",
    repo: "hello-world",
    since: "2010-10-01",
    per_page: 100,
  },
  (response) => response.data.map((issue) => issue.title),
);
```

The `mapFunction` gets a 2nd argument `done` which can be called to end the pagination early.

```js
const issues = await octokit.paginate(
  "GET /repos/{owner}/{repo}/issues",
  {
    owner: "octocat",
    repo: "hello-world",
    since: "2010-10-01",
    per_page: 100,
  },
  (response, done) => {
    if (response.data.find((issue) => issue.title.includes("something"))) {
      done();
    }
    return response.data;
  },
);
```

Alternatively you can pass a `request` method as first argument. This is great when using in combination with [`@octokit/plugin-rest-endpoint-methods`](https://github.com/octokit/plugin-rest-endpoint-methods.js/):

```js
const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
  owner: "octocat",
  repo: "hello-world",
  since: "2010-10-01",
  per_page: 100,
});
```

## `octokit.paginate.iterator()`

If your target runtime environments supports async iterators (such as most modern browsers and Node 10+), you can iterate through each response

```js
const parameters = {
  owner: "octocat",
  repo: "hello-world",
  since: "2010-10-01",
  per_page: 100,
};
for await (const response of octokit.paginate.iterator(
  "GET /repos/{owner}/{repo}/issues",
  parameters,
)) {
  // do whatever you want with each response, break out of the loop, etc.
  const issues = response.data;
  console.log("%d issues found", issues.length);
}
```

Alternatively you can pass a `request` method as first argument. This is great when using in combination with [`@octokit/plugin-rest-endpoint-methods`](https://github.com/octokit/plugin-rest-endpoint-methods.js/):

```js
const parameters = {
  owner: "octocat",
  repo: "hello-world",
  since: "2010-10-01",
  per_page: 100,
};
for await (const response of octokit.paginate.iterator(
  octokit.rest.issues.listForRepo,
  parameters,
)) {
  // do whatever you want with each response, break out of the loop, etc.
  const issues = response.data;
  console.log("%d issues found", issues.length);
}
```

## `composePaginateRest` and `composePaginateRest.iterator`

The `compose*` methods work just like their `octokit.*` counterparts described above, with the differenct that both methods require an `octokit` instance to be passed as first argument

## How it works

`octokit.paginate()` wraps `octokit.request()`. As long as a `rel="next"` link value is present in the response's `Link` header, it sends another request for that URL, and so on.

Most of GitHub's paginating REST API endpoints return an array, but there are a few exceptions which return an object with a key that includes the items array. For example:

- [Search repositories](https://developer.github.com/v3/search/#example) (key `items`)
- [List check runs for a specific ref](https://developer.github.com/v3/checks/runs/#response-3) (key: `check_runs`)
- [List check suites for a specific ref](https://developer.github.com/v3/checks/suites/#response-1) (key: `check_suites`)
- [List repositories](https://developer.github.com/v3/apps/installations/#list-repositories) for an installation (key: `repositories`)
- [List installations for a user](https://developer.github.com/v3/apps/installations/#response-1) (key `installations`)

`octokit.paginate()` is working around these inconsistencies so you don't have to worry about it.

If a response is lacking the `Link` header, `octokit.paginate()` still resolves with an array, even if the response returns a single object.

## Types

The plugin also exposes some types and runtime type guards for TypeScript projects.

<table>
<tbody valign=top align=left>
<tr><th>
Types
</th><td>

```typescript
import {
  PaginateInterface,
  PaginatingEndpoints,
} from "@octokit/plugin-paginate-rest";
```

</td></tr>
<tr><th>
Guards
</th><td>

```typescript
import { isPaginatingEndpoint } from "@octokit/plugin-paginate-rest";
```

</td></tr>
</tbody>
</table>

### PaginateInterface

An `interface` that declares all the overloads of the `.paginate` method.

### PaginatingEndpoints

An `interface` which describes all API endpoints supported by the plugin. Some overloads of `.paginate()` method and `composePaginateRest()` function depend on `PaginatingEndpoints`, using the `keyof PaginatingEndpoints` as a type for one of its arguments.

```typescript
import { Octokit } from "@octokit/core";
import {
  PaginatingEndpoints,
  composePaginateRest,
} from "@octokit/plugin-paginate-rest";

type DataType<T> = "data" extends keyof T ? T["data"] : unknown;

async function myPaginatePlugin<E extends keyof PaginatingEndpoints>(
  octokit: Octokit,
  endpoint: E,
  parameters?: PaginatingEndpoints[E]["parameters"],
): Promise<DataType<PaginatingEndpoints[E]["response"]>> {
  return await composePaginateRest(octokit, endpoint, parameters);
}
```

### isPaginatingEndpoint

A type guard, `isPaginatingEndpoint(arg)` returns `true` if `arg` is one of the keys in `PaginatingEndpoints` (is `keyof PaginatingEndpoints`).

```typescript
import { Octokit } from "@octokit/core";
import {
  isPaginatingEndpoint,
  composePaginateRest,
} from "@octokit/plugin-paginate-rest";

async function myPlugin(octokit: Octokit, arg: unknown) {
  if (isPaginatingEndpoint(arg)) {
    return await composePaginateRest(octokit, arg);
  }
  // ...
}
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[MIT](LICENSE)
