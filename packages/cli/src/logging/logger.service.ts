import { GlobalConfig } from '@n8n/config';
import callsites from 'callsites';
import debug from 'debug';
import { InstanceSettings } from 'n8n-core';
import { LoggerProxy, LOG_LEVELS, ApplicationError } from 'n8n-workflow';
import { strict } from 'node:assert';
import path, { basename } from 'node:path';
import { Service } from 'typedi';
import winston from 'winston';

import { isObjectLiteral } from '@/utils';

import { DEBUG_LOG_SCOPES, NAMED_DEBUG_LOG_SCOPES, noOp } from './constants';
import type {
	LogLocationMetadata,
	LogLevel,
	LogMetadata,
	NamedDebugLogScope,
	DebugLogScope,
} from './types';

@Service()
export class Logger {
	private readonly internalLogger: winston.Logger;

	private readonly level: LogLevel;

	private readonly scopedDebugLoggers: Map<DebugLogScope, debug.Debugger> = new Map();

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

		this.setupScopedLoggers();

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

	private setLevel({ override }: { override?: LogLevel } = {}) {
		const { levels } = this.internalLogger;

		for (const logLevel of LOG_LEVELS) {
			if (levels[logLevel] > levels[override ?? this.level]) {
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

	// #region Scoped debug logging

	private setupScopedLoggers() {
		const { debugScopes } = this.globalConfig.logging;

		if (debugScopes.length === 0) return;

		if (debugScopes.includes('*') && debugScopes.length !== 1) {
			throw new ApplicationError('When using `DEBUG=*`, do not specify any other debug scopes');
		}

		if (
			debugScopes.includes('n8n:*') &&
			debugScopes.filter((s) => s !== 'n8n:*').some((s) => s.startsWith('n8n:'))
		) {
			throw new ApplicationError(
				'When using `DEBUG=n8n:*`, do not specify any other `n8n:` debug scopes',
			);
		}

		this.setLevel({ override: 'info' }); // mute regular (non-scoped) debug logs

		if (debugScopes.includes('*') || debugScopes.includes('n8n:*')) {
			debugScopes.push(...NAMED_DEBUG_LOG_SCOPES);
		}

		debug.enable(debugScopes.join(','));

		for (const scope of DEBUG_LOG_SCOPES) {
			this.scopedDebugLoggers.set(scope, debug(scope));
		}
	}

	debugFactory(scope: NamedDebugLogScope) {
		if (!debug.enabled(scope)) return noOp;

		const scopedDebugLogger = this.scopedDebugLoggers.get(scope);

		strict(scopedDebugLogger !== undefined, `Missing debug logger for enabled scope ${scope}`);

		return scopedDebugLogger;
	}

	// #endregion

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
