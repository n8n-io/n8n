import process from 'node:process';
import {
	isStream as isNodeStream,
	isReadableStream as isNodeReadableStream,
	isWritableStream as isNodeWritableStream,
} from 'is-stream';
import {isWritableStream} from './type.js';

// For `stdio[fdNumber]` beyond stdin/stdout/stderr, we need to guess whether the value passed is intended for inputs or outputs.
// This allows us to know whether to pipe _into_ or _from_ the stream.
// When `stdio[fdNumber]` is a single value, this guess is fairly straightforward.
// However, when it is an array instead, we also need to make sure the different values are not incompatible with each other.
export const getStreamDirection = (stdioItems, fdNumber, optionName) => {
	const directions = stdioItems.map(stdioItem => getStdioItemDirection(stdioItem, fdNumber));

	if (directions.includes('input') && directions.includes('output')) {
		throw new TypeError(`The \`${optionName}\` option must not be an array of both readable and writable values.`);
	}

	return directions.find(Boolean) ?? DEFAULT_DIRECTION;
};

const getStdioItemDirection = ({type, value}, fdNumber) => KNOWN_DIRECTIONS[fdNumber] ?? guessStreamDirection[type](value);

// `stdin`/`stdout`/`stderr` have a known direction
const KNOWN_DIRECTIONS = ['input', 'output', 'output'];

const anyDirection = () => undefined;
const alwaysInput = () => 'input';

// `string` can only be added through the `input` option, i.e. does not need to be handled here
const guessStreamDirection = {
	generator: anyDirection,
	asyncGenerator: anyDirection,
	fileUrl: anyDirection,
	filePath: anyDirection,
	iterable: alwaysInput,
	asyncIterable: alwaysInput,
	uint8Array: alwaysInput,
	webStream: value => isWritableStream(value) ? 'output' : 'input',
	nodeStream(value) {
		if (!isNodeReadableStream(value, {checkOpen: false})) {
			return 'output';
		}

		return isNodeWritableStream(value, {checkOpen: false}) ? undefined : 'input';
	},
	webTransform: anyDirection,
	duplex: anyDirection,
	native(value) {
		const standardStreamDirection = getStandardStreamDirection(value);
		if (standardStreamDirection !== undefined) {
			return standardStreamDirection;
		}

		if (isNodeStream(value, {checkOpen: false})) {
			return guessStreamDirection.nodeStream(value);
		}
	},
};

const getStandardStreamDirection = value => {
	if ([0, process.stdin].includes(value)) {
		return 'input';
	}

	if ([1, 2, process.stdout, process.stderr].includes(value)) {
		return 'output';
	}
};

// When ambiguous, we initially keep the direction as `undefined`.
// This allows arrays of `stdio` values to resolve the ambiguity.
// For example, `stdio[3]: DuplexStream` is ambiguous, but `stdio[3]: [DuplexStream, WritableStream]` is not.
// When the ambiguity remains, we default to `output` since it is the most common use case for additional file descriptors.
const DEFAULT_DIRECTION = 'output';
