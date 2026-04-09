# eventsource-parser

[![npm version](https://img.shields.io/npm/v/eventsource-parser.svg?style=flat-square)](https://www.npmjs.com/package/eventsource-parser)[![npm bundle size](https://img.shields.io/bundlephobia/minzip/eventsource-parser?style=flat-square)](https://bundlephobia.com/result?p=eventsource-parser)[![npm weekly downloads](https://img.shields.io/npm/dw/eventsource-parser.svg?style=flat-square)](https://www.npmjs.com/package/eventsource-parser)

A streaming parser for [server-sent events/eventsource](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events), without any assumptions about how the actual stream of data is retrieved. It is intended to be a building block for [clients](https://github.com/rexxars/eventsource-client) and polyfills in javascript environments such as browsers, node.js and deno.

If you are looking for a modern client implementation, see [eventsource-client](https://github.com/rexxars/eventsource-client).

You create an instance of the parser, and _feed_ it chunks of data - partial or complete, and the parse emits parsed messages once it receives a complete message. A [TransformStream variant](#stream-usage) is also available for environments that support it (modern browsers, Node 18 and higher).

Other modules in the EventSource family:

- [eventsource-client](https://github.com/rexxars/eventsource-client): modern, feature rich eventsource client for browsers, node.js, bun, deno and other modern JavaScript environments.
- [eventsource-encoder](https://github.com/rexxars/eventsource-encoder): encodes messages in the EventSource/Server-Sent Events format.
- [eventsource](https://github.com/eventsource/eventsource): Node.js polyfill for the WhatWG EventSource API.

> [!NOTE]
> Migrating from eventsource-parser 1.x/2.x? See the [migration guide](./MIGRATE-v3.md).

## Installation

```bash
npm install --save eventsource-parser
```

## Usage

```ts
import {createParser, type EventSourceMessage} from 'eventsource-parser'

function onEvent(event: EventSourceMessage) {
  console.log('Received event!')
  console.log('id: %s', event.id || '<none>')
  console.log('event: %s', event.event || '<none>')
  console.log('data: %s', event.data)
}

const parser = createParser({onEvent})
const sseStream = getSomeReadableStream()

for await (const chunk of sseStream) {
  parser.feed(chunk)
}

// If you want to re-use the parser for a new stream of events, make sure to reset it!
parser.reset()
console.log('Done!')
```

### Retry intervals

If the server sends a `retry` field in the event stream, the parser will call any `onRetry` callback specified to the `createParser` function:

```ts
const parser = createParser({
  onRetry(retryInterval) {
    console.log('Server requested retry interval of %dms', retryInterval)
  },
  onEvent(event) {
    // …
  },
})
```

### Parse errors

If the parser encounters an error while parsing, it will call any `onError` callback provided to the `createParser` function:

```ts
import {type ParseError} from 'eventsource-parser'

const parser = createParser({
  onError(error: ParseError) {
    console.error('Error parsing event:', error)
    if (error.type === 'invalid-field') {
      console.error('Field name:', error.field)
      console.error('Field value:', error.value)
      console.error('Line:', error.line)
    } else if (error.type === 'invalid-retry') {
      console.error('Invalid retry interval:', error.value)
    }
  },
  onEvent(event) {
    // …
  },
})
```

Note that `invalid-field` errors will usually be called for any invalid data - not only data shaped as `field: value`. This is because the EventSource specification says to treat anything prior to a `:` as the field name. Use the `error.line` property to get the full line that caused the error.

> [!NOTE]
> When encountering the end of a stream, calling `.reset({consume: true})` on the parser to flush any remaining data and reset the parser state. This will trigger the `onError` callback if the pending data is not a valid event.

### Comments

The parser will ignore comments (lines starting with `:`) by default. If you want to handle comments, you can provide an `onComment` callback to the `createParser` function:

```ts
const parser = createParser({
  onComment(comment) {
    console.log('Received comment:', comment)
  },
  onEvent(event) {
    // …
  },
})
```

> [!NOTE]
> Leading whitespace is not stripped from comments, eg `: comment` will give ` comment` as the comment value, not `comment` (note the leading space).

## Stream usage

```ts
import {EventSourceParserStream} from 'eventsource-parser/stream'

const eventStream = response.body
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(new EventSourceParserStream())
```

Note that the TransformStream is exposed under a separate export (`eventsource-parser/stream`), in order to maximize compatibility with environments that do not have the `TransformStream` constructor available.

## License

MIT © [Espen Hovlandsdal](https://espen.codes/)
