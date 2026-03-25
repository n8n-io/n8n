# merge-streams

> Merge multiple streams into a unified stream

## Install

```sh
npm install @sindresorhus/merge-streams
```

## Usage

```js
import mergeStreams from '@sindresorhus/merge-streams';

const stream = mergeStreams([streamA, streamB]);

for await (const chunk of stream) {
	console.log(chunk);
	//=> 'A1'
	//=> 'B1'
	//=> 'A2'
	//=> 'B2'
}
```

## API

### `mergeStreams(streams: stream.Readable[]): MergedStream`

Merges an array of [readable streams](https://nodejs.org/api/stream.html#readable-streams) and returns a new readable stream that emits data from the individual streams as it arrives.

If you provide an empty array, the stream remains open but can be [manually ended](https://nodejs.org/api/stream.html#writableendchunk-encoding-callback).

#### `MergedStream`

_Type_: `stream.Readable`

A single stream combining the output of multiple streams.

##### `MergedStream.add(stream: stream.Readable): void`

Pipe a new readable stream.

Throws if `MergedStream` has already ended.

##### `MergedStream.remove(stream: stream.Readable): Promise<boolean>`

Unpipe a stream previously added using either [`mergeStreams(streams)`](#mergestreamsstreams-streamreadable-mergedstream) or [`MergedStream.add(stream)`](#mergedstreamaddstream-streamreadable-void).

Returns `false` if the stream was not previously added, or if it was already removed by `MergedStream.remove(stream)`.

The removed stream is not automatically ended.
