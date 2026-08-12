import { OPERATOR_LOG_LEVELS } from '@n8n/api-types';
import type { OperatorLogLevel, OperatorLogStream } from '@n8n/api-types';
import { Logger, LogTransport } from '@n8n/backend-common';
import { LOG_SCOPES } from '@n8n/config';
import type { LogScope } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { OperatorConsoleConfig } from '../operator-console.config';
import { OPERATOR_CONSOLE_SCOPE } from '../operator-console.constants';
import { LineAssembler } from './line-assembler';
import { redactRecord } from './redactor';
import { LogRingBuffer } from './ring-buffer';
import type { RingBufferEntry } from './ring-buffer';

/**
 * A winston log entry as it reaches a transport with no format of its own:
 * `level` and `message` plus whatever metadata `Logger.log()` passed, spread
 * flat onto the same object.
 */
type WinstonInfo = {
	level: string;
	message: unknown;
	[key: string]: unknown;
};

type WriteCallback = (error?: Error | null) => void;

type StreamWrite = NodeJS.WriteStream['write'];

/**
 * True while a write originates from inside logging or from the capture path
 * itself.
 *
 * This is the single most load-bearing line in the module. winston's Console
 * transport writes to `process.stdout`, so without it (a) every structured log
 * would also be captured as a raw stdout line, and (b) any debug logging on the
 * capture or broadcast path would log a line, which would capture a line, which
 * would log a line. Module-level because there is exactly one `process.stdout`.
 */
let isInternalWrite = false;

function runInternal<T>(fn: () => T): T {
	const wasInternal = isInternalWrite;
	isInternalWrite = true;
	try {
		return fn();
	} finally {
		isInternalWrite = wasInternal;
	}
}

/** Exposed for tests; production code decides on the module-level flag. */
export function isInternalWriteInProgress(): boolean {
	return isInternalWrite;
}

/**
 * Set while a captured batch is being delivered to subscribers.
 *
 * A *different* problem from {@link isInternalWrite}, which stops one winston
 * entry being captured twice. This stops a slower feedback loop: delivering a
 * batch makes `Push` log `Pushed to frontend`, that line is captured, which
 * fills the next batch, which is delivered, which logs… A console left open
 * would tail nothing but its own delivery chatter, forever, at the batch rate.
 *
 * Suppressing capture rather than filtering the `push` scope keeps ordinary
 * push logging visible in the console — only lines emitted *by the act of
 * delivering* are dropped.
 */
let isDelivering = false;

export function runWithCaptureSuppressed<T>(fn: () => T): T {
	const wasDelivering = isDelivering;
	isDelivering = true;
	try {
		return fn();
	} finally {
		isDelivering = wasDelivering;
	}
}

const LOG_SCOPE_VALUES: ReadonlySet<string> = new Set(LOG_SCOPES);

const OPERATOR_LOG_LEVEL_VALUES: ReadonlySet<string> = new Set(OPERATOR_LOG_LEVELS);

/** Promoted to labels or otherwise redundant, so not repeated inside `meta`. */
const RESERVED_INFO_KEYS: ReadonlySet<string> = new Set([
	'level',
	'message',
	'scopes',
	'executionId',
	'workflowId',
	'nodeName',
	'timestamp',
	'splat',
]);

function isLogScope(value: unknown): value is LogScope {
	return typeof value === 'string' && LOG_SCOPE_VALUES.has(value);
}

function isOperatorLogLevel(value: unknown): value is OperatorLogLevel {
	return typeof value === 'string' && OPERATOR_LOG_LEVEL_VALUES.has(value);
}

function toIdentifier(value: unknown): string | undefined {
	if (typeof value === 'string' && value !== '') return value;
	if (typeof value === 'number') return String(value);
	return undefined;
}

/** Forwards every winston entry to a callback; all mapping happens in the service. */
class RingBufferTransport extends LogTransport {
	constructor(private readonly onEntry: (info: WinstonInfo) => void) {
		super();
	}

	log(info: WinstonInfo, next: () => void) {
		this.onEntry(info);
		next();
	}
}

/**
 * Feeds the ring buffer from the two capture sources described in the design:
 * the winston transport (structured, primary) and a `process.stdout` /
 * `process.stderr` tee (raw, catches what never reaches `Logger` — `console.log`
 * from Code nodes, third-party noise, V8 warnings).
 *
 * Nothing here is lease-gated: the buffer fills whether or not a console is
 * open, so the lines from just before a crash are the ones you get.
 */
@Service()
export class LogCaptureService {
	private transport?: LogTransport;

	private originalLoggerWrite?: (info: unknown) => boolean;

	private readonly originalStreamWrites = new Map<OperatorLogStream, StreamWrite>();

	private readonly assemblers = new Map<OperatorLogStream, LineAssembler>();

	private started = false;

