import { Config, Env } from '../decorators';

@Config
export class PartialExecutionsConfig {
	/** Partial execution logic version to use by default. */
	@Env('N8N_PARTIAL_EXECUTION_VERSION_DEFAULT')
	version: 1 | 2 = 1;

	/** Set this to true to enforce using the default version. Users cannot use the other version then by setting a local storage key. */
	@Env('N8N_PARTIAL_EXECUTION_ENFORCE_VERSION')
	enforce: boolean = false;
}
