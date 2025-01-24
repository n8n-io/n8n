import { Config, Env } from '../decorators';

@Config
export class PartialExecutionsConfig {
	/** Set this to 2 to enable the new partial execution logic by default. */
	@Env('PARTIAL_EXECUTION_VERSION_DEFAULT')
	version: 1 | 2 = 1;

	/** Set this to true to enforce using the default version. Users cannot use the other version then by setting a local storage key. */
	@Env('PARTIAL_EXECUTION_ENFORCE_VERSION')
	enforce: boolean = false;
}
