# is-stream

> Check if something is a [Node.js stream](https://nodejs.org/api/stream.html)

## Install

```sh
npm install is-stream
```

## Usage

```js
import fs from 'node:fs';
import {isStream} from 'is-stream';

isStream(fs.createReadStream('unicorn.png'));
//=> true

isStream({});
//=> false
```

## API

### isStream(stream, options?)

Returns a `boolean` for whether it's a [`Stream`](https://nodejs.org/api/stream.html#stream_stream).

### isWritableStream(stream, options?)

Returns a `boolean` for whether it's a [`stream.Writable`](https://nodejs.org/api/stream.html#stream_class_stream_writable), an [`http.OutgoingMessage`](https://nodejs.org/api/http.html#class-httpoutgoingmessage), an [`http.ServerResponse`](https://nodejs.org/api/http.html#class-httpserverresponse) or an [`http.ClientRequest`](https://nodejs.org/api/http.html#class-httpserverresponse).

### isReadableStream(stream, options?)

Returns a `boolean` for whether it's a [`stream.Readable`](https://nodejs.org/api/stream.html#stream_class_stream_readable) or an [`http.IncomingMessage`](https://nodejs.org/api/http.html#class-httpincomingmessage).

### isDuplexStream(stream, options?)

Returns a `boolean` for whether it's a [`stream.Duplex`](https://nodejs.org/api/stream.html#stream_class_stream_duplex).

### isTransformStream(stream, options?)

Returns a `boolean` for whether it's a [`stream.Transform`](https://nodejs.org/api/stream.html#stream_class_stream_transform).

### Options

#### checkOpen

Type: `boolean`\
Default: `true`

When this option is `true`, the method returns `false` if the stream has already been closed.

## Related

- [is-file-stream](https://github.com/jamestalmage/is-file-stream) - Detect if a stream is a file stream
