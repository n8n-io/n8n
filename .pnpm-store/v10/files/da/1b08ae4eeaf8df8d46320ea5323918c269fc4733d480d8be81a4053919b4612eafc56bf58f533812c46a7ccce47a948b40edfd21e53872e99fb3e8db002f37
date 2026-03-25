# plugin-rest-endpoint-methods.js

> Octokit plugin adding one method for all of api.github.com REST API endpoints

[![@latest](https://img.shields.io/npm/v/@octokit/plugin-rest-endpoint-methods.svg)](https://www.npmjs.com/package/@octokit/plugin-rest-endpoint-methods)
[![Build Status](https://github.com/octokit/plugin-rest-endpoint-methods.js/workflows/Test/badge.svg)](https://github.com/octokit/plugin-rest-endpoint-methods.js/actions?workflow=Test)

## Usage

<table>
<tbody valign=top align=left>
<tr><th>
Browsers
</th><td width=100%>

Load `@octokit/plugin-rest-endpoint-methods` and [`@octokit/core`](https://github.com/octokit/core.js) (or core-compatible module) directly from [esm.sh](https://esm.sh)

```html
<script type="module">
  import { Octokit } from "https://esm.sh/@octokit/core";
  import { restEndpointMethods } from "https://esm.sh/@octokit/plugin-rest-endpoint-methods";
</script>
```

</td></tr>
<tr><th>
Node
</th><td>

Install with `npm install @octokit/core @octokit/plugin-rest-endpoint-methods`. Optionally replace `@octokit/core` with a compatible module

```js
const { Octokit } = require("@octokit/core");
const {
  restEndpointMethods,
} = require("@octokit/plugin-rest-endpoint-methods");
```

</td></tr>
</tbody>
</table>

```js
const MyOctokit = Octokit.plugin(restEndpointMethods);
const octokit = new MyOctokit({ auth: "secret123" });

// https://developer.github.com/v3/users/#get-the-authenticated-user
octokit.rest.users.getAuthenticated();
```

There is one method for each REST API endpoint documented at [https://developer.github.com/v3](https://developer.github.com/v3). All endpoint methods are documented in the [docs/](docs/) folder, e.g. [docs/users/getAuthenticated.md](docs/users/getAuthenticated.md)

## TypeScript

Parameter and response types for all endpoint methods exported as `{ RestEndpointMethodTypes }`.

Example

```ts
import { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";

type UpdateLabelParameters =
  RestEndpointMethodTypes["issues"]["updateLabel"]["parameters"];
type UpdateLabelResponse =
  RestEndpointMethodTypes["issues"]["updateLabel"]["response"];
```

In order to get types beyond parameters and responses, check out [`@octokit/openapi-types`](https://github.com/octokit/openapi-types.ts/#readme), which is a direct transpilation from GitHub's official OpenAPI specification.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[MIT](LICENSE)
