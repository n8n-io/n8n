import type {StdioSingleOptionItems} from '../stdio/type.js';
import type {FdStdioOption} from '../stdio/option.js';
import type {CommonOptions} from '../arguments/options.js';
import type {DuplexTransform, TransformCommon} from './normalize.js';

// Whether a file descriptor is in object mode
// I.e. whether `result.stdout|stderr|stdio|all` is an array of `unknown` due to `objectMode: true`
export type IsObjectFd<
	FdNumber extends string,
	OptionsType extends CommonOptions,
> = IsObjectStdioOption<FdStdioOption<FdNumber, OptionsType>>;

type IsObjectStdioOption<StdioOptionType> = IsObjectStdioSingleOption<StdioSingleOptionItems<StdioOptionType>>;

type IsObjectStdioSingleOption<StdioSingleOptionType> = StdioSingleOptionType extends TransformCommon
	? BooleanObjectMode<StdioSingleOptionType['objectMode']>
	: StdioSingleOptionType extends DuplexTransform
		? StdioSingleOptionType['transform']['readableObjectMode']
		: false;

type BooleanObjectMode<ObjectModeOption extends boolean | undefined> = ObjectModeOption extends true ? true : false;
