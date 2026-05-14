import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import { RedactionConfig } from '../redaction.config';
import { RedactionEnforcementService } from '../redaction-enforcement.service';

describe('RedactionEnforcementService', () => {
	function createService(enforcement: boolean) {
		const config = new RedactionConfig();
		config.enforcement = enforcement;
		return new RedactionEnforcementService(config);
	}

	describe('isEnforced()', () => {
		test('returns true when env flag is on', () => {
			expect(createService(true).isEnforced()).toBe(true);
		});

		test('returns false when env flag is off', () => {
			expect(createService(false).isEnforced()).toBe(false);
		});
	});

	describe('assertPolicyChangeAllowed()', () => {
		test('does nothing when enforcement is off', () => {
			const service = createService(false);
			expect(() => service.assertPolicyChangeAllowed('none', 'all')).not.toThrow();
		});

		test('does nothing when incoming policy is undefined (field not in payload)', () => {
			const service = createService(true);
			expect(() => service.assertPolicyChangeAllowed('none', undefined)).not.toThrow();
		});

		test('does nothing when incoming policy matches current policy', () => {
			const service = createService(true);
			expect(() => service.assertPolicyChangeAllowed('all', 'all')).not.toThrow();
		});

		test('throws 422 when incoming policy differs from current and enforcement is on', () => {
			const service = createService(true);
			expect(() => service.assertPolicyChangeAllowed('none', 'all')).toThrow(
				UnprocessableRequestError,
			);
		});

		test('throws when current is undefined and incoming is defined', () => {
			const service = createService(true);
			expect(() => service.assertPolicyChangeAllowed(undefined, 'all')).toThrow(
				UnprocessableRequestError,
			);
		});
	});
});
