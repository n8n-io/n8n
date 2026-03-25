import {type Readable} from 'node:stream';

/**
Merges an array of [readable streams](https://nodejs.org/api/stream.html#readable-streams) and returns a new readable stream that emits data from the individual streams as it arrives.

If you provide an empty array, the stream remains open but can be [manually ended](https://nodejs.org/api/stream.html#writableendchunk-encoding-callback).

@example
```
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
*/
export default function mergeStreams(streams: Readable[]): MergedStream;

/**
A single stream combining the output of multiple streams.
*/
export class MergedStream extends Readable {
	/**
	Pipe a new readable stream.

	Throws if `MergedStream` has already ended.
	*/
	add(stream: Readable): void;

	/**
	Unpipe a stream previously added using either `mergeStreams(streams)` or `MergedStream.add(stream)`.

	Returns `false` if the stream was not previously added, or if it was already removed by `MergedStream.remove(stream)`.

	The removed stream is not automatically ended.
	*/
	remove(stream: Readable): Promise<boolean>;
}
