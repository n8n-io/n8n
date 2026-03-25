import type {Readable} from 'node:stream';
import type {IgnoresSubprocessOutput} from '../return/ignore.js';
import type {Options} from '../arguments/options.js';

// `subprocess.all`
export type SubprocessAll<OptionsType extends Options> = AllStream<AllIgnored<OptionsType['all'], OptionsType>>;

type AllStream<IsIgnored> = IsIgnored extends true ? undefined : Readable;

type AllIgnored<
	AllOption,
	OptionsType extends Options,
> = AllOption extends true
	? IgnoresSubprocessOutput<'1', OptionsType> extends true
		? IgnoresSubprocessOutput<'2', OptionsType>
		: false
	: true;
