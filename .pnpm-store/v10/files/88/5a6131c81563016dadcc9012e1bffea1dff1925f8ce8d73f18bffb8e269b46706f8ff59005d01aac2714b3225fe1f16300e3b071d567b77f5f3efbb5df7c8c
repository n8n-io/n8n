import type {BufferEncodingOption, BinaryEncodingOption} from '../arguments/encoding-option.js';
import type {IsObjectFd} from '../transform/object-mode.js';
import type {FdSpecificOption} from '../arguments/specific.js';
import type {CommonOptions} from '../arguments/options.js';
import type {IgnoresResultOutput} from './ignore.js';

// `result.stdout|stderr|stdio`
export type ResultStdioNotAll<
	FdNumber extends string,
	OptionsType extends CommonOptions,
> = ResultStdio<FdNumber, FdNumber, FdNumber, OptionsType>;

// `result.stdout|stderr|stdio|all`
export type ResultStdio<
	MainFdNumber extends string,
	ObjectFdNumber extends string,
	LinesFdNumber extends string,
	OptionsType extends CommonOptions,
> = ResultStdioProperty<
ObjectFdNumber,
LinesFdNumber,
IgnoresResultOutput<MainFdNumber, OptionsType>,
OptionsType
>;

type ResultStdioProperty<
	ObjectFdNumber extends string,
	LinesFdNumber extends string,
	StreamOutputIgnored,
	OptionsType extends CommonOptions,
> = StreamOutputIgnored extends true
	? undefined
	: ResultStdioItem<
	IsObjectFd<ObjectFdNumber, OptionsType>,
	FdSpecificOption<OptionsType['lines'], LinesFdNumber>,
	OptionsType['encoding']
	>;

type ResultStdioItem<
	IsObjectResult,
	LinesOption extends boolean | undefined,
	Encoding extends CommonOptions['encoding'],
> = IsObjectResult extends true ? unknown[]
	: Encoding extends BufferEncodingOption
		? Uint8Array
		: LinesOption extends true
			? Encoding extends BinaryEncodingOption
				? string
				: string[]
			: string;
