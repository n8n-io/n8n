import type { OperatorLogRecord } from '@n8n/api-types';
import { Logger, LogTransport } from '@n8n/backend-common';
import type { GlobalConfig, InstanceSettingsConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { OperatorConsoleConfig } from '../../operator-console.config';
import { LogCaptureService } from '../log-capture.service';
import { isInternalWriteInProgress } from '../log-capture.service';
import { LogRingBuffer } from '../ring-buffer';

/**
 * Stands in for winston's own Console transport, which writes formatted text to
 * `process.stdout` during the very same emit that feeds our capture transport.
 * Vitest replaces `console._stdout` with its own stream, so the real Console
 * transport would not exercise the tee at all.
 */
class StdoutEchoTransport extends LogTransport {
	log(info: { message?: unknown }, next: () => void) {
		process.stdout.write(`${String(info.message)}\n`);
		next();
	}
}

const buildLogger = () =>
	new Logger(
		mock<GlobalConfig>({
			logging: { level: 'debug', outputs: [], scopes: [], format: 'text' },
		}),
		mock<InstanceSettingsConfig>(),
		{ isRoot: false },
	);

describe('LogCaptureService', () => {
	let stdoutSpy: MockInstance;
	let stderrSpy: MockInstance;
	let logger: Logger;
	let buffer: LogRingBuffer;
	let service: LogCaptureService;

	const config = mock<OperatorConsoleConfig>({
		captureStdout: true,
		redact: false,
		bufferSize: 100,
		rateLimit: 0,
		maxLineBytes: 8192,
	});

	const instanceSettings = mock<InstanceSettings>({ hostId: 'main-test', instanceType: 'main' });

	const captured = () => buffer.readSince(undefined, {}, 100).records;

	beforeEach(() => {
		// Silence real output first; the service patches whatever is in place, and
		// `stop()` restores it, so the spy survives the round trip.
		stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
		stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

		logger = buildLogger();
		logger.attachTransport(new StdoutEchoTransport());

		buffer = new LogRingBuffer(config);
		service = new LogCaptureService(logger, config, instanceSettings, buffer);
		service.start();
	});

	afterEach(() => {
		service.stop();
		stdoutSpy.mockRestore();
		stderrSpy.mockRestore();
	});

	describe('reentrancy guard', () => {
		it('captures a structured log exactly once, not again via the stdout tee', () => {
			logger.info('structured line');

			const records = captured();

			expect(records).toHaveLength(1);
			expect(records[0]).toMatchObject({
				stream: 'log',
				level: 'info',
				message: 'structured line',
			});
		});

		it('still lets the console transport write to the real stream', () => {
			logger.info('structured line');

			expect(stdoutSpy).toHaveBeenCalledWith('structured line\n', undefined, undefined);
		});

		it('is not left armed after an emit', () => {
			logger.info('structured line');

			expect(isInternalWriteInProgress()).toBe(false);
		});

		it('does not loop when the broadcast path logs on every admitted record', () => {
			// The shape of the real amplification bug: broadcasting a line logs a
			// line, which broadcasts a line. The scope exclusion is what stops it —
			// the guard alone only prevents the stdout copy.
			const consoleLogger = logger.scoped('operator-console');
			buffer.onRecord(() => consoleLogger.debug('broadcasting a batch'));

			logger.info('trigger');

			expect(captured()).toHaveLength(1);
		});
	});

	describe('operator-console scope', () => {
		it('never captures the console’s own logging', () => {
			logger.scoped('operator-console').info('publishing batch');

			expect(captured()).toEqual([]);
		});

		it('captures other scopes and promotes the scope to a label', () => {
			logger.scoped('scaling').info('worker registered');

			expect(captured()[0]).toMatchObject({ scope: 'scaling', message: 'worker registered' });
		});
	});

	describe('stdout/stderr tee', () => {
		it('captures a raw stdout write that never touched the logger', () => {
			process.stdout.write('console.log from a Code node\n');

			expect(captured()).toEqual([
				expect.objectContaining({
					stream: 'stdout',
					level: 'info',
					message: 'console.log from a Code node',
				}),
			]);
		});

		it('captures stderr at error level', () => {
			process.stderr.write('something went wrong\n');

			expect(captured()[0]).toMatchObject({ stream: 'stderr', level: 'error' });
		});

		it('passes the original write through untouched', () => {
			process.stdout.write('passthrough\n');

			expect(stdoutSpy).toHaveBeenCalledWith('passthrough\n', undefined, undefined);
		});

		it('handles buffer chunks', () => {
			process.stdout.write(Buffer.from('from a buffer\n'));

			expect(captured()[0]).toMatchObject({ message: 'from a buffer' });
		});
	});

	describe('record shape', () => {
		it('labels records with host, role and origin', () => {
			logger.info('hello');

			expect(captured()[0]).toMatchObject({
				hostId: 'main-test',
				role: 'main',
				origin: 'live',
			});
		});

		it('promotes execution metadata to labels and keeps the rest in meta', () => {
			logger.info('running node', { executionId: '42', workflowId: 'wf-1', attempt: 2 });

			const record: OperatorLogRecord = captured()[0];

			expect(record.executionId).toBe('42');
			expect(record.workflowId).toBe('wf-1');
			expect(record.meta).toMatchObject({ attempt: 2 });
			expect(record.meta).not.toHaveProperty('executionId');
		});
	});

	describe('stop', () => {
		it('restores both writes and stops capturing', () => {
			service.stop();

			process.stdout.write('after stop\n');
			logger.info('after stop');

			expect(captured()).toEqual([]);
			expect(process.stdout.write).toBe(stdoutSpy);
			expect(process.stderr.write).toBe(stderrSpy);
		});

		it('is idempotent', () => {
			service.stop();

			expect(() => service.stop()).not.toThrow();
		});
	});

	describe('captureStdout disabled', () => {
		it('leaves the standard streams alone', () => {
			service.stop();

			const disabledConfig = mock<OperatorConsoleConfig>({
				captureStdout: false,
				redact: false,
				bufferSize: 100,
				rateLimit: 0,
				maxLineBytes: 8192,
			});
			const disabledBuffer = new LogRingBuffer(disabledConfig);
			const disabled = new LogCaptureService(
				buildLogger(),
				disabledConfig,
				instanceSettings,
				disabledBuffer,
			);

			disabled.start();
			try {
				process.stdout.write('untouched\n');
				expect(disabledBuffer.size).toBe(0);
				expect(process.stdout.write).toBe(stdoutSpy);
			} finally {
				disabled.stop();
			}
		});
	});
});
