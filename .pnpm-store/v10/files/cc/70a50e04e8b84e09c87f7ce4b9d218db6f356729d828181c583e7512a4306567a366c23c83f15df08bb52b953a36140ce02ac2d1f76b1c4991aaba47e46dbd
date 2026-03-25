import type {IsObjectFd} from '../transform/object-mode.js';
import type {CommonOptions} from '../arguments/options.js';
import type {FdSpecificOption} from '../arguments/specific.js';
import type {IgnoresResultOutput} from './ignore.js';
import type {ResultStdio} from './result-stdout.js';

// `result.all`
export type ResultAll<OptionsType extends CommonOptions> =
	ResultAllProperty<OptionsType['all'], OptionsType>;

type ResultAllProperty<
	AllOption extends CommonOptions['all'],
	OptionsType extends CommonOptions,
> = AllOption extends true
	? ResultStdio<
	AllMainFd<OptionsType>,
	AllObjectFd<OptionsType>,
	AllLinesFd<OptionsType>,
	OptionsType
	>
	: undefined;

type AllMainFd<OptionsType extends CommonOptions> =
	IgnoresResultOutput<'1', OptionsType> extends true ? '2' : '1';

type AllObjectFd<OptionsType extends CommonOptions> =
	IsObjectFd<'1', OptionsType> extends true ? '1' : '2';

type AllLinesFd<OptionsType extends CommonOptions> =
	FdSpecificOption<OptionsType['lines'], '1'> extends true ? '1' : '2';
