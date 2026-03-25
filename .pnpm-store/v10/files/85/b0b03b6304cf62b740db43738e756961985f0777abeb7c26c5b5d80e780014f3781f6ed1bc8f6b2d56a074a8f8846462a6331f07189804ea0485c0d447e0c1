import type {CommonOptions} from '../arguments/options.js';
import type {StdinOptionCommon, StdoutStderrOptionCommon, StdioOptionsArray} from './type.js';

// `options.stdio`, normalized as an array
export type StdioOptionNormalizedArray<OptionsType extends CommonOptions> = StdioOptionNormalized<OptionsType['stdio']>;

type StdioOptionNormalized<StdioOption extends CommonOptions['stdio']> = StdioOption extends StdioOptionsArray
	? StdioOption
	: StdioOption extends StdinOptionCommon
		? StdioOption extends StdoutStderrOptionCommon
			? readonly [StdioOption, StdioOption, StdioOption]
			: DefaultStdioOption
		: DefaultStdioOption;

// `options.stdio` default value
type DefaultStdioOption = readonly ['pipe', 'pipe', 'pipe'];
