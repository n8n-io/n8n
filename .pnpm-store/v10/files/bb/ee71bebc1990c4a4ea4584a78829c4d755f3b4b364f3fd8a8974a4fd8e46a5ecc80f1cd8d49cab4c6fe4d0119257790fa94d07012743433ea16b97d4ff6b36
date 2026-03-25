import {Buffer} from 'node:buffer';
import {StringDecoder} from 'node:string_decoder';
import {isUint8Array, bufferToUint8Array} from '../utils/uint-array.js';

/*
When using binary encodings, add an internal generator that converts chunks from `Buffer` to `string` or `Uint8Array`.
Chunks might be Buffer, Uint8Array or strings since:
- `subprocess.stdout|stderr` emits Buffers
- `subprocess.stdin.write()` accepts Buffer, Uint8Array or string
- Previous generators might return Uint8Array or string

However, those are converted to Buffer:
- on writes: `Duplex.writable` `decodeStrings: true` default option
- on reads: `Duplex.readable` `readableEncoding: null` default option
*/
export const getEncodingTransformGenerator = (binary, encoding, skipped) => {
	if (skipped) {
		return;
	}

	if (binary) {
		return {transform: encodingUint8ArrayGenerator.bind(undefined, new TextEncoder())};
	}

	const stringDecoder = new StringDecoder(encoding);
	return {
		transform: encodingStringGenerator.bind(undefined, stringDecoder),
		final: encodingStringFinal.bind(undefined, stringDecoder),
	};
};

const encodingUint8ArrayGenerator = function * (textEncoder, chunk) {
	if (Buffer.isBuffer(chunk)) {
		yield bufferToUint8Array(chunk);
	} else if (typeof chunk === 'string') {
		yield textEncoder.encode(chunk);
	} else {
		yield chunk;
	}
};

const encodingStringGenerator = function * (stringDecoder, chunk) {
	yield isUint8Array(chunk) ? stringDecoder.write(chunk) : chunk;
};

const encodingStringFinal = function * (stringDecoder) {
	const lastChunk = stringDecoder.end();
	if (lastChunk !== '') {
		yield lastChunk;
	}
};
