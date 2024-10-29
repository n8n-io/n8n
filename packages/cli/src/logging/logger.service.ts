import type { LogScope } from '@n8n/config';
import { GlobalConfig } from '@n8n/config';
import callsites from 'callsites';
import type { TransformableInfo } from 'logform';
import { InstanceSettings } from 'n8n-core';
import { LoggerProxy, LOG_LEVELS } from 'n8n-workflow';
import path, { basename } from 'node:path';
import pc from 'picocolors';
import { Service } from 'typedi';
import winston from 'winston';

import { inDevelopment, inProduction } from '@/constants';
import { isObjectLiteral } from '@/utils';

import { noOp } from './constants';
import type { LogLocationMetadata, LogLevel, LogMetadata } from './types';

@Service()
export class Logger {
	private internalLogger: winston.Logger;

	private readonly level: LogLevel;

	private readonly scopes: Set<LogScope>;

	private get isScopingEnabled() {
		return this.scopes.size > 0;
	}

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		{ isRoot }: { isRoot?: boolean } = { isRoot: true },
	) {
		this.level = this.globalConfig.logging.level;

		const isSilent = this.level === 'silent';

		this.internalLogger = winston.createLogger({
			level: this.level,
			silent: isSilent,
		});

		if (!isSilent) {
			this.setLevel();

			const { outputs, scopes } = this.globalConfig.logging;

			if (outputs.includes('console')) this.setConsoleTransport();
			if (outputs.includes('file')) this.setFileTransport();

			this.scopes = new Set(scopes);
		}

		if (isRoot) LoggerProxy.init(this);
	}

	private setInternalLogger(internalLogger: winston.Logger) {
		this.internalLogger = internalLogger;
	}

	/** Create a logger that injects the given scopes into its log metadata. */
	scoped(scopes: LogScope | LogScope[]) {
		scopes = Array.isArray(scopes) ? scopes : [scopes];
		const scopedLogger = new Logger(this.globalConfig, this.instanceSettings, { isRoot: false });
		const childLogger = this.internalLogger.child({ scopes });

		scopedLogger.setInternalLogger(childLogger);

		return scopedLogger;
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
				// numerically higher (less severe) log levels become no-op
				// to prevent overhead from `callsites` calls
				Object.defineProperty(this, logLevel, { value: noOp });
			}
		}
	}

	private setConsoleTransport() {
		const format =
			this.level === 'debug' && inDevelopment
				? this.debugDevConsoleFormat()
				: this.level === 'debug' && inProduction
					? this.debugProdConsoleFormat()
					: winston.format.printf(({ message }: { message: string }) => message);

		this.internalLogger.add(new winston.transports.Console({ format }));
	}

	private scopeFilter() {
		return winston.format((info: TransformableInfo & { metadata: LogMetadata }) => {
			if (!this.isScopingEnabled) return info;

			const { scopes } = info.metadata;

			const shouldIncludeScope =
				scopes && scopes?.length > 0 && scopes.some((s) => this.scopes.has(s));

			return shouldIncludeScope ? info : false;
		})();
	}

	private debugDevConsoleFormat() {
		return winston.format.combine(
			winston.format.metadata(),
			winston.format.timestamp({ format: () => this.devTsFormat() }),
			winston.format.colorize({ all: true }),
			this.scopeFilter(),
			winston.format.printf(({ level: _level, message, timestamp, metadata: _metadata }) => {
				const SEPARATOR = ' '.repeat(3);
				const LOG_LEVEL_COLUMN_WIDTH = 15; // 5 columns + ANSI color codes
				const level = _level.toLowerCase().padEnd(LOG_LEVEL_COLUMN_WIDTH, ' ');
				const metadata = this.toPrintable(_metadata);
				return [timestamp, level, message + ' ' + pc.dim(metadata)].join(SEPARATOR);
			}),
		);
	}

	private debugProdConsoleFormat() {
		return winston.format.combine(
			winston.format.metadata(),
			winston.format.timestamp(),
			this.scopeFilter(),
			winston.format.printf(({ level, message, timestamp, metadata }) => {
				const _metadata = this.toPrintable(metadata);
				return `${timestamp} | ${level.padEnd(5)} | ${message}${_metadata ? ' ' + _metadata : ''}`;
			}),
		);
	}

	private devTsFormat() {
		const now = new Date();
		const pad = (num: number, digits: number = 2) => num.toString().padStart(digits, '0');
		const hours = pad(now.getHours());
		const minutes = pad(now.getMinutes());
		const seconds = pad(now.getSeconds());
		const milliseconds = pad(now.getMilliseconds(), 3);
		return `${hours}:${minutes}:${seconds}.${milliseconds}`;
	}

	private toPrintable(metadata: unknown) {
		if (isObjectLiteral(metadata) && Object.keys(metadata).length > 0) {
			return inProduction
				? JSON.stringify(metadata)
				: JSON.stringify(metadata)
						.replace(/{"/g, '{ "')
						.replace(/,"/g, ', "')
						.replace(/:/g, ': ')
						.replace(/}/g, ' }'); // spacing for readability
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
