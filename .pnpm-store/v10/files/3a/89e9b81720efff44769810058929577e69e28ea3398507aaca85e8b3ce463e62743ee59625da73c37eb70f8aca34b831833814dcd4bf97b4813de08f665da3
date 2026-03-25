import type {NoStreamStdioOption} from '../stdio/type.js';
import type {IsInputFd} from '../stdio/direction.js';
import type {FdStdioOption} from '../stdio/option.js';
import type {FdSpecificOption} from '../arguments/specific.js';
import type {CommonOptions} from '../arguments/options.js';

// Whether `result.stdin|stdout|stderr|all|stdio[*]` is `undefined`
export type IgnoresResultOutput<
	FdNumber extends string,
	OptionsType extends CommonOptions,
> = FdSpecificOption<OptionsType['buffer'], FdNumber> extends false
	? true
	: IsInputFd<FdNumber, OptionsType> extends true
		? true
		: IgnoresSubprocessOutput<FdNumber, OptionsType>;

// Whether `subprocess.stdout|stderr|all` is `undefined|null`
export type IgnoresSubprocessOutput<
	FdNumber extends string,
	OptionsType extends CommonOptions,
> = IgnoresOutput<FdNumber, FdStdioOption<FdNumber, OptionsType>>;

type IgnoresOutput<
	FdNumber extends string,
	StdioOptionType,
> = StdioOptionType extends NoStreamStdioOption<FdNumber> ? true : false;
