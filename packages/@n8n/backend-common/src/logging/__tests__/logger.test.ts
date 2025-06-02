jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	LoggerProxy: { init: jest.fn() },
}));

import type { GlobalConfig, InstanceSettingsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import { LoggerProxy } from 'n8n-workflow';

import { Logger } from '../logger';

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

	describe('transports', () => {
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

		test('if `file` selected, should set file transport', () => {
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

			const logger = new Logger(globalConfig, mock<InstanceSettingsConfig>({ n8nFolder: '/tmp' }));

			const { transports } = logger.getInternalLogger();

			expect(transports).toHaveLength(1);

			const [transport] = transports;

			expect(transport.constructor.name).toBe('File');
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
});
