import type {Readable, Writable} from 'node:stream';
import type {ReadableStream, WritableStream, TransformStream} from 'node:stream/web';
import type {
	Not,
	And,
	Or,
	Unless,
	AndUnless,
} from '../utils.js';
import type {
	GeneratorTransform,
	GeneratorTransformFull,
	DuplexTransform,
	WebTransform,
} from '../transform/normalize.js';

type IsStandardStream<FdNumber extends string> = FdNumber extends keyof StandardStreams ? true : false;

export type StandardStreams = readonly ['stdin', 'stdout', 'stderr'];

// When `options.stdin|stdout|stderr|stdio` is set to one of those values, no stream is created
export type NoStreamStdioOption<FdNumber extends string> =
	| 'ignore'
	| 'inherit'
	| 'ipc'
	| number
	| Readable
	| Writable
	| Unless<IsStandardStream<FdNumber>, undefined>
	| readonly [NoStreamStdioOption<FdNumber>];

// `options.stdio` when it is not an array
type SimpleStdioOption<
	IsSync extends boolean,
	IsExtra extends boolean,
	IsArray extends boolean,
> =
	| undefined
	| 'pipe'
	| Unless<And<And<Not<IsSync>, IsArray>, IsExtra>, 'inherit'>
	| Unless<IsArray, 'ignore'>
	| Unless<IsSync, 'overlapped'>;

// Values available in both `options.stdin|stdio` and `options.stdout|stderr|stdio`
type CommonStdioOption<
	IsSync extends boolean,
	IsExtra extends boolean,
	IsArray extends boolean,
> =
	| SimpleStdioOption<IsSync, IsExtra, IsArray>
	| URL
	| {readonly file: string; readonly append?: boolean}
	| GeneratorTransform<IsSync>
	| GeneratorTransformFull<IsSync>
	| Unless<And<Not<IsSync>, IsArray>, 3 | 4 | 5 | 6 | 7 | 8 | 9>
	| Unless<Or<IsSync, IsArray>, 'ipc'>
	| Unless<IsSync, DuplexTransform | WebTransform | TransformStream>;

// Synchronous iterables excluding strings, Uint8Arrays and Arrays
type IterableObject<IsArray extends boolean> = Iterable<unknown>
& object
& {readonly BYTES_PER_ELEMENT?: never}
& AndUnless<IsArray, {readonly lastIndexOf?: never}>;

// `process.stdin|stdout|stderr` are `Duplex` with a `fd` property.
// This ensures they can only be passed to `stdin`/`stdout`/`stderr`, based on their direction.
type ProcessStdinFd = {readonly fd?: 0};
type ProcessStdoutStderrFd = {readonly fd?: 1 | 2};

// Values available only in `options.stdin|stdio`
export type InputStdioOption<
	IsSync extends boolean = boolean,
	IsExtra extends boolean = boolean,
	IsArray extends boolean = boolean,
> =
	| 0
	| Unless<And<IsSync, IsExtra>, Uint8Array | IterableObject<IsArray>>
	| Unless<And<IsSync, IsArray>, Readable & ProcessStdinFd>
	| Unless<IsSync, (AsyncIterable<unknown> & ProcessStdinFd) | ReadableStream>;

// Values available only in `options.stdout|stderr|stdio`
type OutputStdioOption<
	IsSync extends boolean,
	IsArray extends boolean,
> =
	| 1
	| 2
	| Unless<And<IsSync, IsArray>, Writable & ProcessStdoutStderrFd>
	| Unless<IsSync, WritableStream>;

// `options.stdin` array items
type StdinSingleOption<
	IsSync extends boolean,
	IsExtra extends boolean,
	IsArray extends boolean,
> =
	| CommonStdioOption<IsSync, IsExtra, IsArray>
	| InputStdioOption<IsSync, IsExtra, IsArray>;

// `options.stdin`
export type StdinOptionCommon<
	IsSync extends boolean = boolean,
	IsExtra extends boolean = boolean,
> =
	| StdinSingleOption<IsSync, IsExtra, false>
	| ReadonlyArray<StdinSingleOption<IsSync, IsExtra, true>>;

// `options.stdin`, async
export type StdinOption = StdinOptionCommon<false, false>;
// `options.stdin`, sync
export type StdinSyncOption = StdinOptionCommon<true, false>;

// `options.stdout|stderr` array items
type StdoutStderrSingleOption<
	IsSync extends boolean,
	IsExtra extends boolean,
	IsArray extends boolean,
> =
  | CommonStdioOption<IsSync, IsExtra, IsArray>
  | OutputStdioOption<IsSync, IsArray>;

// `options.stdout|stderr`
export type StdoutStderrOptionCommon<
	IsSync extends boolean = boolean,
	IsExtra extends boolean = boolean,
> =
	| StdoutStderrSingleOption<IsSync, IsExtra, false>
	| ReadonlyArray<StdoutStderrSingleOption<IsSync, IsExtra, true>>;

// `options.stdout|stderr`, async
export type StdoutStderrOption = StdoutStderrOptionCommon<false, false>;
// `options.stdout|stderr`, sync
export type StdoutStderrSyncOption = StdoutStderrOptionCommon<true, false>;

// `options.stdio[3+]`
type StdioExtraOptionCommon<IsSync extends boolean> =
	| StdinOptionCommon<IsSync, true>
	| StdoutStderrOptionCommon<IsSync, true>;

// `options.stdin|stdout|stderr|stdio` array items
type StdioSingleOption<
	IsSync extends boolean = boolean,
	IsExtra extends boolean = boolean,
	IsArray extends boolean = boolean,
> =
	| StdinSingleOption<IsSync, IsExtra, IsArray>
	| StdoutStderrSingleOption<IsSync, IsExtra, IsArray>;

// Get `options.stdin|stdout|stderr|stdio` items if it is an array, else keep as is
export type StdioSingleOptionItems<StdioOptionType> = StdioOptionType extends readonly StdioSingleOption[]
	? StdioOptionType[number]
	: StdioOptionType;

// `options.stdin|stdout|stderr|stdio`
export type StdioOptionCommon<IsSync extends boolean = boolean> =
	| StdinOptionCommon<IsSync>
	| StdoutStderrOptionCommon<IsSync>;

// `options.stdio` when it is an array
export type StdioOptionsArray<IsSync extends boolean = boolean> = readonly [
	StdinOptionCommon<IsSync, false>,
	StdoutStderrOptionCommon<IsSync, false>,
	StdoutStderrOptionCommon<IsSync, false>,
	...ReadonlyArray<StdioExtraOptionCommon<IsSync>>,
];

// `options.stdio`
export type StdioOptionsProperty<IsSync extends boolean = boolean> =
	| SimpleStdioOption<IsSync, false, false>
	| StdioOptionsArray<IsSync>;
