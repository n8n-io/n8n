import 'reflect-metadata';

import { DryRunContext, CONTEXT_DRY_RUN } from '../dry-run-context';

/**
 * Tests for DryRunContext
 * @author Claude Sonnet 4.5
 * @date 2025-01-05
 */

describe('DryRunContext', () => {
	describe('business logic', () => {
		it('[BL-01] should create context with pass mode', () => {
			// ARRANGE & ACT
			const context = new DryRunContext('pass');

			// ASSERT
			expect(context.mode).toBe('pass');
			expect(context.override).toBeUndefined();
			expect(context.errorCode).toBeUndefined();
			expect(context.errorMessage).toBeUndefined();
		});

		it('[BL-02] should create context with override mode', () => {
			// ARRANGE & ACT
			const context = new DryRunContext('override', 'Mock translation result');

			// ASSERT
			expect(context.mode).toBe('override');
			expect(context.override).toBe('Mock translation result');
			expect(context.errorCode).toBeUndefined();
			expect(context.errorMessage).toBeUndefined();
		});

		it('[BL-03] should create context with fail mode', () => {
			// ARRANGE & ACT
			const context = new DryRunContext('fail', undefined, 500, 'Internal server error');

			// ASSERT
			expect(context.mode).toBe('fail');
			expect(context.override).toBeUndefined();
			expect(context.errorCode).toBe(500);
			expect(context.errorMessage).toBe('Internal server error');
		});

		it('[BL-04] should freeze instance after construction', () => {
			// ARRANGE & ACT
			const context = new DryRunContext('pass');

			// ASSERT
			expect(Object.isFrozen(context)).toBe(true);

			// Verify property modification fails
			expect(() => {
				(context as { mode: string }).mode = 'override';
			}).toThrow();
		});

		it('[BL-05] should validate successfully for pass mode without extra fields', () => {
			// ARRANGE
			const context = new DryRunContext('pass');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
		});

		it('[BL-06] should validate successfully for override mode with override text', () => {
			// ARRANGE
			const context = new DryRunContext('override', 'Test response');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
		});

		it('[BL-07] should validate successfully for fail mode with error details', () => {
			// ARRANGE
			const context = new DryRunContext('fail', undefined, 404, 'Not found');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
		});

		it('[BL-08] should return correct log metadata for pass mode', () => {
			// ARRANGE
			const context = new DryRunContext('pass');

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				dryRunMode: 'pass',
				override: undefined,
				errorCode: undefined,
				errorMessage: undefined,
			});
		});

		it('[BL-09] should return correct log metadata for override mode', () => {
			// ARRANGE
			const context = new DryRunContext('override', 'Overridden text');

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				dryRunMode: 'override',
				override: 'Overridden text',
				errorCode: undefined,
				errorMessage: undefined,
			});
		});

		it('[BL-10] should return correct log metadata for fail mode', () => {
			// ARRANGE
			const context = new DryRunContext('fail', undefined, 503, 'Service unavailable');

			// ACT
			const metadata = context.asLogMetadata();

			// ASSERT
			expect(metadata).toEqual({
				dryRunMode: 'fail',
				override: undefined,
				errorCode: 503,
				errorMessage: 'Service unavailable',
			});
		});
	});

	describe('edge cases', () => {
		it('[EC-01] should handle empty string for override in override mode', () => {
			// ARRANGE
			const context = new DryRunContext('override', '');

			// ACT & ASSERT
			// Empty string is falsy but might be valid - code checks !this.override
			expect(() => context.throwIfInvalid()).toThrow('override is required for dryRun mode "override"');
		});

		it('[EC-02] should handle minimum error code (100)', () => {
			// ARRANGE
			const context = new DryRunContext('fail', undefined, 100, 'Continue');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
			expect(context.errorCode).toBe(100);
		});

		it('[EC-03] should handle maximum error code (599)', () => {
			// ARRANGE
			const context = new DryRunContext('fail', undefined, 599, 'Network error');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).not.toThrow();
			expect(context.errorCode).toBe(599);
		});

		it('[EC-04] should handle empty error message in fail mode', () => {
			// ARRANGE
			const context = new DryRunContext('fail', undefined, 400, '');

			// ACT & ASSERT
			// Empty string is falsy - code checks !this.errorMessage
			expect(() => context.throwIfInvalid()).toThrow('errorMessage is required for dryRun mode "fail"');
		});
	});

	describe('error handling', () => {
		it('[EH-01] should throw when pass mode has override field set', () => {
			// ARRANGE
			const context = new DryRunContext('pass', 'should not be here');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('override, errorCode, and errorMessage must not be set for dryRun mode "pass"');
		});

		it('[EH-02] should throw when pass mode has errorCode field set', () => {
			// ARRANGE
			const context = new DryRunContext('pass', undefined, 400);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('override, errorCode, and errorMessage must not be set for dryRun mode "pass"');
		});

		it('[EH-03] should throw when pass mode has errorMessage field set', () => {
			// ARRANGE
			const context = new DryRunContext('pass', undefined, undefined, 'Error');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('override, errorCode, and errorMessage must not be set for dryRun mode "pass"');
		});

		it('[EH-04] should throw when pass mode has all extra fields set', () => {
			// ARRANGE
			const context = new DryRunContext('pass', 'override', 500, 'Error message');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('override, errorCode, and errorMessage must not be set for dryRun mode "pass"');
		});

		it('[EH-05] should throw when override mode has no override text', () => {
			// ARRANGE
			const context = new DryRunContext('override');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('override is required for dryRun mode "override"');
		});

		it('[EH-06] should throw when override mode has errorCode set', () => {
			// ARRANGE
			const context = new DryRunContext('override', 'Valid override', 400);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('errorCode and errorMessage must not be set for dryRun mode "override"');
		});

		it('[EH-07] should throw when override mode has errorMessage set', () => {
			// ARRANGE
			const context = new DryRunContext('override', 'Valid override', undefined, 'Error');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('errorCode and errorMessage must not be set for dryRun mode "override"');
		});

		it('[EH-08] should throw when override mode has both error fields set', () => {
			// ARRANGE
			const context = new DryRunContext('override', 'Valid override', 404, 'Not found');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('errorCode and errorMessage must not be set for dryRun mode "override"');
		});

		it('[EH-09] should throw when fail mode has no errorCode', () => {
			// ARRANGE
			const context = new DryRunContext('fail', undefined, undefined, 'Error message');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('errorCode is required for dryRun mode "fail"');
		});

		it('[EH-10] should throw when fail mode has no errorMessage', () => {
			// ARRANGE
			const context = new DryRunContext('fail', undefined, 500);

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('errorMessage is required for dryRun mode "fail"');
		});

		it('[EH-11] should throw when fail mode has override field set', () => {
			// ARRANGE
			const context = new DryRunContext('fail', 'Should not be here', 500, 'Error');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('override must not be set for dryRun mode "fail"');
		});

		it('[EH-12] should throw when fail mode missing both errorCode and errorMessage', () => {
			// ARRANGE
			const context = new DryRunContext('fail');

			// ACT & ASSERT
			expect(() => context.throwIfInvalid()).toThrow('errorCode is required for dryRun mode "fail"');
		});
	});

	describe('CONTEXT_DRY_RUN node properties', () => {
		it('[NP-01] should export dry run mode property with correct configuration', () => {
			// ARRANGE
			const modeProperty = CONTEXT_DRY_RUN[0];

			// ASSERT
			expect(modeProperty).toBeDefined();
			expect(modeProperty.displayName).toBe('Dry Run Mode');
			expect(modeProperty.name).toBe('dry_run_context_mode');
			expect(modeProperty.type).toBe('options');
			expect(modeProperty.default).toBe('pass');
		});

		it('[NP-02] should have three dry run mode options', () => {
			// ARRANGE
			const modeProperty = CONTEXT_DRY_RUN[0] as { options: unknown[] };

			// ASSERT
			expect(modeProperty.options).toHaveLength(3);
		});

		it('[NP-03] should have pass mode option configured correctly', () => {
			// ARRANGE
			const modeProperty = CONTEXT_DRY_RUN[0] as {
				options: Array<{ name: string; value: string; description: string }>;
			};
			const passOption = modeProperty.options[0];

			// ASSERT
			expect(passOption).toEqual({
				name: 'Pass Through',
				value: 'pass',
				description: 'Process the request normally without any dry run modifications',
			});
		});

		it('[NP-04] should have override mode option configured correctly', () => {
			// ARRANGE
			const modeProperty = CONTEXT_DRY_RUN[0] as {
				options: Array<{ name: string; value: string; description: string }>;
			};
			const overrideOption = modeProperty.options[1];

			// ASSERT
			expect(overrideOption).toEqual({
				name: 'Override Response',
				value: 'override',
				description: 'Return a predefined response instead of making an actual request',
			});
		});

		it('[NP-05] should have fail mode option configured correctly', () => {
			// ARRANGE
			const modeProperty = CONTEXT_DRY_RUN[0] as {
				options: Array<{ name: string; value: string; description: string }>;
			};
			const failOption = modeProperty.options[2];

			// ASSERT
			expect(failOption).toEqual({
				name: 'Simulate Failure',
				value: 'fail',
				description: 'Simulate a failed request with a predefined error code and message',
			});
		});

		it('[NP-06] should export override response property with correct configuration', () => {
			// ARRANGE
			const overrideProperty = CONTEXT_DRY_RUN[1];

			// ASSERT
			expect(overrideProperty.displayName).toBe('Override Response');
			expect(overrideProperty.name).toBe('dry_run_context_override');
			expect(overrideProperty.type).toBe('string');
			expect(overrideProperty.default).toBe('');
		});

		it('[NP-07] should only show override response when override mode selected', () => {
			// ARRANGE
			const overrideProperty = CONTEXT_DRY_RUN[1];

			// ASSERT
			expect(overrideProperty.displayOptions?.show?.dry_run_context_mode).toEqual(['override']);
		});

		it('[NP-08] should export error code property with correct configuration', () => {
			// ARRANGE
			const errorCodeProperty = CONTEXT_DRY_RUN[2];

			// ASSERT
			expect(errorCodeProperty.displayName).toBe('Error Code');
			expect(errorCodeProperty.name).toBe('dry_run_context_error_code');
			expect(errorCodeProperty.type).toBe('number');
			expect(errorCodeProperty.default).toBe(400);
		});

		it('[NP-09] should only show error code when fail mode selected', () => {
			// ARRANGE
			const errorCodeProperty = CONTEXT_DRY_RUN[2];

			// ASSERT
			expect(errorCodeProperty.displayOptions?.show?.dry_run_context_mode).toEqual(['fail']);
		});

		it('[NP-10] should export error message property with correct configuration', () => {
			// ARRANGE
			const errorMessageProperty = CONTEXT_DRY_RUN[3];

			// ASSERT
			expect(errorMessageProperty.displayName).toBe('Error Message');
			expect(errorMessageProperty.name).toBe('dry_run_context_error_message');
			expect(errorMessageProperty.type).toBe('string');
			expect(errorMessageProperty.default).toBe('Simulated error');
		});

		it('[NP-11] should only show error message when fail mode selected', () => {
			// ARRANGE
			const errorMessageProperty = CONTEXT_DRY_RUN[3];

			// ASSERT
			expect(errorMessageProperty.displayOptions?.show?.dry_run_context_mode).toEqual(['fail']);
		});

		it('[NP-12] should export exactly four properties', () => {
			// ASSERT
			expect(CONTEXT_DRY_RUN).toHaveLength(4);
		});
	});
});