	constructor(
		private readonly logger: Logger,
		private readonly config: OperatorConsoleConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly buffer: LogRingBuffer,
	) {}

	start(): void {
		if (this.started) return;
		this.started = true;

		this.attachWinstonTransport();
		if (this.config.captureStdout) {
			this.teeStream('stdout', process.stdout);
			this.teeStream('stderr', process.stderr);
		}
	}

	/** Restores every patched function. Safe to call when never started. */
	stop(): void {
		if (!this.started) return;
		this.started = false;

		const internalLogger = this.logger.getInternalLogger();

		if (this.originalLoggerWrite !== undefined) {
			internalLogger.write = this.originalLoggerWrite;
			this.originalLoggerWrite = undefined;
		}

		if (this.transport !== undefined) {
			internalLogger.remove(this.transport);
			this.transport = undefined;
		}

		for (const [stream, originalWrite] of this.originalStreamWrites) {
			if (stream === 'stdout') process.stdout.write = originalWrite;
			if (stream === 'stderr') process.stderr.write = originalWrite;
		}
		this.originalStreamWrites.clear();

		for (const assembler of this.assemblers.values()) assembler.dispose();
		this.assemblers.clear();
	}

	private attachWinstonTransport(): void {
		const transport = new RingBufferTransport((info) => {
			if (isDelivering) return;
			runInternal(() => this.captureWinstonEntry(info));
		});

		this.logger.attachTransport(transport);
		this.transport = transport;

		// The reentrancy guard has to cover the *whole* winston emit, not just our
		// transport's slice of it: winston fans an entry out to its transports in
		// attachment order, so the Console transport has already written to stdout
		// by the time we run. Wrapping `write` — the single funnel every scoped
		// child logger also goes through — is what makes the tee able to tell
		// winston's own output apart from everything else.
		const internalLogger = this.logger.getInternalLogger();
		const originalWrite = internalLogger.write.bind(internalLogger);
		this.originalLoggerWrite = originalWrite;
		internalLogger.write = (info: unknown) => runInternal(() => originalWrite(info));
	}

	private teeStream(stream: OperatorLogStream, target: NodeJS.WriteStream): void {
		const assembler = new LineAssembler({
			onLine: (line) => runInternal(() => this.captureRawLine(stream, line)),
		});
		this.assemblers.set(stream, assembler);

		const originalWrite: StreamWrite = target.write;
		this.originalStreamWrites.set(stream, originalWrite);

		const forward = target.write.bind(target);

		target.write = (
			chunk: string | Uint8Array,
			encodingOrCallback?: BufferEncoding | WriteCallback,
			onWritten?: WriteCallback,
		): boolean => {
			if (!isInternalWrite) {
				runInternal(() => {
					// Capture must never be able to break the process's own output.
					try {
						assembler.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
					} catch {
						// Intentionally swallowed — a log line is not worth a broken stdout.
					}
				});
			}

			const isCallbackForm = typeof encodingOrCallback === 'function';

			return forward(
				chunk,
				isCallbackForm ? undefined : encodingOrCallback,
				isCallbackForm ? encodingOrCallback : onWritten,
			);
		};
	}

	private captureWinstonEntry(info: WinstonInfo): void {
		const scopes = Array.isArray(info.scopes) ? info.scopes : [];

		// Our own logging must never be captured. Otherwise broadcasting a line
		// logs a line, which broadcasts a line — this fires within minutes.
		if (scopes.includes(OPERATOR_CONSOLE_SCOPE)) return;

		const scope = scopes.find(isLogScope);

		const meta: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(info)) {
			if (!RESERVED_INFO_KEYS.has(key)) meta[key] = value;
		}

		this.admit({
			stream: 'log',
			level: isOperatorLogLevel(info.level) ? info.level : 'info',
			message:
				typeof info.message === 'string' ? info.message : (JSON.stringify(info.message) ?? ''),
			scope,
			executionId: toIdentifier(info.executionId),
			workflowId: toIdentifier(info.workflowId),
			nodeName: toIdentifier(info.nodeName),
			meta: Object.keys(meta).length > 0 ? meta : undefined,
		});
	}

	private captureRawLine(stream: OperatorLogStream, message: string): void {
		this.admit({
			stream,
			// Raw writes carry no level. stderr is the closest thing to a signal
			// there is, so it is surfaced as an error rather than hidden at info.
			level: stream === 'stderr' ? 'error' : 'info',
			message,
		});
	}

	private admit(entry: Omit<RingBufferEntry, 'ts' | 'hostId' | 'role' | 'origin'>): void {
		const record: RingBufferEntry = {
			...entry,
			ts: new Date().toISOString(),
			hostId: this.instanceSettings.hostId,
			role: this.instanceSettings.instanceType,
			origin: 'live',
		};

		this.buffer.add(this.config.redact ? redactRecord(record) : record);
	}
}
