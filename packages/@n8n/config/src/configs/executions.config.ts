import { Config, Env, Nested } from '../decorators';

@Config
export class ExecutionsConfig {
	// TODO: remove this and all usage of `executions.process` when we're sure that nobody has this in their config file anymore.
	/** @deprecated Deprecated key, that will be removed in the future. Please remove it from your configuration and environment variables to prevent issues in the future. */
	@Env('EXECUTIONS_PROCESS')
	process: string = '';

	/** If it should run executions directly or via queue. */
	@Env('EXECUTIONS_MODE')
	mode: 'regular' | 'queue' = 'regular';
}
