/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { inspect } from 'util';
import winston from 'winston';

import { IDataObject, ILogger, LogTypes } from 'n8n-workflow';

import callsites from 'callsites';
import { basename } from 'path';
import config from '../config';

export class Logger implements ILogger {
	private logger: winston.Logger;

	constructor() {
		const level = config.getEnv('logs.level');

		const output = config
			.getEnv('logs.output')
			.split(',')
			.map((output) => output.trim());

		this.logger = winston.createLogger({
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			level,
			silent: level === 'silent',
		});

		if (output.includes('console')) {
			let format: winston.Logform.Format;
			if (['debug', 'verbose'].includes(level)) {
				format = winston.format.combine(
					winston.format.metadata(),
					winston.format.timestamp(),
					winston.format.colorize({ all: true }),
					// eslint-disable-next-line @typescript-eslint/no-shadow
					winston.format.printf(({ level, message, timestamp, metadata }) => {
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						return `${timestamp} | ${level.padEnd(18)} | ${message}${
							// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
							Object.keys(metadata).length ? ` ${JSON.stringify(inspect(metadata))}` : ''
						}`;
					}),
				);
			} else {
				format = winston.format.printf(({ message }: { message: string }) => message);
			}

			this.logger.add(
				new winston.transports.Console({
					format,
				}),
			);
		}

		if (output.includes('file')) {
			const fileLogFormat = winston.format.combine(
				winston.format.timestamp(),
				winston.format.metadata(),
				winston.format.json(),
			);
			this.logger.add(
				new winston.transports.File({
					filename: config.getEnv('logs.file.location'),
					format: fileLogFormat,
					maxsize: config.getEnv('logs.file.fileSizeMax') * 1048576, // config * 1mb
					maxFiles: config.getEnv('logs.file.fileCountMax'),
				}),
			);
		}
	}

	log(type: LogTypes, message: string, meta: object = {}): void {
		const callsite = callsites();
		// We are using the third array element as the structure is as follows:
		// [0]: this file
		// [1]: Should be LoggerProxy
		// [2]: Should point to the caller.
		// Note: getting line number is useless because at this point
		// We are in runtime, so it means we are looking at compiled js files
		const logDetails = {} as IDataObject;
		if (callsite[2] !== undefined) {
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			logDetails.file = basename(callsite[2].getFileName() || '');
			const functionName = callsite[2].getFunctionName();
			if (functionName) {
				logDetails.function = functionName;
			}
		}
		this.logger.log(type, message, { ...meta, ...logDetails });
	}

	// Convenience methods below

	debug(message: string, meta: object = {}): void {
		this.log('debug', message, meta);
	}

	info(message: string, meta: object = {}): void {
		this.log('info', message, meta);
	}

	error(message: string, meta: object = {}): void {
		this.log('error', message, meta);
	}

	verbose(message: string, meta: object = {}): void {
		this.log('verbose', message, meta);
	}

	warn(message: string, meta: object = {}): void {
		this.log('warn', message, meta);
	}
}

let activeLoggerInstance: Logger | undefined;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getLogger() {
	if (activeLoggerInstance === undefined) {
		activeLoggerInstance = new Logger();
	}

	return activeLoggerInstance;
}
