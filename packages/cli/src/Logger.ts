import { Service } from 'typedi';
import winston from 'winston';
import callsites from 'callsites';
import { inspect } from 'util';
import { basename } from 'path';

import { LoggerProxy, type IDataObject, LOG_LEVELS } from 'n8n-workflow';

import config from '@/config';

const noOp = () => {};

@Service()
export class Logger {
	private logger: winston.Logger;

	constructor() {
		const level = config.getEnv('logs.level');

		this.logger = winston.createLogger({
			level,
			silent: level === 'silent',
		});

		// Change all methods with higher log-level to no-op
		for (const levelName of LOG_LEVELS) {
			if (this.logger.levels[levelName] > this.logger.levels[level]) {
				Object.defineProperty(this, levelName, { value: noOp });
			}
		}

		const output = config
			.getEnv('logs.output')
			.split(',')
			.map((line) => line.trim());

		if (output.includes('console')) {
			let format: winston.Logform.Format;
			if (['debug', 'verbose'].includes(level)) {
				format = winston.format.combine(
					winston.format.metadata(),
					winston.format.timestamp(),
					winston.format.colorize({ all: true }),

					winston.format.printf(({ level: logLevel, message, timestamp, metadata }) => {
						return `${timestamp} | ${logLevel.padEnd(18)} | ${message}${
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

		LoggerProxy.init(this);
	}

	private log(level: (typeof LOG_LEVELS)[number], message: string, meta: object = {}): void {
		const callsite = callsites();
		// We are using the third array element as the structure is as follows:
		// [0]: this file
		// [1]: Should be Logger
		// [2]: Should point to the caller.
		// Note: getting line number is useless because at this point
		// We are in runtime, so it means we are looking at compiled js files
		const logDetails = {} as IDataObject;
		if (callsite[2] !== undefined) {
			logDetails.file = basename(callsite[2].getFileName() || '');
			const functionName = callsite[2].getFunctionName();
			if (functionName) {
				logDetails.function = functionName;
			}
		}
		this.logger.log(level, message, { ...meta, ...logDetails });
	}

	// Convenience methods below

	error(message: string, meta: object = {}): void {
		this.log('error', message, meta);
	}

	warn(message: string, meta: object = {}): void {
		this.log('warn', message, meta);
	}

	info(message: string, meta: object = {}): void {
		this.log('info', message, meta);
	}

	debug(message: string, meta: object = {}): void {
		this.log('debug', message, meta);
	}

	verbose(message: string, meta: object = {}): void {
		this.log('verbose', message, meta);
	}
}
