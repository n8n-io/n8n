import type { LogScope } from '@n8n/config';
import { GlobalConfig, InstanceSettingsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import callsites from 'callsites';
import type { TransformableInfo } from 'logform';
import { LoggerProxy, LOG_LEVELS } from 'n8n-workflow';
import type {
	Logger as LoggerType,
	LogLocationMetadata,
	LogLevel,
	LogMetadata,
} from 'n8n-workflow';
import path, { basename } from 'node:path';
import pc from 'picocolors';
import winston from 'winston';

import { inDevelopment, inProduction } from '../environment';
import { isObjectLiteral } from '../utils/is-object-literal';

const noOp = () => {};

@Service()
export class Logger implements LoggerType {
	private internalLogger: winston.Logger;

	private readonly level: LogLevel;

	private readonly scopes: Set<LogScope>;

	private get isScopingEnabled() {
		return this.scopes.size > 0;
	}

	/** https://no-color.org/ */
	private readonly noColor = process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== '';

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettingsConfig: InstanceSettingsConfig,
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
		} else {
			this.scopes = new Set();
		}

		if (isRoot) LoggerProxy.init(this);
	}

	private setInternalLogger(internalLogger: winston.Logger) {
		this.internalLogger = internalLogger;
	}

	/** Create a logger that injects the given scopes into its log metadata. */
	scoped(scopes: LogScope | LogScope[]) {
		scopes = Array.isArray(scopes) ? scopes : [scopes];
		const scopedLogger = new Logger(this.globalConfig, this.instanceSettingsConfig, {
			isRoot: false,
		});
		const childLogger = this.internalLogger.child({ scopes });

		scopedLogger.setInternalLogger(childLogger);

		return scopedLogger;
	}

	private serializeError(
		error: unknown,
		seen: Set<unknown> = new Set(),
	): { name: string; message: string; stack?: string; cause: unknown } | string {
		if (!(error instanceof Error)) return String(error);

		// prevent infinite recursion
		let cause: unknown;
		if (error.cause && !seen.has(error.cause)) {
			seen.add(error.cause);
			cause = this.serializeError(error.cause, seen);
		}

		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
			cause,
		};
	}

	private log(level: LogLevel, message: string, metadata: LogMetadata) {
		const location: LogLocationMetadata = {};

		const caller = callsites().at(2); // zeroth and first are this file, second is caller

		if (caller !== undefined) {
			location.file = basename(caller.getFileName() ?? '');
			const fnName = caller.getFunctionName();
			if (fnName) location.function = fnName;
		}

		for (const key of Object.keys(metadata)) {
			const value = metadata[key];
			if (value instanceof Error) {
				metadata[key] = this.serializeError(value);
			}
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

	private jsonConsoleFormat() {
		return winston.format.combine(
			winston.format.timestamp(),
			winston.format.metadata(),
			winston.format.json(),
			this.scopeFilter(),
		);
	}

	private pickConsoleTransportFormat() {
		if (this.globalConfig.logging.format === 'json') {
			return this.jsonConsoleFormat();
		} else if (this.level === 'debug' && inDevelopment) {
			return this.debugDevConsoleFormat();
		} else if (this.level === 'debug' && inProduction) {
			return this.debugProdConsoleFormat();
		} else {
			return winston.format.printf(({ message }: { message: string }) => message);
		}
	}

	private setConsoleTransport() {
		const format = this.pickConsoleTransportFormat();

		this.internalLogger.add(new winston.transports.Console({ format }));
	}

	private scopeFilter() {
		return winston.format((info: TransformableInfo) => {
			if (!this.isScopingEnabled) return info;

			const { scopes } = (info as unknown as { metadata: LogMetadata }).metadata;

			const shouldIncludeScope =
				scopes && scopes?.length > 0 && scopes.some((s) => this.scopes.has(s));

			return shouldIncludeScope ? info : false;
		})();
	}

	private color() {
		return this.noColor ? winston.format.uncolorize() : winston.format.colorize({ all: true });
	}

	private debugDevConsoleFormat() {
		return winston.format.combine(
			winston.format.metadata(),
			winston.format.timestamp({ format: () => this.devTsFormat() }),
			this.color(),
			this.scopeFilter(),
			winston.format.printf(({ level: rawLevel, message, timestamp, metadata: rawMetadata }) => {
				const separator = ' '.repeat(3);
				const logLevelColumnWidth = this.noColor ? 5 : 15; // when colorizing, account for ANSI color codes
				const level = rawLevel.toLowerCase().padEnd(logLevelColumnWidth, ' ');
				const metadata = this.toPrintable(rawMetadata);
				return [timestamp, level, message + ' ' + pc.dim(metadata)].join(separator);
			}),
		);
	}

	private debugProdConsoleFormat() {
		return winston.format.combine(
			winston.format.metadata(),
			winston.format.timestamp(),
			this.color(),
			this.scopeFilter(),
			winston.format.printf(({ level, message, timestamp, metadata: rawMetadata }) => {
				const metadata = this.toPrintable(rawMetadata);
				return `${timestamp} | ${level.padEnd(5)} | ${message}${metadata ? ' ' + metadata : ''}`;
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
		const filename = path.isAbsolute(this.globalConfig.logging.file.location)
			? this.globalConfig.logging.file.location
			: path.join(this.instanceSettingsConfig.n8nFolder, this.globalConfig.logging.file.location);

		const { fileSizeMax, fileCountMax } = this.globalConfig.logging.file;

		this.internalLogger.add(
			new winston.transports.File({
				filename,
				format: this.jsonConsoleFormat(),
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
