import type {Readable, Writable} from 'node:stream';
import type {IsInputFd} from '../stdio/direction.js';
import type {IgnoresSubprocessOutput} from '../return/ignore.js';
import type {Options} from '../arguments/options.js';

// `subprocess.stdin|stdout|stderr|stdio`
export type SubprocessStdioStream<
	FdNumber extends string,
	OptionsType extends Options,
> = SubprocessStream<FdNumber, IgnoresSubprocessOutput<FdNumber, OptionsType>, OptionsType>;

type SubprocessStream<
	FdNumber extends string,
	StreamResultIgnored,
	OptionsType extends Options,
> = StreamResultIgnored extends true
	? null
	: InputOutputStream<IsInputFd<FdNumber, OptionsType>>;

type InputOutputStream<IsInput extends boolean> = IsInput extends true
	? Writable
	: Readable;
