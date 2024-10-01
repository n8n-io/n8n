import { GlobalConfig } from '@n8n/config';
import callsites from 'callsites';
import { InstanceSettings } from 'n8n-core';
import { LoggerProxy, LOG_LEVELS } from 'n8n-workflow';
import path, { basename } from 'node:path';
import { Service } from 'typedi';
import winston from 'winston';

import { isObjectLiteral } from '@/utils';

import { noOp } from './constants';
import type { LogLocationMetadata, LogLevel, LogMetadata } from './types';

@Service()
export class Logger {
	private readonly internalLogger: winston.Logger;

	private readonly level: LogLevel;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.level = this.globalConfig.logging.level;

		const isSilent = this.level === 'silent';

		this.internalLogger = winston.createLogger({
			level: this.level,
			silent: isSilent,
		});

		if (!isSilent) {
			this.setLevel();

			const { outputs } = this.globalConfig.logging;

			if (outputs.includes('console')) this.setConsoleTransport();
			if (outputs.includes('file')) this.setFileTransport();
		}

		LoggerProxy.init(this);
	}

	private log(level: LogLevel, message: string, metadata: LogMetadata) {
		const location: LogLocationMetadata = {};

		const caller = callsites().at(2); // zeroth and first are this file, second is caller

		if (caller !== undefined) {
			location.file = basename(caller.getFileName() ?? '');
			const fnName = caller.getFunctionName();
			if (fnName) location.function = fnName;
		}

		this.internalLogger.log(level, message, { ...metadata, ...location });
	}

	private setLevel() {
		const { levels } = this.internalLogger;

		for (const logLevel of LOG_LEVELS) {
			if (levels[logLevel] > levels[this.level]) {
				// winston defines `{ error: 0, warn: 1, info: 2, debug: 5 }`
				// so numerically higher (less severe) log levels become no-op
				// to prevent overhead from `callsites` calls
				Object.defineProperty(this, logLevel, { value: noOp });
			}
		}
	}

	private setConsoleTransport() {
		const format =
			this.level === 'debug'
				? winston.format.combine(
						winston.format.metadata(),
						winston.format.timestamp(),
						winston.format.colorize({ all: true }),
						winston.format.printf(({ level, message, timestamp, metadata }) => {
							const _metadata = this.toPrintable(metadata);
							return `${timestamp} | ${level.padEnd(18)} | ${message}${_metadata}`;
						}),
					)
				: winston.format.printf(({ message }: { message: string }) => message);

		this.internalLogger.add(new winston.transports.Console({ format }));
	}

	private toPrintable(metadata: unknown) {
		if (isObjectLiteral(metadata) && Object.keys(metadata).length > 0) {
			return ' ' + JSON.stringify(metadata);
		}

		return '';
	}

	private setFileTransport() {
		const format = winston.format.combine(
			winston.format.timestamp(),
			winston.format.metadata(),
			winston.format.json(),
		);

		const filename = path.join(
			this.instanceSettings.n8nFolder,
			this.globalConfig.logging.file.location,
		);

		const { fileSizeMax, fileCountMax } = this.globalConfig.logging.file;

		this.internalLogger.add(
			new winston.transports.File({
				filename,
				format,
				maxsize: fileSizeMax * 1_048_576, // config * 1 MiB in bytes
				maxFiles: fileCountMax,
			}),
		);
	}

	// #region Convenience methods

	error(message: string, metadata: LogMetadata = {}) {
		this.log('error', message, metadata);
	}

	warn(message: string, metadata: LogMetadata = {}) {
		this.log('warn', message, metadata);
	}

	info(message: string, metadata: LogMetadata = {}) {
		this.log('info', message, metadata);
	}

	debug(message: string, metadata: LogMetadata = {}) {
		this.log('debug', message, metadata);
	}

	// #endregion

	// #region For testing only

	getInternalLogger() {
		return this.internalLogger;
	}

	// #endregion
}
