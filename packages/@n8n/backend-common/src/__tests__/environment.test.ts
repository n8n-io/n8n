/**
 * Comprehensive test suite for environment detection functionality
 */

import { inTest, inProduction, inDevelopment } from '../environment';

describe('Environment Detection', () => {
	const originalNodeEnv = process.env.NODE_ENV;

	afterEach(() => {
		// Restore original NODE_ENV after each test
		if (originalNodeEnv !== undefined) {
			process.env.NODE_ENV = originalNodeEnv;
		} else {
			delete process.env.NODE_ENV;
		}
	});

	describe('inTest', () => {
		it('should return true when NODE_ENV is "test"', () => {
			process.env.NODE_ENV = 'test';

			// Re-import to get fresh values based on new NODE_ENV
			jest.resetModules();
			const { inTest } = require('../environment');

			expect(inTest).toBe(true);
		});

		it('should return false when NODE_ENV is "production"', () => {
			process.env.NODE_ENV = 'production';

			jest.resetModules();
			const { inTest } = require('../environment');

			expect(inTest).toBe(false);
		});

		it('should return false when NODE_ENV is "development"', () => {
			process.env.NODE_ENV = 'development';

			jest.resetModules();
			const { inTest } = require('../environment');

			expect(inTest).toBe(false);
		});

		it('should return false when NODE_ENV is undefined', () => {
			delete process.env.NODE_ENV;

			jest.resetModules();
			const { inTest } = require('../environment');

			expect(inTest).toBe(false);
		});

		it('should return false when NODE_ENV is an arbitrary value', () => {
			process.env.NODE_ENV = 'staging';

			jest.resetModules();
			const { inTest } = require('../environment');

			expect(inTest).toBe(false);
		});
	});

	describe('inProduction', () => {
		it('should return true when NODE_ENV is "production"', () => {
			process.env.NODE_ENV = 'production';

			jest.resetModules();
			const { inProduction } = require('../environment');

			expect(inProduction).toBe(true);
		});

		it('should return false when NODE_ENV is "test"', () => {
			process.env.NODE_ENV = 'test';

			jest.resetModules();
			const { inProduction } = require('../environment');

			expect(inProduction).toBe(false);
		});

		it('should return false when NODE_ENV is "development"', () => {
			process.env.NODE_ENV = 'development';

			jest.resetModules();
			const { inProduction } = require('../environment');

			expect(inProduction).toBe(false);
		});

		it('should return false when NODE_ENV is undefined', () => {
			delete process.env.NODE_ENV;

			jest.resetModules();
			const { inProduction } = require('../environment');

			expect(inProduction).toBe(false);
		});

		it('should return false when NODE_ENV is an arbitrary value', () => {
			process.env.NODE_ENV = 'staging';

			jest.resetModules();
			const { inProduction } = require('../environment');

			expect(inProduction).toBe(false);
		});
	});

	describe('inDevelopment', () => {
		it('should return true when NODE_ENV is "development"', () => {
			process.env.NODE_ENV = 'development';

			jest.resetModules();
			const { inDevelopment } = require('../environment');

			expect(inDevelopment).toBe(true);
		});

		it('should return true when NODE_ENV is undefined (default to development)', () => {
			delete process.env.NODE_ENV;

			jest.resetModules();
			const { inDevelopment } = require('../environment');

			expect(inDevelopment).toBe(true);
		});

		it('should return true when NODE_ENV is empty string', () => {
			process.env.NODE_ENV = '';

			jest.resetModules();
			const { inDevelopment } = require('../environment');

			expect(inDevelopment).toBe(true);
		});

		it('should return false when NODE_ENV is "production"', () => {
			process.env.NODE_ENV = 'production';

			jest.resetModules();
			const { inDevelopment } = require('../environment');

			expect(inDevelopment).toBe(false);
		});

		it('should return false when NODE_ENV is "test"', () => {
			process.env.NODE_ENV = 'test';

			jest.resetModules();
			const { inDevelopment } = require('../environment');

			expect(inDevelopment).toBe(false);
		});

		it('should return false when NODE_ENV is an arbitrary value', () => {
			process.env.NODE_ENV = 'staging';

			jest.resetModules();
			const { inDevelopment } = require('../environment');

			expect(inDevelopment).toBe(false);
		});
	});

	describe('Environment Detection Logic Consistency', () => {
		it('should ensure only one environment flag is true at any time', () => {
			const environments = ['test', 'production', 'development', 'staging', '', undefined];

			environments.forEach((env) => {
				if (env === undefined) {
					delete process.env.NODE_ENV;
				} else {
					process.env.NODE_ENV = env;
				}

				jest.resetModules();
				const { inTest, inProduction, inDevelopment } = require('../environment');

				const trueFlags = [inTest, inProduction, inDevelopment].filter(Boolean);

				// Exactly one should be true, except for edge cases
				if (env === 'test') {
					expect(trueFlags).toHaveLength(1);
					expect(inTest).toBe(true);
					expect(inProduction).toBe(false);
					expect(inDevelopment).toBe(false);
				} else if (env === 'production') {
					expect(trueFlags).toHaveLength(1);
					expect(inTest).toBe(false);
					expect(inProduction).toBe(true);
					expect(inDevelopment).toBe(false);
				} else {
					// development, staging, empty, or undefined all default to development
					expect(trueFlags).toHaveLength(1);
					expect(inTest).toBe(false);
					expect(inProduction).toBe(false);
					expect(inDevelopment).toBe(true);
				}
			});
		});

		it('should handle case sensitivity correctly', () => {
			const testCases = [
				{ env: 'TEST', expected: { inTest: false, inProduction: false, inDevelopment: true } },
				{
					env: 'PRODUCTION',
					expected: { inTest: false, inProduction: false, inDevelopment: true },
				},
				{
					env: 'DEVELOPMENT',
					expected: { inTest: false, inProduction: false, inDevelopment: true },
				},
				{ env: 'Test', expected: { inTest: false, inProduction: false, inDevelopment: true } },
				{
					env: 'Production',
					expected: { inTest: false, inProduction: false, inDevelopment: true },
				},
			];

			testCases.forEach(({ env, expected }) => {
				process.env.NODE_ENV = env;

				jest.resetModules();
				const { inTest, inProduction, inDevelopment } = require('../environment');

				expect({ inTest, inProduction, inDevelopment }).toEqual(expected);
			});
		});

		it('should handle whitespace in NODE_ENV values', () => {
			const testCases = [' test ', 'test ', ' test', '\ttest\t', '\ntest\n'];

			testCases.forEach((env) => {
				process.env.NODE_ENV = env;

				jest.resetModules();
				const { inTest, inProduction, inDevelopment } = require('../environment');

				// Whitespace should not match, so should default to development
				expect(inTest).toBe(false);
				expect(inProduction).toBe(false);
				expect(inDevelopment).toBe(true);
			});
		});
	});

	describe('Runtime Environment Detection', () => {
		it('should provide stable values during module lifetime', () => {
			process.env.NODE_ENV = 'test';

			jest.resetModules();
			const env1 = require('../environment');

			// Change NODE_ENV after module load
			process.env.NODE_ENV = 'production';

			const env2 = require('../environment');

			// Values should remain the same since they're cached at module load
			expect(env1.inTest).toBe(env2.inTest);
			expect(env1.inProduction).toBe(env2.inProduction);
			expect(env1.inDevelopment).toBe(env2.inDevelopment);
		});

		it('should work correctly in different Node.js contexts', () => {
			// Simulate different execution contexts
			const contexts = [
				{ description: 'CI/CD environment', env: 'test' },
				{ description: 'Local development', env: undefined },
				{ description: 'Production deployment', env: 'production' },
				{ description: 'Staging environment', env: 'staging' },
			];

			contexts.forEach(({ description, env }) => {
				if (env === undefined) {
					delete process.env.NODE_ENV;
				} else {
					process.env.NODE_ENV = env;
				}

				jest.resetModules();
				const environment = require('../environment');

				// Verify the environment detection is working
				expect(typeof environment.inTest).toBe('boolean');
				expect(typeof environment.inProduction).toBe('boolean');
				expect(typeof environment.inDevelopment).toBe('boolean');

				// Verify exactly one is true
				const activeFlags = [
					environment.inTest,
					environment.inProduction,
					environment.inDevelopment,
				].filter(Boolean);

				expect(activeFlags).toHaveLength(1);
			});
		});
	});

	describe('Edge Cases and Error Conditions', () => {
		it('should handle NODE_ENV being set to null', () => {
			// @ts-expect-error Testing runtime behavior with invalid types
			process.env.NODE_ENV = null;

			jest.resetModules();
			const { inTest, inProduction, inDevelopment } = require('../environment');

			// null should be treated as falsy and default to development
			expect(inTest).toBe(false);
			expect(inProduction).toBe(false);
			expect(inDevelopment).toBe(true);
		});

		it('should handle NODE_ENV being set to a number', () => {
			// @ts-expect-error Testing runtime behavior with invalid types
			process.env.NODE_ENV = 123;

			jest.resetModules();
			const { inTest, inProduction, inDevelopment } = require('../environment');

			// Numbers should not match expected strings
			expect(inTest).toBe(false);
			expect(inProduction).toBe(false);
			expect(inDevelopment).toBe(true);
		});

		it('should handle very long NODE_ENV values', () => {
			const longValue = 'a'.repeat(10000);
			process.env.NODE_ENV = longValue;

			jest.resetModules();
			const { inTest, inProduction, inDevelopment } = require('../environment');

			// Long values should not cause issues and should default to development
			expect(inTest).toBe(false);
			expect(inProduction).toBe(false);
			expect(inDevelopment).toBe(true);
		});

		it('should handle special characters in NODE_ENV', () => {
			const specialValues = [
				'test@#$%',
				'prod-uction',
				'test.env',
				'test/env',
				'test\\env',
				'test env',
			];

			specialValues.forEach((env) => {
				process.env.NODE_ENV = env;

				jest.resetModules();
				const { inTest, inProduction, inDevelopment } = require('../environment');

				// Special characters should not match and default to development
				expect(inTest).toBe(false);
				expect(inProduction).toBe(false);
				expect(inDevelopment).toBe(true);
			});
		});
	});
});
