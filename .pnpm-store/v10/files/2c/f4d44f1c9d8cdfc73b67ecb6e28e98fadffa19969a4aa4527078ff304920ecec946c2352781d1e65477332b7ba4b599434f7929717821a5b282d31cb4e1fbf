import type {StdioOptionNormalizedArray} from '../stdio/array.js';
import type {CommonOptions} from '../arguments/options.js';
import type {ResultStdioNotAll} from './result-stdout.js';

// `result.stdio`
export type ResultStdioArray<OptionsType extends CommonOptions> =
	MapResultStdio<StdioOptionNormalizedArray<OptionsType>, OptionsType>;

type MapResultStdio<
	StdioOptionsArrayType,
	OptionsType extends CommonOptions,
> = {
	-readonly [FdNumber in keyof StdioOptionsArrayType]: ResultStdioNotAll<
	FdNumber extends string ? FdNumber : string,
	OptionsType
	>
};
