import type {TransformStream} from 'node:stream/web';
import type {Duplex} from 'node:stream';
import type {Unless} from '../utils.js';

// `options.std*: Generator`
// @todo Use `string`, `Uint8Array` or `unknown` for both the argument and the return type, based on whether `encoding: 'buffer'` and `objectMode: true` are used.
// See https://github.com/sindresorhus/execa/issues/694
export type GeneratorTransform<IsSync extends boolean> = (chunk: unknown) =>
| Unless<IsSync, AsyncGenerator<unknown, void, void>>
| Generator<unknown, void, void>;
type GeneratorFinal<IsSync extends boolean> = () =>
| Unless<IsSync, AsyncGenerator<unknown, void, void>>
| Generator<unknown, void, void>;

export type TransformCommon = {
	/**
	If `true`, allow `transformOptions.transform` and `transformOptions.final` to return any type, not just `string` or `Uint8Array`.
	*/
	readonly objectMode?: boolean;
};

/**
A transform or an array of transforms can be passed to the `stdin`, `stdout`, `stderr` or `stdio` option.

A transform is either a generator function or a plain object with the following members.
*/
export type GeneratorTransformFull<IsSync extends boolean> = {
	/**
	Map or filter the input or output of the subprocess.
	*/
	readonly transform: GeneratorTransform<IsSync>;

	/**
	Create additional lines after the last one.
	*/
	readonly final?: GeneratorFinal<IsSync>;

	/**
	If `true`, iterate over arbitrary chunks of `Uint8Array`s instead of line `string`s.
	*/
	readonly binary?: boolean;

	/**
	If `true`, keep newlines in each `line` argument. Also, this allows multiple `yield`s to produces a single line.
	*/
	readonly preserveNewlines?: boolean;
} & TransformCommon;

// `options.std*: Duplex`
export type DuplexTransform = {
	readonly transform: Duplex;
} & TransformCommon;

// `options.std*: TransformStream`
export type WebTransform = {
	readonly transform: TransformStream;
} & TransformCommon;
