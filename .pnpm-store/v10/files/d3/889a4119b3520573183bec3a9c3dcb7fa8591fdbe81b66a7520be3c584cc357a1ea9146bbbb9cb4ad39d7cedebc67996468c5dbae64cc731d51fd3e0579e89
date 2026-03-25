import type {CommonOptions, Options, SyncOptions} from '../arguments/options.js';
import {CommonResult} from './result.js';

declare abstract class CommonError<
	IsSync extends boolean,
	OptionsType extends CommonOptions,
> extends CommonResult<IsSync, OptionsType> {
	message: CommonErrorProperty<IsSync, OptionsType, 'message'>;
	shortMessage: CommonErrorProperty<IsSync, OptionsType, 'shortMessage'>;
	originalMessage: CommonErrorProperty<IsSync, OptionsType, 'originalMessage'>;
	readonly name: CommonErrorProperty<IsSync, OptionsType, 'name'>;
	stack: CommonErrorProperty<IsSync, OptionsType, 'stack'>;
}

type CommonErrorProperty<
	IsSync extends boolean,
	OptionsType extends CommonOptions,
	PropertyName extends keyof CommonResult<IsSync, OptionsType>,
> = NonNullable<CommonResult<IsSync, OptionsType>[PropertyName]>;

// `result.*` defined only on failure, i.e. on `error.*`
export type ErrorProperties =
  | 'name'
  | 'message'
  | 'stack'
  | 'cause'
  | 'shortMessage'
  | 'originalMessage'
  | 'code';

/**
Result of a subprocess failed execution.

This error is thrown as an exception. If the `reject` option is false, it is returned instead.

This has the same shape as successful results, with a few additional properties.
*/
export class ExecaError<OptionsType extends Options = Options> extends CommonError<false, OptionsType> {
	readonly name: 'ExecaError';
}

/**
Result of a subprocess failed execution.

This error is thrown as an exception. If the `reject` option is false, it is returned instead.

This has the same shape as successful results, with a few additional properties.
*/
export class ExecaSyncError<OptionsType extends SyncOptions = SyncOptions> extends CommonError<true, OptionsType> {
	readonly name: 'ExecaSyncError';
}
