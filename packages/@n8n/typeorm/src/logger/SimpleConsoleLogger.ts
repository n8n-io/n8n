import { AbstractLogger } from './AbstractLogger';
import { LogLevel, LogMessage } from './Logger';
import { QueryRunner } from '../query-runner/QueryRunner';

/**
 * Performs logging of the events in TypeORM.
 * This version of logger uses console to log events and does not use syntax highlighting.
 */
export class SimpleConsoleLogger extends AbstractLogger {
	/**
	 * Write log to specific output.
	 */
	protected writeLog(
		level: LogLevel,
		logMessage: LogMessage | LogMessage[],
		queryRunner?: QueryRunner,
	) {
		const messages = this.prepareLogMessages(logMessage);

		for (let message of messages) {
			switch (message.type ?? level) {
				case 'log':
				case 'schema-build':
				case 'migration':
					console.log(message.message);
					break;

				case 'info':
				case 'query':
					if (message.prefix) {
						console.info(message.prefix, message.message);
					} else {
						console.info(message.message);
					}
					break;

				case 'warn':
				case 'query-slow':
					if (message.prefix) {
						console.warn(message.prefix, message.message);
					} else {
						console.warn(message.message);
					}
					break;

				case 'error':
				case 'query-error':
					if (message.prefix) {
						console.error(message.prefix, message.message);
					} else {
						console.error(message.message);
					}
					break;
			}
		}
	}
}
