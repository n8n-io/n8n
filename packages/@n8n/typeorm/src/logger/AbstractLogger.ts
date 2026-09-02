import { Logger, LogLevel, LogMessage, LogMessageType, PrepareLogMessagesOptions } from './Logger';
import { QueryRunner } from '../query-runner/QueryRunner';
import { LoggerOptions } from './LoggerOptions';

export abstract class AbstractLogger implements Logger {
	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(protected options?: LoggerOptions) {}

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Logs query and parameters used in it.
	 */
	logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
		if (!this.isLogEnabledFor('query')) {
			return;
		}

		this.writeLog(
			'query',
			{
				type: 'query',
				prefix: 'query',
				message: query,
				format: 'sql',
				parameters,
			},
			queryRunner,
		);
	}

	/**
	 * Logs query that is failed.
	 */
	logQueryError(error: string, query: string, parameters?: any[], queryRunner?: QueryRunner) {
		if (!this.isLogEnabledFor('query-error')) {
			return;
		}

		this.writeLog(
			'warn',
			[
				{
					type: 'query-error',
					prefix: 'query failed',
					message: query,
					format: 'sql',
					parameters,
				},
				{
					type: 'query-error',
					prefix: 'error',
					message: error,
				},
			],
			queryRunner,
		);
	}

	/**
	 * Logs query that is slow.
	 */
	logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner) {
		if (!this.isLogEnabledFor('query-slow')) {
			return;
		}

		this.writeLog(
			'warn',
			[
				{
					type: 'query-slow',
					prefix: 'query is slow',
					message: query,
					format: 'sql',
					parameters,
					additionalInfo: {
						time,
					},
				},
				{
					type: 'query-slow',
					prefix: 'execution time',
					message: time,
				},
			],
			queryRunner,
		);
	}

	/**
	 * Logs events from the schema build process.
	 */
	logSchemaBuild(message: string, queryRunner?: QueryRunner) {
		if (!this.isLogEnabledFor('schema-build')) {
			return;
		}

		this.writeLog(
			'schema',
			{
				type: 'schema-build',
				message,
			},
			queryRunner,
		);
	}

	/**
	 * Logs events from the migration run process.
	 */
	logMigration(message: string, queryRunner?: QueryRunner) {
		if (!this.isLogEnabledFor('migration')) {
			return;
		}

		this.writeLog(
			'log',
			{
				type: 'migration',
				message,
			},
			queryRunner,
		);
	}

	/**
	 * Perform logging using given logger, or by default to the console.
	 * Log has its own level and message.
	 */
	log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner) {
		switch (level) {
			case 'log':
				if (!this.isLogEnabledFor('log')) {
					return;
				}

				this.writeLog(
					'log',
					{
						type: 'log',
						message,
					},
					queryRunner,
				);
				break;

			case 'info':
				if (!this.isLogEnabledFor('info')) {
					return;
				}

				this.writeLog(
					'info',
					{
						type: 'info',
						prefix: 'info',
						message,
					},
					queryRunner,
				);
				break;

			case 'warn':
				if (!this.isLogEnabledFor('warn')) {
					return;
				}

				this.writeLog(
					'warn',
					{
						type: 'warn',
						message,
					},
					queryRunner,
				);
				break;
		}
	}

	// -------------------------------------------------------------------------
	// Protected Methods
	// -------------------------------------------------------------------------

	/**
	 * Check is logging for level or message type is enabled.
	 */
	protected isLogEnabledFor(type?: LogLevel | LogMessageType) {
		switch (type) {
			case 'query':
				return (
					this.options === 'all' ||
					this.options === true ||
					(Array.isArray(this.options) && this.options.indexOf('query') !== -1)
				);

			case 'error':
			case 'query-error':
				return (
					this.options === 'all' ||
					this.options === true ||
					(Array.isArray(this.options) && this.options.indexOf('error') !== -1)
				);

			case 'query-slow':
				return true;

			case 'schema':
			case 'schema-build':
				return (
					this.options === 'all' ||
					(Array.isArray(this.options) && this.options.indexOf('schema') !== -1)
				);

			case 'migration':
				return true;

			case 'log':
				return (
					this.options === 'all' ||
					(Array.isArray(this.options) && this.options.indexOf('log') !== -1)
				);

			case 'info':
				return (
					this.options === 'all' ||
					(Array.isArray(this.options) && this.options.indexOf('info') !== -1)
				);

			case 'warn':
				return (
					this.options === 'all' ||
					(Array.isArray(this.options) && this.options.indexOf('warn') !== -1)
				);

			default:
				return false;
		}
	}

	/**
	 * Write log to specific output.
	 */
	protected abstract writeLog(
		level: LogLevel,
		message: LogMessage | string | number | (LogMessage | string | number)[],
		queryRunner?: QueryRunner,
	): void;

	/**
	 * Prepare and format log messages
	 */
	protected prepareLogMessages(
		logMessage: LogMessage | string | number | (LogMessage | string | number)[],
		options?: Partial<PrepareLogMessagesOptions>,
	): LogMessage[] {
		options = {
			addColonToPrefix: true,
			appendParameterAsComment: false,
			...options,
		};
		const messages = Array.isArray(logMessage) ? logMessage : [logMessage];

		for (let message of messages) {
			if (typeof message !== 'object') {
				message = {
					message,
				};
			}

			if (message.format === 'sql') {
				let sql = String(message.message);

				if (options.appendParameterAsComment && message.parameters && message.parameters.length) {
					sql += ` -- PARAMETERS: ${this.stringifyParams(message.parameters)}`;
				}

				message.message = sql;
			}

			if (options.addColonToPrefix && message.prefix) {
				message.prefix += ':';
			}
		}

		return messages as LogMessage[];
	}

	/**
	 * Converts parameters to a string.
	 * Sometimes parameters can have circular objects and therefor we are handle this case too.
	 */
	protected stringifyParams(parameters: any[]) {
		try {
			return JSON.stringify(parameters);
		} catch (error) {
			// most probably circular objects in parameters
			return parameters;
		}
	}
}
