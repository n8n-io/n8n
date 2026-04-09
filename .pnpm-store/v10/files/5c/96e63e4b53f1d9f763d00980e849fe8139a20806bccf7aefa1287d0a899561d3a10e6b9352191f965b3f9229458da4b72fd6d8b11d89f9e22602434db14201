# Undici Module vs. Node.js Built-in Fetch

Node.js has shipped a built-in `fetch()` implementation powered by undici since
Node.js v18. This guide explains the relationship between the `undici` npm
package and the built-in `fetch`, and when you should install one versus relying
on the other.

## Background

The `fetch()`, `Request`, `Response`, `Headers`, and `FormData` globals in
Node.js v18+ are provided by a version of undici that is bundled into Node.js
itself. You can check which version is bundled with:

```js
console.log(process.versions.undici); // e.g., "7.5.0"
```

When you install undici from npm, you get the full library with all of its
additional APIs, and potentially a newer release than what your Node.js version
bundles.

## Keep `fetch` and `FormData` from the same implementation

When you send a `FormData` body, keep `fetch` and `FormData` together from the
same implementation.

Use one of these patterns:

### Built-in globals

```js
const body = new FormData()
body.set('name', 'some')
body.set('someOtherProperty', '8000')

await fetch('https://example.com', {
  method: 'POST',
  body
})
```

### `undici` module imports

```js
import { fetch, FormData } from 'undici'

const body = new FormData()
body.set('name', 'some')
body.set('someOtherProperty', '8000')

await fetch('https://example.com', {
  method: 'POST',
  body
})
```

### `undici.install()` globals

If you want the installed `undici` package to provide the globals, call
[`install()`](/docs/api/GlobalInstallation.md):

```js
import { install } from 'undici'

install()

const body = new FormData()
body.set('name', 'some')
body.set('someOtherProperty', '8000')

await fetch('https://example.com', {
  method: 'POST',
  body
})
```

`install()` replaces the global `fetch`, `Headers`, `Response`, `Request`, and
`FormData` implementations with undici's versions, and also installs undici's
`WebSocket`, `CloseEvent`, `ErrorEvent`, `MessageEvent`, and `EventSource`
globals.

Avoid mixing implementations in the same request, for example:

```js
import { fetch } from 'undici'

const body = new FormData()

await fetch('https://example.com', {
  method: 'POST',
  body
})
```

```js
import { FormData } from 'undici'

const body = new FormData()

await fetch('https://example.com', {
  method: 'POST',
  body
})
```

Those combinations may behave differently across Node.js and undici versions.
Using matching pairs keeps multipart handling predictable.

## When you do NOT need to install undici

If all of the following are true, you can rely on the built-in globals and skip
adding undici to your dependencies:

- You only need the standard Fetch API (`fetch`, `Request`, `Response`,
  `Headers`, `FormData`).
- You are running Node.js v18 or later.
- You do not depend on features or bug fixes introduced in a version of undici
  newer than the one bundled with your Node.js release.
- You want zero additional runtime dependencies.
- You want cross-platform interoperability with browsers and other runtimes
  (Deno, Bun, Cloudflare Workers, etc.) using the same Fetch API surface.

This is common in applications that make straightforward HTTP requests or in
libraries that target multiple JavaScript runtimes.

## When you SHOULD install undici

Install undici from npm when you need capabilities beyond the standard Fetch API:

### Advanced HTTP APIs

undici exposes `request`, `stream`, `pipeline`, and `connect` methods that
provide lower-level control and significantly better performance than `fetch`:

```js
import { request } from 'undici';

const { statusCode, headers, body } = await request('https://example.com');
const data = await body.json();
```

### Connection pooling and dispatchers

`Client`, `Pool`, `BalancedPool`, `Agent`, and their configuration options
let you manage connection lifecycle, keep-alive behavior, pipelining depth,
and concurrency limits:

```js
import { Pool } from 'undici';

const pool = new Pool('https://example.com', { connections: 10 });
const { body } = await pool.request({ path: '/', method: 'GET' });
```

### Proxy support

`ProxyAgent` and `EnvHttpProxyAgent` handle HTTP(S) proxying. Note that
Node.js v22.21.0+ and v24.0.0+ support environment-variable-based proxy
configuration for the built-in `fetch` via the `--use-env-proxy` flag (or
`NODE_USE_ENV_PROXY=1`). However, undici's `ProxyAgent` still provides
programmatic control through the dispatcher API:

```js
import { ProxyAgent, fetch } from 'undici';

const proxyAgent = new ProxyAgent('https://my-proxy.example.com:8080');
const response = await fetch('https://example.com', { dispatcher: proxyAgent });
```

### Testing and mocking

`MockAgent`, `MockClient`, and `MockPool` let you intercept and mock HTTP
requests without patching globals or depending on external libraries:

```js
import { MockAgent, setGlobalDispatcher, fetch } from 'undici';

const mockAgent = new MockAgent();
setGlobalDispatcher(mockAgent);

const pool = mockAgent.get('https://example.com');
pool.intercept({ path: '/api' }).reply(200, { message: 'mocked' });
```

### Interceptors and middleware

Custom dispatchers and interceptors (retry, redirect, cache, DNS) give you
fine-grained control over how requests are processed.

### Newer version than what Node.js bundles

The npm package often includes features, performance improvements, and bug fixes
that have not yet landed in a Node.js release. If you need a specific fix or
feature, you can install a newer version directly.

## Version compatibility

| Node.js version | Bundled undici version | Notes |
|---|---|---|
| v18.x | ~5.x | `fetch` is experimental (behind `--experimental-fetch` in early v18) |
| v20.x | ~6.x | `fetch` is stable |
| v22.x | ~6.x / ~7.x | `fetch` is stable |
| v24.x | ~7.x | `fetch` is stable; env-proxy support via `--use-env-proxy` |

You can always check the exact bundled version at runtime with
`process.versions.undici`.

Installing undici from npm does not replace the built-in globals. If you want
your installed version to replace the global `fetch` and related classes, use
[`install()`](/docs/api/GlobalInstallation.md). Otherwise, import `fetch`
directly from `'undici'`:

```js
import { fetch } from 'undici' // uses your installed version, not the built-in
```

## Further reading

- [API Reference: Fetch](/docs/api/Fetch.md)
- [API Reference: Client](/docs/api/Client.md)
- [API Reference: Pool](/docs/api/Pool.md)
- [API Reference: ProxyAgent](/docs/api/ProxyAgent.md)
- [API Reference: MockAgent](/docs/api/MockAgent.md)
- [API Reference: Global Installation](/docs/api/GlobalInstallation.md)
