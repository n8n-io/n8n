'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const abstract_oauth_controller_1 = require('../abstract-oauth.controller');
describe('shouldSkipAuthOnOAuthCallback', () => {
	const originalEnv = process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK;
	afterEach(() => {
		if (originalEnv === undefined) {
			delete process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK;
		} else {
			process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK = originalEnv;
		}
	});
	describe('when N8N_SKIP_AUTH_ON_OAUTH_CALLBACK is not set', () => {
		beforeEach(() => {
			delete process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK;
		});
		it('should return true', () => {
			expect((0, abstract_oauth_controller_1.shouldSkipAuthOnOAuthCallback)()).toBe(true);
		});
	});
	describe('with various environment variable values', () => {
		const testCases = [
			{ value: 'true', expected: true },
			{ value: 'TRUE', expected: true },
			{ value: 'True', expected: true },
			{ value: 'false', expected: false },
			{ value: 'FALSE', expected: false },
			{ value: 'False', expected: false },
			{ value: '', expected: false },
			{ value: '1', expected: false },
			{ value: 'yes', expected: false },
			{ value: 'on', expected: false },
			{ value: 'enabled', expected: false },
			{ value: '   ', expected: false },
			{ value: ' true ', expected: false },
		];
		test.each(testCases)('"%s" value should return %s', ({ value, expected }) => {
			process.env.N8N_SKIP_AUTH_ON_OAUTH_CALLBACK = value;
			expect((0, abstract_oauth_controller_1.shouldSkipAuthOnOAuthCallback)()).toBe(expected);
		});
	});
});
//# sourceMappingURL=abstract-oauth.controller.test.js.map
