import { FileLoggerOptions, LoggerOptions } from './LoggerOptions';
import { LogLevel, LogMessage } from './Logger';
import appRootPath from 'app-root-path';
import { QueryRunner } from '../query-runner/QueryRunner';
import { PlatformTools } from '../platform/PlatformTools';
import { AbstractLogger } from './AbstractLogger';

/**
 * Performs logging of the events in TypeORM.
 * This version of logger logs everything into ormlogs.log file.
 */
export class FileLogger extends AbstractLogger {
	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(
		options?: LoggerOptions,
		private fileLoggerOptions?: FileLoggerOptions,
	) {
		super(options);
	}

	// -------------------------------------------------------------------------
	// Protected Methods
	// -------------------------------------------------------------------------

	/**
	 * Write log to specific output.
	 */
	protected writeLog(
		level: LogLevel,
		logMessage: LogMessage | LogMessage[],
		queryRunner?: QueryRunner,
	) {
		const messages = this.prepareLogMessages(logMessage, {
			addColonToPrefix: false,
		});

		const strings: string[] = [];

		for (let message of messages) {
			switch (message.type ?? level) {
				case 'log':
					strings.push(`[LOG]: ${message.message}`);
					break;

				case 'schema-build':
				case 'migration':
					strings.push(String(message.message));
					break;

				case 'info':
					strings.push(`[INFO]: ${message.message}`);
					break;

				case 'query':
					strings.push(`[QUERY]: ${message.message}`);
					break;

				case 'warn':
					strings.push(`[WARN]: ${message.message}`);
					break;

				case 'query-slow':
					if (message.prefix === 'execution time') {
						continue;
					}

					this.write(`[SLOW QUERY: ${message.additionalInfo?.time} ms]: ${message.message}`);
					break;

				case 'error':
				case 'query-error':
					if (message.prefix === 'query failed') {
						strings.push(`[FAILED QUERY]: ${message.message}`);
					} else if (message.type === 'query-error') {
						strings.push(`[QUERY ERROR]: ${message.message}`);
					} else {
						strings.push(`[ERROR]: ${message.message}`);
					}
					break;
			}
		}

		this.write(strings);
	}

	/**
	 * Writes given strings into the log file.
	 */
	protected write(strings: string | string[]) {
		strings = Array.isArray(strings) ? strings : [strings];
		const basePath = appRootPath.path + '/';
		let logPath = 'ormlogs.log';
		if (this.fileLoggerOptions && this.fileLoggerOptions.logPath) {
			logPath = PlatformTools.pathNormalize(this.fileLoggerOptions.logPath);
		}
		strings = (strings as string[]).map((str) => '[' + new Date().toISOString() + ']' + str);
		PlatformTools.appendFileSync(basePath + logPath, strings.join('\r\n') + '\r\n'); // todo: use async or implement promises?
	}
}
