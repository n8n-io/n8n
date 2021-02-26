import * as winston from 'winston';
import config = require('../config');

import {
	ILogger,
	ILogTypes,
} from 'n8n-workflow';

export class Logger implements ILogger {
	private logger: winston.Logger;
	
	constructor() {

		const logFormat = winston.format.printf(({ message }) => {
			return message;
		}) as winston.Logform.Format;
		
		this.logger = winston.createLogger({
			level: config.get('logs.level'),
			format: logFormat,
			transports: [
				new winston.transports.Console(),
			],
		});
		
		if (config.get('logs.output') === 'file') {
			const fileLogFormat = winston.format.combine(
				winston.format.timestamp(),
				winston.format.json()
			);
			this.logger.add(
				new winston.transports.File({
					filename: config.get('logs.file.location'),
					format: fileLogFormat,
				})
			);
		}
			
	}
	
	log(type: ILogTypes, message: string, meta: object = {}) {
		this.logger.log(type, message, meta);
	}
	
	// Convenience methods below
	
	debug(message: string, meta: object = {}) {
		this.logger.log('debug', message, meta);
	}
	
	info(message: string, meta: object = {}) {
		this.logger.log('info', message, meta);
	}
	
	error(message: string, meta: object = {}) {
		this.logger.log('error', message, meta);
	}
	
	verbose(message: string, meta: object = {}) {
		this.logger.log('verbose', message, meta);
	}
	
	warn(message: string, meta: object = {}) {
		this.logger.log('warn', message, meta);
	}

}

let activeLoggerInstance: Logger | undefined;

export function getInstance() {
	if (activeLoggerInstance === undefined) {
		activeLoggerInstance = new Logger();
	}
	
	return activeLoggerInstance;
}