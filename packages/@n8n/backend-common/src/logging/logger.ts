import type { LogScope } from '@n8n/config';
import { GlobalConfig, InstanceSettingsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import callsites from 'callsites';
import type { TransformableInfo } from 'logform';
import { LoggerProxy, LOG_LEVELS, UnexpectedError } from 'n8n-workflow';
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
import { getExecutionContext } from './execution-context';
import { isObjectLiteral } from '../utils/is-object-literal';

const noOp = () => {};

/** A winston transport instance, e.g. one produced by subclassing {@link LogTransport}. */
export type LogTransport = winston.transport;

export type LogTransportOptions = winston.transport.TransportStreamOptions;

type LogTransportCtor = new (options?: LogTransportOptions) => LogTransport;

/**
 * winston exposes its transport base class at runtime as `winston.Transport`,
 * but its bundled type declarations only surface it under the lowercase
 * `winston.transport` alias. Reading it through a structural view of the
 * namespace bridges the two without an unchecked cast.
 */
const winstonExports: Partial<typeof winston> & { Transport?: LogTransportCtor } = winston;

function resolveTransportBase(): LogTransportCtor {
	const base = winstonExports.Transport;
	if (base === undefined) {
		throw new UnexpectedError('winston no longer exports its transport base class');
	}
	return base;
}

/**
 * Base class for custom log transports. Re-exported here so other packages can
 * subclass it and hand the result to {@link Logger.attachTransport} without
 * taking a direct dependency on winston — logging plumbing stays an
 * implementation detail of this package.
 */
export const LogTransport: LogTransportCtor = resolveTransportBase();

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

	// Allow opt-in coloring in production by setting NO_COLOR to 'false' or '0'
	private readonly noColorDefaultTrue =
		process.env.NO_COLOR !== 'false' && process.env.NO_COLOR !== '0';

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

		// Stamped here rather than at any downstream consumer so that the execution
		// cross-link also lands in `n8n.log`, which the file transport writes
		// straight from this metadata. Explicit metadata wins over the ambient
		// context.
		const executionContext = getExecutionContext();

		this.internalLogger.log(level, message, { ...executionContext, ...metadata, ...location });
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

	private color(defaultToTrue: boolean = false) {
		if (defaultToTrue) {
			return this.noColorDefaultTrue
				? winston.format.uncolorize()
				: winston.format.colorize({ all: true });
		}
		// For development: respect NO_COLOR, otherwise colorize
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
			this.color(true), // Default to no colors in production
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

	/**
	 * Attaches the rotating file transport if it is not already attached, and
	 * reports whether file output is now available.
	 *
	 * For features that read `n8n.log` back (the operator console's history tier)
	 * rather than only write to it, so the operator sets one variable instead of
	 * also having to remember `N8N_LOG_OUTPUT=file`. A no-op when logging is
	 * silent — there would be nothing to write.
	 */
	ensureFileTransport(): boolean {
		if (this.level === 'silent') return false;

		const alreadyAttached = this.internalLogger.transports.some(
			(transport) => transport instanceof winston.transports.File,
		);

		if (!alreadyAttached) this.setFileTransport();

		return true;
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

	/**
	 * Attach a winston transport to the underlying winston logger, so a consumer
	 * can observe log entries as structured records instead of re-parsing
	 * formatted text.
	 *
	 * Scoped loggers are winston children of the root logger and write through
	 * the same transports, so one attachment on the root covers all of them.
	 *
	 * Two caveats worth knowing:
	 * - Entries below the configured log level never reach winston at all
	 *   (`setLevel` no-ops those methods), so no transport can see them.
	 * - Scope filtering is applied per transport via its format. A transport
	 *   attached without a format therefore sees every scope.
	 */
	attachTransport(transport: LogTransport) {
		this.internalLogger.add(transport);
	}

	// #region For testing only

	getInternalLogger() {
		return this.internalLogger;
	}

	// #endregion
}
