# eventsource

[![npm version](https://img.shields.io/npm/v/eventsource.svg?style=flat-square)](https://www.npmjs.com/package/eventsource)[![npm bundle size](https://img.shields.io/bundlephobia/minzip/eventsource?style=flat-square)](https://bundlephobia.com/result?p=eventsource)[![npm weekly downloads](https://img.shields.io/npm/dw/eventsource.svg?style=flat-square)](https://www.npmjs.com/package/eventsource)

WhatWG/W3C-compatible [server-sent events/eventsource](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) client. The module attempts to implement an absolute minimal amount of features/changes beyond the specification.

If you're looking for a modern alternative with a less constrained API, check out the [`eventsource-client` package](https://www.npmjs.com/package/eventsource-client).

## Installation

```bash
npm install --save eventsource
```

## Supported engines

- Node.js >= 18
- Chrome >= 63
- Safari >= 11.3
- Firefox >= 65
- Edge >= 79
- Deno >= 1.30
- Bun >= 1.1.23

Basically, any environment that supports:

- [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch)
- [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
- [TextDecoderStream](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoderStream)
- [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL)
- [Event](https://developer.mozilla.org/en-US/docs/Web/API/Event), [MessageEvent](https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent), [EventTarget](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)

If you need to support older runtimes, try the `2.x` branch/version range (note: 2.x branch is primarily targetted at Node.js, not browsers).

## Usage

```ts
import {EventSource} from 'eventsource'

const es = new EventSource('https://my-server.com/sse')

/*
 * This will listen for events with the field `event: notice`.
 */
es.addEventListener('notice', (event) => {
  console.log(event.data)
})

/*
 * This will listen for events with the field `event: update`.
 */
es.addEventListener('update', (event) => {
  console.log(event.data)
})

/*
 * The event "message" is a special case, as it will capture events _without_ an
 * event field, as well as events that have the specific type `event: message`.
 * It will not trigger on any other event type.
 */
es.addEventListener('message', (event) => {
  console.log(event.data)
})

/**
 * To explicitly close the connection, call the `close` method.
 * This will prevent any reconnection from happening.
 */
setTimeout(() => {
  es.close()
}, 10_000)
```

### TypeScript

Make sure you have configured your TSConfig so it matches the environment you are targetting. If you are targetting browsers, this would be `dom`:

```jsonc
{
  "compilerOptions": {
    "lib": ["dom"],
  },
}
```

If you're using Node.js, ensure you have `@types/node` installed (and it is version 18 or higher). Cloudflare workers have `@cloudflare/workers-types` etc.

The following errors are caused by targetting an environment that does not have the necessary types available:

```
error TS2304: Cannot find name 'Event'.
error TS2304: Cannot find name 'EventTarget'.
error TS2304: Cannot find name 'MessageEvent'.
```

## Migrating from v1 / v2

See [MIGRATION.md](MIGRATION.md#v2-to-v3) for a detailed migration guide.

## Extensions to the WhatWG/W3C API

### Message and code properties on errors

The `error` event has a `message` and `code` property that can be used to get more information about the error. In the specification, the Event

```ts
es.addEventListener('error', (err) => {
  if (err.code === 401 || err.code === 403) {
    console.log('not authorized')
  }
})
```

### Specify `fetch` implementation

The `EventSource` constructor accepts an optional `fetch` property in the second argument that can be used to specify the `fetch` implementation to use.

This can be useful in environments where the global `fetch` function is not available - but it can also be used to alter the request/response behaviour.

#### Setting HTTP request headers

```ts
const es = new EventSource('https://my-server.com/sse', {
  fetch: (input, init) =>
    fetch(input, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: 'Bearer myToken',
      },
    }),
})
```

#### HTTP/HTTPS proxy

Use a package like [`node-fetch-native`](https://github.com/unjs/node-fetch-native) to add proxy support, either through environment variables or explicit configuration.

```ts
// npm install node-fetch-native --save
import {fetch} from 'node-fetch-native/proxy'

const es = new EventSource('https://my-server.com/sse', {
  fetch: (input, init) => fetch(input, init),
})
```

#### Allow unauthorized HTTPS requests

Use a package like [`undici`](https://github.com/nodejs/undici) for more control of fetch options through the use of an [`Agent`](https://undici.nodejs.org/#/docs/api/Agent.md).

```ts
// npm install undici --save
import {fetch, Agent} from 'undici'

await fetch('https://my-server.com/sse', {
  dispatcher: new Agent({
    connect: {
      rejectUnauthorized: false,
    },
  }),
})
```

## License

MIT-licensed. See [LICENSE](LICENSE).
