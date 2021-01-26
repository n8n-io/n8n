import * as winston from "winston";
import config = require("../config");

import {
	ILogger,
	ILogTypes,
} from 'n8n-workflow';

export default class Logger implements ILogger {
	private logger: winston.Logger;
	
	constructor() {
		
		this.logger = winston.createLogger({
			level: config.get('logs.level'),
			format: winston.format.json(),
			transports: [
				new winston.transports.Console(),
			],
		});
		
		if (config.get('logs.output') === 'file') {
			console.log('Saving logs to file ', config.get('logs.file.location'));
			this.logger.add(
				new winston.transports.File({
					filename: config.get('logs.file.location'),
				}),
			);
		}
			
		this.logger.info('test message from logger');
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
	
	notice(message: string, meta: object = {}) {
		this.logger.log('notice', message, meta);
	}
	
}

let activeLoggerInstance: Logger | undefined;

export function getInstance() {
	if (activeLoggerInstance === undefined) {
		activeLoggerInstance = new Logger();
	}
	
	return activeLoggerInstance;
}