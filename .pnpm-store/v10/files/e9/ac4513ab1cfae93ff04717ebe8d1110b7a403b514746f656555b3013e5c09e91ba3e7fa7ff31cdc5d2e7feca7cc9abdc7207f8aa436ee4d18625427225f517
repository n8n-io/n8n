import type {CommonOptions} from '../arguments/options.js';
import type {Intersects} from '../utils.js';
import type {StdioSingleOptionItems, InputStdioOption} from './type.js';
import type {FdStdioArrayOption} from './option.js';

// Whether `result.stdio[FdNumber]` is an input stream
export type IsInputFd<
	FdNumber extends string,
	OptionsType extends CommonOptions,
> = FdNumber extends '0'
	? true
	: Intersects<StdioSingleOptionItems<FdStdioArrayOption<FdNumber, OptionsType>>, InputStdioOption>;
