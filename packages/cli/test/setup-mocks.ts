import 'reflect-metadata';

// Mock Sentry early to prevent native module loading issues
jest.mock('@sentry/node', () => ({
	init: jest.fn(),
	configureScope: jest.fn(),
	addBreadcrumb: jest.fn(),
	captureException: jest.fn(),
	captureMessage: jest.fn(),
	withScope: jest.fn((cb) => cb({})),
	Severity: {
		Error: 'error',
		Warning: 'warning',
		Info: 'info',
		Debug: 'debug',
	},
}));

// Mock the problematic native stacktrace module
jest.mock('@sentry-internal/node-native-stacktrace', () => ({}), { virtual: true });
jest.mock('@n8n_io/license-sdk');
jest.mock('@/telemetry');
jest.mock('@/eventbus/message-event-bus/message-event-bus');
jest.mock('@/push');
jest.mock('node:fs');
jest.mock('node:fs/promises');

// Mock LoggerProxy to prevent initialization issues in tests
jest.mock('n8n-workflow', () => {
	const actual = jest.requireActual('n8n-workflow');
	return {
		...actual,
		LoggerProxy: {
			...actual.LoggerProxy,
			init: jest.fn(),
		},
	};
});
