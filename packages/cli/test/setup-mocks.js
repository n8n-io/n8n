'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
require('reflect-metadata');
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
jest.mock('@sentry-internal/node-native-stacktrace', () => ({}), { virtual: true });
jest.mock('@n8n_io/license-sdk');
jest.mock('@/telemetry');
jest.mock('@/eventbus/message-event-bus/message-event-bus');
jest.mock('@/push');
jest.mock('node:fs');
jest.mock('node:fs/promises');
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
//# sourceMappingURL=setup-mocks.js.map
