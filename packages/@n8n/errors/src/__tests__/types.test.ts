import type { Event } from '@sentry/node';
import type { ErrorLevel, ErrorTags, ReportingOptions } from '../types';

describe('Types', () => {
	describe('ErrorLevel', () => {
		it('should accept all valid error levels', () => {
			const levels: ErrorLevel[] = ['fatal', 'error', 'warning', 'info'];

			levels.forEach((level) => {
				// This test ensures the type accepts all expected values
				const testLevel: ErrorLevel = level;
				expect(typeof testLevel).toBe('string');
				expect(['fatal', 'error', 'warning', 'info']).toContain(testLevel);
			});
		});

		it('should be compatible with string literals', () => {
			// Type compatibility tests
			const fatalLevel: ErrorLevel = 'fatal';
			const errorLevel: ErrorLevel = 'error';
			const warningLevel: ErrorLevel = 'warning';
			const infoLevel: ErrorLevel = 'info';

			expect(fatalLevel).toBe('fatal');
			expect(errorLevel).toBe('error');
			expect(warningLevel).toBe('warning');
			expect(infoLevel).toBe('info');
		});

		it('should be used in functions and interfaces', () => {
			// Test function that accepts ErrorLevel
			const processError = (level: ErrorLevel): string => {
				return `Processing ${level} level error`;
			};

			expect(processError('fatal')).toBe('Processing fatal level error');
			expect(processError('error')).toBe('Processing error level error');
			expect(processError('warning')).toBe('Processing warning level error');
			expect(processError('info')).toBe('Processing info level error');
		});

		it('should work with switch statements', () => {
			const getNumericLevel = (level: ErrorLevel): number => {
				switch (level) {
					case 'fatal':
						return 4;
					case 'error':
						return 3;
					case 'warning':
						return 2;
					case 'info':
						return 1;
					default:
						// This should never be reached with proper typing
						return 0;
				}
			};

			expect(getNumericLevel('fatal')).toBe(4);
			expect(getNumericLevel('error')).toBe(3);
			expect(getNumericLevel('warning')).toBe(2);
			expect(getNumericLevel('info')).toBe(1);
		});
	});

	describe('ErrorTags', () => {
		it('should be compatible with Sentry Event tags', () => {
			// This tests that ErrorTags is properly derived from Sentry's Event type
			const sentryEventTags: NonNullable<Event['tags']> = {
				environment: 'test',
				version: '1.0.0',
			};

			const errorTags: ErrorTags = sentryEventTags;

			expect(errorTags).toEqual({
				environment: 'test',
				version: '1.0.0',
			});
		});

		it('should accept string key-value pairs', () => {
			const tags: ErrorTags = {
				module: 'auth',
				component: 'login',
				userId: '123',
				action: 'validate_token',
				result: 'failure',
			};

			Object.entries(tags).forEach(([key, value]) => {
				expect(typeof key).toBe('string');
				expect(typeof value).toBe('string');
			});
		});

		it('should work with computed property names', () => {
			const dynamicKey = 'computed_key';
			const tags: ErrorTags = {
				[dynamicKey]: 'computed_value',
				static_key: 'static_value',
			};

			expect(tags[dynamicKey]).toBe('computed_value');
			expect(tags.static_key).toBe('static_value');
		});

		it('should support common tag patterns', () => {
			const tags: ErrorTags = {
				// Environment tags
				environment: 'production',
				version: '2.1.0',

				// User context tags
				userId: 'user-123',
				userRole: 'admin',

				// Request context tags
				requestId: 'req-456',
				endpoint: '/api/workflows',
				method: 'POST',

				// Application context tags
				workflowId: 'wf-789',
				nodeId: 'node-abc',
				executionId: 'exec-def',

				// Error context tags
				errorCode: 'AUTH_FAILED',
				component: 'authentication',
				module: 'oauth',
			};

			expect(Object.keys(tags)).toHaveLength(13);
			Object.values(tags).forEach((value) => {
				expect(typeof value).toBe('string');
			});
		});

		it('should handle empty tags object', () => {
			const emptyTags: ErrorTags = {};

			expect(Object.keys(emptyTags)).toHaveLength(0);
			expect(emptyTags).toEqual({});
		});
	});

	describe('ReportingOptions', () => {
		it('should accept all optional properties', () => {
			const fullOptions: ReportingOptions = {
				shouldReport: true,
				shouldBeLogged: false,
				level: 'error',
				tags: { module: 'test' },
				extra: { data: 'test' },
				executionId: 'exec-123',
			};

			expect(fullOptions.shouldReport).toBe(true);
			expect(fullOptions.shouldBeLogged).toBe(false);
			expect(fullOptions.level).toBe('error');
			expect(fullOptions.tags).toEqual({ module: 'test' });
			expect(fullOptions.extra).toEqual({ data: 'test' });
			expect(fullOptions.executionId).toBe('exec-123');
		});

		it('should accept partial options', () => {
			const minimalOptions: ReportingOptions = {
				level: 'warning',
			};

			expect(minimalOptions.level).toBe('warning');
			expect(minimalOptions.shouldReport).toBeUndefined();
			expect(minimalOptions.shouldBeLogged).toBeUndefined();
			expect(minimalOptions.tags).toBeUndefined();
			expect(minimalOptions.extra).toBeUndefined();
			expect(minimalOptions.executionId).toBeUndefined();
		});

		it('should accept empty options object', () => {
			const emptyOptions: ReportingOptions = {};

			expect(Object.keys(emptyOptions)).toHaveLength(0);
		});

		it('should work with boolean reporting flags', () => {
			const reportingConfigs: ReportingOptions[] = [
				{ shouldReport: true, shouldBeLogged: true },
				{ shouldReport: true, shouldBeLogged: false },
				{ shouldReport: false, shouldBeLogged: true },
				{ shouldReport: false, shouldBeLogged: false },
				{ shouldReport: undefined, shouldBeLogged: undefined },
			];

			reportingConfigs.forEach((config, index) => {
				expect(typeof config.shouldReport === 'boolean' || config.shouldReport === undefined).toBe(
					true,
				);
				expect(
					typeof config.shouldBeLogged === 'boolean' || config.shouldBeLogged === undefined,
				).toBe(true);
			});
		});

		it('should handle different error levels', () => {
			const levelConfigs: ReportingOptions[] = [
				{ level: 'fatal' },
				{ level: 'error' },
				{ level: 'warning' },
				{ level: 'info' },
			];

			levelConfigs.forEach((config) => {
				expect(['fatal', 'error', 'warning', 'info']).toContain(config.level);
			});
		});

		it('should accept complex extra data', () => {
			const complexExtra = {
				user: {
					id: 'user-123',
					email: 'test@example.com',
					preferences: {
						theme: 'dark',
						notifications: true,
					},
				},
				request: {
					method: 'POST',
					url: '/api/workflows',
					headers: {
						'user-agent': 'n8n-client/1.0',
						'content-type': 'application/json',
					},
					body: {
						name: 'Test Workflow',
						nodes: [],
					},
				},
				execution: {
					workflowId: 'wf-456',
					executionId: 'exec-789',
					startTime: new Date('2023-01-01'),
					metadata: {
						version: '1.0',
						environment: 'test',
					},
				},
			};

			const options: ReportingOptions = {
				extra: complexExtra,
				tags: { scenario: 'complex_data' },
			};

			expect(options.extra).toEqual(complexExtra);
			expect(options.extra).toHaveProperty('user.id', 'user-123');
			expect(options.extra).toHaveProperty('request.method', 'POST');
			expect(options.extra).toHaveProperty('execution.workflowId', 'wf-456');
		});

		it('should be compatible with Sentry Event extra type', () => {
			// Test that extra field is compatible with Sentry's Event['extra']
			const sentryExtra: Event['extra'] = {
				customData: 'test',
				nestedObject: {
					key: 'value',
					number: 42,
					boolean: true,
				},
			};

			const options: ReportingOptions = {
				extra: sentryExtra,
			};

			expect(options.extra).toEqual(sentryExtra);
		});

		it('should handle execution ID patterns', () => {
			const executionIdPatterns = [
				'exec-123',
				'execution_456',
				'EXEC-789-ABC',
				'run-2023-01-01-12-34-56',
				'uuid-550e8400-e29b-41d4-a716-446655440000',
			];

			executionIdPatterns.forEach((executionId) => {
				const options: ReportingOptions = { executionId };
				expect(options.executionId).toBe(executionId);
				expect(typeof options.executionId).toBe('string');
			});
		});

		it('should support builder pattern usage', () => {
			// Test that ReportingOptions can be built incrementally
			let options: ReportingOptions = {};

			options = { ...options, level: 'error' };
			expect(options.level).toBe('error');

			options = { ...options, shouldReport: true };
			expect(options.shouldReport).toBe(true);

			options = { ...options, tags: { module: 'auth' } };
			expect(options.tags).toEqual({ module: 'auth' });

			options = { ...options, tags: { ...options.tags, action: 'login' } };
			expect(options.tags).toEqual({ module: 'auth', action: 'login' });

			options = { ...options, extra: { userId: '123' } };
			expect(options.extra).toEqual({ userId: '123' });
		});

		it('should work with factory functions', () => {
			const createReportingOptions = (
				level: ErrorLevel,
				shouldReport = true,
				executionId?: string,
			): ReportingOptions => {
				return {
					level,
					shouldReport,
					shouldBeLogged: true,
					tags: {
						source: 'factory',
						level: level,
					},
					executionId,
				};
			};

			const options1 = createReportingOptions('error');
			expect(options1.level).toBe('error');
			expect(options1.shouldReport).toBe(true);
			expect(options1.tags).toEqual({ source: 'factory', level: 'error' });

			const options2 = createReportingOptions('warning', false, 'exec-456');
			expect(options2.level).toBe('warning');
			expect(options2.shouldReport).toBe(false);
			expect(options2.executionId).toBe('exec-456');
		});
	});

	describe('Type relationships and compatibility', () => {
		it('should demonstrate type relationships', () => {
			// ErrorTags is derived from Sentry Event tags
			const sentryTags: NonNullable<Event['tags']> = { key: 'value' };
			const errorTags: ErrorTags = sentryTags;
			expect(errorTags).toEqual(sentryTags);

			// ErrorLevel is used in ReportingOptions
			const level: ErrorLevel = 'error';
			const options: ReportingOptions = { level };
			expect(options.level).toBe(level);

			// ErrorTags is used in ReportingOptions
			const tags: ErrorTags = { module: 'test' };
			const optionsWithTags: ReportingOptions = { tags };
			expect(optionsWithTags.tags).toEqual(tags);
		});

		it('should work with generic error handling functions', () => {
			type ErrorHandler<T extends ReportingOptions> = (
				message: string,
				options: T,
			) => { message: string; options: T };

			const handleError: ErrorHandler<ReportingOptions> = (message, options) => {
				return { message, options };
			};

			const result = handleError('Test error', {
				level: 'error',
				tags: { component: 'test' },
				shouldReport: true,
			});

			expect(result.message).toBe('Test error');
			expect(result.options.level).toBe('error');
			expect(result.options.tags).toEqual({ component: 'test' });
			expect(result.options.shouldReport).toBe(true);
		});

		it('should support type guards', () => {
			const isValidErrorLevel = (value: any): value is ErrorLevel => {
				return typeof value === 'string' && ['fatal', 'error', 'warning', 'info'].includes(value);
			};

			expect(isValidErrorLevel('error')).toBe(true);
			expect(isValidErrorLevel('warning')).toBe(true);
			expect(isValidErrorLevel('invalid')).toBe(false);
			expect(isValidErrorLevel(123)).toBe(false);
			expect(isValidErrorLevel(null)).toBe(false);
		});

		it('should work with mapped types', () => {
			type ErrorLevelInfo = {
				[K in ErrorLevel]: {
					level: K;
					priority: number;
					shouldAlert: boolean;
				};
			};

			const errorLevelInfo: ErrorLevelInfo = {
				fatal: { level: 'fatal', priority: 4, shouldAlert: true },
				error: { level: 'error', priority: 3, shouldAlert: true },
				warning: { level: 'warning', priority: 2, shouldAlert: false },
				info: { level: 'info', priority: 1, shouldAlert: false },
			};

			expect(errorLevelInfo.fatal.priority).toBe(4);
			expect(errorLevelInfo.error.shouldAlert).toBe(true);
			expect(errorLevelInfo.warning.shouldAlert).toBe(false);
			expect(errorLevelInfo.info.priority).toBe(1);
		});
	});
});
