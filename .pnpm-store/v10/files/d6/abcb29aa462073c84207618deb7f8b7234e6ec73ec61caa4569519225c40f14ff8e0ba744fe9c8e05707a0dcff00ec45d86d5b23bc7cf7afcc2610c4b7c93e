import type {BinaryEncodingOption} from './arguments/encoding-option.js';
import type {Options} from './arguments/options.js';
import type {FromOption, ToOption} from './arguments/fd-options.js';

// `subprocess.readable|duplex|iterable()` options
export type ReadableOptions = {
	/**
	Which stream to read from the subprocess. A [file descriptor](https://en.wikipedia.org/wiki/File_descriptor) like `"fd3"` can also be passed.

	`"all"` reads both `stdout` and `stderr`. This requires the `all` option to be `true`.

	@default 'stdout'
	*/
	readonly from?: FromOption;

	/**
	If `false`, iterates over lines. Each line is a string.

	If `true`, iterates over arbitrary chunks of data. Each line is an [`Uint8Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) (with `subprocess.iterable()`) or a [`Buffer`](https://nodejs.org/api/buffer.html#class-buffer) (with `subprocess.readable()`/`subprocess.duplex()`).

	This is always `true` when the `encoding` option is binary.

	@default `false` with `subprocess.iterable()`, `true` otherwise
	*/
	readonly binary?: boolean;

	/**
	If both this option and the `binary` option is `false`, [newlines](https://en.wikipedia.org/wiki/Newline) are stripped from each line.

	@default `false` with `subprocess.iterable()`, `true` otherwise
	*/
	readonly preserveNewlines?: boolean;
};

// `subprocess.writable|duplex()` options
export type WritableOptions = {
	/**
	Which stream to write to the subprocess. A [file descriptor](https://en.wikipedia.org/wiki/File_descriptor) like `"fd3"` can also be passed.

	@default 'stdin'
	*/
	readonly to?: ToOption;
};

// `subprocess.duplex()` options
export type DuplexOptions = ReadableOptions & WritableOptions;

// `subprocess.iterable()` return value
export type SubprocessAsyncIterable<
	BinaryOption extends boolean | undefined,
	EncodingOption extends Options['encoding'],
> = AsyncIterableIterator<
EncodingOption extends BinaryEncodingOption
	? Uint8Array
	: BinaryOption extends true
		? Uint8Array
		: string
>;
