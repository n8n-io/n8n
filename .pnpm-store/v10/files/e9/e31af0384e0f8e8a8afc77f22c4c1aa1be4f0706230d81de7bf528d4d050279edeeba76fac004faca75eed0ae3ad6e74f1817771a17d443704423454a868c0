# http-error.js

> Error class for Octokit request errors

[![@latest](https://img.shields.io/npm/v/@octokit/request-error.svg)](https://www.npmjs.com/package/@octokit/request-error)
[![Build Status](https://github.com/octokit/request-error.js/workflows/Test/badge.svg)](https://github.com/octokit/request-error.js/actions?query=workflow%3ATest)

## Usage

<table>
<tbody valign=top align=left>
<tr><th>
Browsers
</th><td width=100%>
Load <code>@octokit/request-error</code> directly from <a href="https://esm.sh">esm.sh</a>
        
```html
<script type="module">
import { RequestError } from "https://esm.sh/@octokit/request-error";
</script>
```

</td></tr>
<tr><th>
Node
</th><td>

Install with <code>npm install @octokit/request-error</code>

```js
const { RequestError } = require("@octokit/request-error");
// or: import { RequestError } from "@octokit/request-error";
```

</td></tr>
</tbody>
</table>

```js
const error = new RequestError("Oops", 500, {
  request: {
    method: "POST",
    url: "https://api.github.com/foo",
    body: {
      bar: "baz",
    },
    headers: {
      authorization: "token secret123",
    },
  },
  response: {
    status: 500,
    url: "https://api.github.com/foo",
    headers: {
      "x-github-request-id": "1:2:3:4",
    },
    data: {
      foo: "bar",
    },
  },
});

error.message; // Oops
error.status; // 500
error.request; // { method, url, headers, body }
error.response; // { url, status, headers, data }
```

### Usage with Octokit

```js
try {
  // your code here that sends at least one Octokit request
  await octokit.request("GET /");
} catch (error) {
  // Octokit errors always have a `error.status` property which is the http response code
  if (error.status) {
    // handle Octokit error
  } else {
    // handle all other errors
    throw error;
  }
}
```

## LICENSE

[MIT](LICENSE)
