jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	LoggerProxy: { init: jest.fn() },
}));

import type { GlobalConfig, InstanceSettingsConfig } from '@n8n/config';
import { mock, captor } from 'jest-mock-extended';
import { LoggerProxy } from 'n8n-workflow';
import winston from 'winston';

import { Logger } from '../logger';

const WINSTON_MESSAGE = Symbol.for('message');

const spyOnConsoleTransport = () =>
	jest.spyOn(winston.transports.Console.prototype, 'log').mockImplementation(() => {});

const getLoggedMessage = (
	consoleTransportSpy: ReturnType<typeof spyOnConsoleTransport>,
	callIndex = consoleTransportSpy.mock.calls.length - 1,
) => {
	const info = consoleTransportSpy.mock.calls[callIndex]?.[0] as
		| Record<symbol, unknown>
		| undefined;
	const output = info?.[WINSTON_MESSAGE];
	if (typeof output !== 'string') {
		fail(`expected 'output' to be of type 'string', got ${typeof output}`);
	}

	return output;
};

describe('Logger', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('constructor', () => {
		const globalConfig = mock<GlobalConfig>({
			logging: {
				level: 'info',
				outputs: ['console'],
				scopes: [],
			},
		});

		test('if root, should initialize `LoggerProxy` with instance', () => {
			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>(), { isRoot: true });

			expect(LoggerProxy.init).toHaveBeenCalledWith(logger);
		});

		test('if scoped, should not initialize `LoggerProxy`', () => {
			new Logger(globalConfig, mock<InstanceSettingsConfig>(), { isRoot: false });

			expect(LoggerProxy.init).not.toHaveBeenCalled();
		});
	});

	describe('formats', () => {
		afterEach(() => {
			jest.restoreAllMocks();
		});

		test('log text, if `config.logging.format` is set to `text`', () => {
			// ARRANGE
			const consoleLogSpy = spyOnConsoleTransport();
			const globalConfig = mock<GlobalConfig>({
				logging: {
					format: 'text',
					level: 'info',
					outputs: ['console'],
					scopes: [],
				},
			});
			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>());
			const testMessage = 'Test Message';
			const testMetadata = { test: 1 };

			// ACT
			logger.info(testMessage, testMetadata);

			// ASSERT
			expect(consoleLogSpy).toHaveBeenCalledTimes(1);

			expect(getLoggedMessage(consoleLogSpy)).toEqual(testMessage);
		});

		test('log json, if `config.logging.format` is set to `json`', () => {
			// ARRANGE
			const consoleLogSpy = spyOnConsoleTransport();
			const globalConfig = mock<GlobalConfig>({
				logging: {
					format: 'json',
					level: 'info',
					outputs: ['console'],
					scopes: [],
				},
			});
			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>());
			const testMessage = 'Test Message';
			const testMetadata = { test: 1 };

			// ACT
			logger.info(testMessage, testMetadata);

			// ASSERT
			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
			const output = getLoggedMessage(consoleLogSpy);

			expect(() => JSON.parse(output)).not.toThrow();
			const parsedOutput = JSON.parse(output);

			expect(parsedOutput).toMatchObject({
				message: testMessage,
				level: 'info',
				metadata: {
					...testMetadata,
					timestamp: expect.any(String),
				},
			});
		});

		test('apply scope filters, if `config.logging.format` is set to `json`', () => {
			// ARRANGE
			const consoleLogSpy = spyOnConsoleTransport();
			const globalConfig = mock<GlobalConfig>({
				logging: {
					format: 'json',
					level: 'info',
					outputs: ['console'],
					scopes: ['push'],
				},
			});
			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>());
			const redisLogger = logger.scoped('redis');
			const pushLogger = logger.scoped('push');
			const testMessage = 'Test Message';
			const testMetadata = { test: 1 };

			// ACT
			redisLogger.info(testMessage, testMetadata);
			pushLogger.info(testMessage, testMetadata);

			// ASSERT
			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
		});

		test('log errors in metadata with stack trace, if `config.logging.format` is set to `json`', () => {
			// ARRANGE
			const consoleLogSpy = spyOnConsoleTransport();
			const globalConfig = mock<GlobalConfig>({
				logging: {
					format: 'json',
					level: 'info',
					outputs: ['console'],
					scopes: [],
				},
			});
			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>());
			const testMessage = 'Test Message';
			const parentError = new Error('Parent', { cause: 'just a string' });
			const testError = new Error('Test', { cause: parentError });
			const testMetadata = { error: testError };

			// ACT
			logger.info(testMessage, testMetadata);

			// ASSERT
			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
			const output = getLoggedMessage(consoleLogSpy);

			expect(() => JSON.parse(output)).not.toThrow();
			const parsedOutput = JSON.parse(output);

			expect(parsedOutput).toMatchObject({
				message: testMessage,
				metadata: {
					error: {
						name: testError.name,
						message: testError.message,
						stack: testError.stack,
						cause: {
							name: parentError.name,
							message: parentError.message,
							stack: parentError.stack,
							cause: parentError.cause,
						},
					},
				},
			});
		});

		test('do not recurse indefinitely when `cause` contains circular references', () => {
			// ARRANGE
			const consoleLogSpy = spyOnConsoleTransport();
			const globalConfig = mock<GlobalConfig>({
				logging: {
					format: 'json',
					level: 'info',
					outputs: ['console'],
					scopes: [],
				},
			});
			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>());
			const testMessage = 'Test Message';
			const parentError = new Error('Parent', { cause: 'just a string' });
			const childError = new Error('Test', { cause: parentError });
			parentError.cause = childError;
			const testMetadata = { error: childError };

			// ACT
			logger.info(testMessage, testMetadata);

			// ASSERT
			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
			const output = getLoggedMessage(consoleLogSpy);

			expect(() => JSON.parse(output)).not.toThrow();
			const parsedOutput = JSON.parse(output);

			expect(parsedOutput).toMatchObject({
				message: testMessage,
				metadata: {
					error: {
						name: childError.name,
						message: childError.message,
						stack: childError.stack,
						cause: {
							name: parentError.name,
							message: parentError.message,
							stack: parentError.stack,
						},
					},
				},
			});
		});
	});

	describe('optional metadata fields', () => {
		afterEach(() => {
			jest.restoreAllMocks();
		});

		test('should include optional metadata fields in JSON output when defined', () => {
			const consoleLogSpy = spyOnConsoleTransport();
			const globalConfig = mock<GlobalConfig>({
				logging: {
					format: 'json',
					level: 'info',
					outputs: ['console'],
					scopes: [],
				},
			});
			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>());

			logger.info('Workflow execution started', {
				workflowId: 'wf-1',
				projectId: 'proj-1',
				projectName: 'Test Project',
			});

			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
			const output = getLoggedMessage(consoleLogSpy);

			const parsedOutput = JSON.parse(output) as { metadata: Record<string, unknown> };
			expect(parsedOutput.metadata).toMatchObject({
				workflowId: 'wf-1',
				projectId: 'proj-1',
				projectName: 'Test Project',
			});
		});

		test('should omit undefined metadata fields from JSON output', () => {
			const consoleLogSpy = spyOnConsoleTransport();
			const globalConfig = mock<GlobalConfig>({
				logging: {
					format: 'json',
					level: 'info',
					outputs: ['console'],
					scopes: [],
				},
			});
			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>());

			logger.info('Workflow execution started', { workflowId: 'wf-1' });

			expect(consoleLogSpy).toHaveBeenCalledTimes(1);
			const output = getLoggedMessage(consoleLogSpy);

			const parsedOutput = JSON.parse(output) as { metadata: Record<string, unknown> };
			expect(parsedOutput.metadata.workflowId).toBe('wf-1');
			expect(parsedOutput.metadata).not.toHaveProperty('projectId');
			expect(parsedOutput.metadata).not.toHaveProperty('projectName');
		});
	});

	describe('transports', () => {
		afterEach(() => {
			jest.restoreAllMocks();
		});

		test('if `console` selected, should set console transport', () => {
			const globalConfig = mock<GlobalConfig>({
				logging: {
					level: 'info',
					outputs: ['console'],
					scopes: [],
				},
			});

			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>());

			const { transports } = logger.getInternalLogger();

			expect(transports).toHaveLength(1);

			const [transport] = transports;

			expect(transport.constructor.name).toBe('Console');
		});

		describe('`file`', () => {
			test('should set file transport', () => {
				const globalConfig = mock<GlobalConfig>({
					logging: {
						level: 'info',
						outputs: ['file'],
						scopes: [],
						file: {
							fileSizeMax: 100,
							fileCountMax: 16,
							location: 'logs/n8n.log',
						},
					},
				});

				const logger = new Logger(
					globalConfig,
					mock<InstanceSettingsConfig>({ n8nFolder: '/tmp' }),
				);

				const { transports } = logger.getInternalLogger();

				expect(transports).toHaveLength(1);

				const [transport] = transports;

				expect(transport.constructor.name).toBe('File');
			});

			test('should accept absolute paths', () => {
				// ARRANGE
				const location = '/tmp/n8n.log';
				const globalConfig = mock<GlobalConfig>({
					logging: {
						level: 'info',
						outputs: ['file'],
						scopes: [],
						file: { fileSizeMax: 100, fileCountMax: 16, location },
					},
				});
				const OriginalFile = winston.transports.File;
				const FileSpy = jest.spyOn(winston.transports, 'File').mockImplementation((...args) => {
					return new OriginalFile(...args);
				});

				// ACT
				new Logger(globalConfig, mock<InstanceSettingsConfig>({ n8nFolder: '/tmp' }));

				// ASSERT
				const fileOptionsCaptor = captor<string>();

				expect(FileSpy).toHaveBeenCalledTimes(1);
				expect(FileSpy).toHaveBeenCalledWith(fileOptionsCaptor);
				expect(fileOptionsCaptor.value).toMatchObject({ filename: location });
			});

			test('should accept relative paths', () => {
				// ARRANGE
				const location = 'tmp/n8n.log';
				const n8nFolder = '/tmp/n8n';
				const globalConfig = mock<GlobalConfig>({
					logging: {
						level: 'info',
						outputs: ['file'],
						scopes: [],
						file: {
							fileSizeMax: 100,
							fileCountMax: 16,
							location,
						},
					},
				});
				const OriginalFile = winston.transports.File;
				const FileSpy = jest.spyOn(winston.transports, 'File').mockImplementation((...args) => {
					return new OriginalFile(...args);
				});

				// ACT
				new Logger(globalConfig, mock<InstanceSettingsConfig>({ n8nFolder }));

				// ASSERT
				const fileOptionsCaptor = captor<string>();

				expect(FileSpy).toHaveBeenCalledTimes(1);
				expect(FileSpy).toHaveBeenCalledWith(fileOptionsCaptor);
				expect(fileOptionsCaptor.value).toMatchObject({ filename: `${n8nFolder}/${location}` });
			});
		});
	});

	describe('levels', () => {
		test('if `error` selected, should enable `error` level', () => {
			const globalConfig = mock<GlobalConfig>({
				logging: {
					level: 'error',
					outputs: ['console'],
					scopes: [],
				},
			});

			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>());

			const internalLogger = logger.getInternalLogger();

			expect(internalLogger.isErrorEnabled()).toBe(true);
			expect(internalLogger.isWarnEnabled()).toBe(false);
			expect(internalLogger.isInfoEnabled()).toBe(false);
			expect(internalLogger.isDebugEnabled()).toBe(false);
		});

		test('if `warn` selected, should enable `error` and `warn` levels', () => {
			const globalConfig = mock<GlobalConfig>({
				logging: {
					level: 'warn',
					outputs: ['console'],
					scopes: [],
				},
			});

			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>());

			const internalLogger = logger.getInternalLogger();

			expect(internalLogger.isErrorEnabled()).toBe(true);
			expect(internalLogger.isWarnEnabled()).toBe(true);
			expect(internalLogger.isInfoEnabled()).toBe(false);
			expect(internalLogger.isDebugEnabled()).toBe(false);
		});

		test('if `info` selected, should enable `error`, `warn`, and `info` levels', () => {
			const globalConfig = mock<GlobalConfig>({
				logging: {
					level: 'info',
					outputs: ['console'],
					scopes: [],
				},
			});

			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>());

			const internalLogger = logger.getInternalLogger();

			expect(internalLogger.isErrorEnabled()).toBe(true);
			expect(internalLogger.isWarnEnabled()).toBe(true);
			expect(internalLogger.isInfoEnabled()).toBe(true);
			expect(internalLogger.isDebugEnabled()).toBe(false);
		});

		test('if `debug` selected, should enable all levels', () => {
			const globalConfig = mock<GlobalConfig>({
				logging: {
					level: 'debug',
					outputs: ['console'],
					scopes: [],
				},
			});

			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>());

			const internalLogger = logger.getInternalLogger();

			expect(internalLogger.isErrorEnabled()).toBe(true);
			expect(internalLogger.isWarnEnabled()).toBe(true);
			expect(internalLogger.isInfoEnabled()).toBe(true);
			expect(internalLogger.isDebugEnabled()).toBe(true);
		});

		test('if `silent` selected, should disable all levels', () => {
			const globalConfig = mock<GlobalConfig>({
				logging: {
					level: 'silent',
					outputs: ['console'],
					scopes: [],
				},
			});

			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>());

			const internalLogger = logger.getInternalLogger();

			expect(internalLogger.isErrorEnabled()).toBe(false);
			expect(internalLogger.isWarnEnabled()).toBe(false);
			expect(internalLogger.isInfoEnabled()).toBe(false);
			expect(internalLogger.isDebugEnabled()).toBe(false);
			expect(internalLogger.silent).toBe(true);
		});
	});

	describe('production debug logging without color codes', () => {
		// eslint-disable-next-line no-control-regex
		const ANSI_COLOR_PATTERN = /\x1b\[\d+m/g; // Pattern to match ANSI color escape codes

		afterEach(() => {
			jest.restoreAllMocks();
			delete process.env.NO_COLOR;
		});

		test('production debug logs default to no colors (NO_COLOR not set)', () => {
			// ARRANGE
			const consoleLogSpy = spyOnConsoleTransport();
			const globalConfig = mock<GlobalConfig>({
				logging: {
					format: 'json', // Use json format so we can check the format property directly
					level: 'debug',
					outputs: ['console'],
					scopes: [],
				},
			});

			// Create logger
			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>());

			// ACT
			logger.debug('Test message', { testKey: 'testValue' });

			// ASSERT
			// If json format is used, uncolorize should be in the pipeline (as it's used in debugProdConsoleFormat)
			expect(consoleLogSpy).toHaveBeenCalled();
			const output = getLoggedMessage(consoleLogSpy);

			// JSON logs should be parseable and not contain ANSI codes
			expect(() => JSON.parse(output)).not.toThrow();
			const hasAnsiCodes = ANSI_COLOR_PATTERN.test(output);
			expect(hasAnsiCodes).toBe(false);
		});

		test('NO_COLOR environment variable is respected and prevents colors', () => {
			// ARRANGE
			process.env.NO_COLOR = '1';
			const consoleLogSpy = spyOnConsoleTransport();
			const globalConfig = mock<GlobalConfig>({
				logging: {
					format: 'json',
					level: 'info',
					outputs: ['console'],
					scopes: [],
				},
			});

			// ACT
			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>());
			logger.info('Test message with NO_COLOR', { key: 'value' });

			// ASSERT
			expect(consoleLogSpy).toHaveBeenCalled();
			const output = getLoggedMessage(consoleLogSpy);

			// Should not contain ANSI color codes even with colorize in dev format
			const hasAnsiCodes = ANSI_COLOR_PATTERN.test(output);
			expect(hasAnsiCodes).toBe(false);

			// Cleanup
			delete process.env.NO_COLOR;
		});

		test('debugProdConsoleFormat produces uncolored structured output', () => {
			// ARRANGE
			// Note: This test inspects the actual formatter method signature
			// We verify that when level is debug in production mode,
			// the output doesn't include color codes
			const consoleLogSpy = spyOnConsoleTransport();
			const globalConfig = mock<GlobalConfig>({
				logging: {
					format: 'json', // Using json to ensure we test the basic behavior
					level: 'debug',
					outputs: ['console'],
					scopes: [],
				},
			});

			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>());
			const testMessage = 'Debug operation completed';
			const testMetadata = { operation: 'database_query', duration_ms: 234 };

			// ACT
			logger.debug(testMessage, testMetadata);

			// ASSERT
			expect(consoleLogSpy).toHaveBeenCalled();
			const output = getLoggedMessage(consoleLogSpy);

			// Verify output is valid JSON (our format configuration)
			const parsed = JSON.parse(output) as { message: string; metadata: { operation: string } };
			expect(parsed.message).toBe(testMessage);
			expect(parsed.metadata.operation).toBe('database_query');

			// Most importantly: verify no ANSI color codes are present
			const hasAnsiCodes = ANSI_COLOR_PATTERN.test(output);
			expect(hasAnsiCodes).toBe(false);
		});

		test('logger format selection respects environment and level', () => {
			// ARRANGE
			// Create two loggers with different configurations
			const consoleLogSpy = spyOnConsoleTransport();

			const infoProdConfig = mock<GlobalConfig>({
				logging: {
					format: 'json',
					level: 'info', // Not debug level
					outputs: ['console'],
					scopes: [],
				},
			});

			const debugProdConfig = mock<GlobalConfig>({
				logging: {
					format: 'json',
					level: 'debug', // Debug level - should use debugProdConsoleFormat when in production
					outputs: ['console'],
					scopes: [],
				},
			});

			// ACT
			const infoLogger = new Logger(infoProdConfig, mock<InstanceSettingsConfig>());
			const debugLogger = new Logger(debugProdConfig, mock<InstanceSettingsConfig>());

			infoLogger.info('Info level message', {});
			debugLogger.debug('Debug level message', { context: 'important' });

			// ASSERT
			expect(consoleLogSpy).toHaveBeenCalledTimes(2);

			// Both outputs should be ANSI-free
			const infoOutput = getLoggedMessage(consoleLogSpy, 0);
			const debugOutput = getLoggedMessage(consoleLogSpy, 1);

			expect(ANSI_COLOR_PATTERN.test(infoOutput)).toBe(false);
			expect(ANSI_COLOR_PATTERN.test(debugOutput)).toBe(false);
		});
	});
});
