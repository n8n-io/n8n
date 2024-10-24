import { Config, Env, Nested } from '../decorators';
import { StringArray } from '../utils';

/** Scopes (areas of functionality) to filter logs by. */
export const LOG_SCOPES = [
	'concurrency',
	'external-secrets',
	'license',
	'multi-main-setup',
	'pubsub',
	'redis',
	'scaling',
	'waiting-executions',
] as const;

export type LogScope = (typeof LOG_SCOPES)[number];

@Config
class FileLoggingConfig {
	/**
	 * Max number of log files to keep, or max number of days to keep logs for.
	 * Once the limit is reached, the oldest log files will be rotated out.
	 * If using days, append a `d` suffix. Only for `file` log output.
	 *
	 * @example `N8N_LOG_FILE_COUNT_MAX=7` will keep at most 7 files.
	 * @example `N8N_LOG_FILE_COUNT_MAX=7d` will keep at most 7 days worth of files.
	 */
	@Env('N8N_LOG_FILE_COUNT_MAX')
	fileCountMax: number = 100;

	/** Max size (in MiB) for each log file. Only for `file` log output. */
	@Env('N8N_LOG_FILE_SIZE_MAX')
	fileSizeMax: number = 16;

	/** Location of the log files inside `~/.n8n`. Only for `file` log output. */
	@Env('N8N_LOG_FILE_LOCATION')
	location: string = 'logs/n8n.log';
}

@Config
export class LoggingConfig {
	/**
	 * Minimum level of logs to output. Logs with this or higher level will be output;
	 * logs with lower levels will not. Exception: `silent` disables all logging.
	 *
	 * @example `N8N_LOG_LEVEL=info` will output `error`, `warn` and `info` logs, but not `debug`.
	 */
	@Env('N8N_LOG_LEVEL')
	level: 'error' | 'warn' | 'info' | 'debug' | 'silent' = 'info';

	/**
	 * Where to output logs to. Options are: `console` or `file` or both in a comma separated list.
	 *
	 * @example `N8N_LOG_OUTPUT=console,file` will output to both console and file.
	 */
	@Env('N8N_LOG_OUTPUT')
	outputs: StringArray<'console' | 'file'> = ['console'];

	@Nested
	file: FileLoggingConfig;

	/**
	 * Scopes to filter logs by. Nothing is filtered by default.
	 *
	 * Supported log scopes:
	 *
	 * - `concurrency`
	 * - `external-secrets`
	 * - `license`
	 * - `multi-main-setup`
	 * - `pubsub`
	 * - `redis`
	 * - `scaling`
	 * - `waiting-executions`
	 *
	 * @example
	 * `N8N_LOG_SCOPES=license`
	 * `N8N_LOG_SCOPES=license,waiting-executions`
	 */
	@Env('N8N_LOG_SCOPES')
	scopes: StringArray<LogScope> = [];
}
