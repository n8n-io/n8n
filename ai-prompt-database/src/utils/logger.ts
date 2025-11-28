/**
 * Utilitário simples de logging
 */

export enum LogLevel {
	DEBUG = 'DEBUG',
	INFO = 'INFO',
	WARN = 'WARN',
	ERROR = 'ERROR',
}

class Logger {
	private level: LogLevel;

	constructor(level: LogLevel = LogLevel.INFO) {
		this.level = level;
	}

	private shouldLog(level: LogLevel): boolean {
		const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
		return levels.indexOf(level) >= levels.indexOf(this.level);
	}

	private formatMessage(level: LogLevel, message: string, data?: unknown): string {
		const timestamp = new Date().toISOString();
		const dataStr = data ? ` ${JSON.stringify(data)}` : '';
		return `[${timestamp}] [${level}] ${message}${dataStr}`;
	}

	debug(message: string, data?: unknown): void {
		if (this.shouldLog(LogLevel.DEBUG)) {
			console.debug(this.formatMessage(LogLevel.DEBUG, message, data));
		}
	}

	info(message: string, data?: unknown): void {
		if (this.shouldLog(LogLevel.INFO)) {
			console.info(this.formatMessage(LogLevel.INFO, message, data));
		}
	}

	warn(message: string, data?: unknown): void {
		if (this.shouldLog(LogLevel.WARN)) {
			console.warn(this.formatMessage(LogLevel.WARN, message, data));
		}
	}

	error(message: string, error?: Error | unknown): void {
		if (this.shouldLog(LogLevel.ERROR)) {
			const errorData = error instanceof Error ? { message: error.message, stack: error.stack } : error;
			console.error(this.formatMessage(LogLevel.ERROR, message, errorData));
		}
	}

	setLevel(level: LogLevel): void {
		this.level = level;
	}
}

export const logger = new Logger(
	process.env.LOG_LEVEL as LogLevel || LogLevel.INFO
);
