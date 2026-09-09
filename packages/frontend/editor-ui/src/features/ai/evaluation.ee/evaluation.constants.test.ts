import { describe, it, expect } from 'vitest';

import { resolveCompilationFailureReason } from './evaluation.constants';

describe('resolveCompilationFailureReason', () => {
	it('returns the stored reason for a COMPILATION_FAILED run', () => {
		const result = resolveCompilationFailureReason('COMPILATION_FAILED', {
			reason: 'Cannot auto-determine entry node: workflow trigger has multiple downstream nodes',
		});
		expect(result).toBe(
			'Cannot auto-determine entry node: workflow trigger has multiple downstream nodes',
		);
	});

	it('returns undefined for any other error code, even with a reason present', () => {
		const result = resolveCompilationFailureReason('EVALUATION_TRIGGER_NOT_FOUND', {
			reason: 'should not be surfaced',
		});
		expect(result).toBeUndefined();
	});

	it('returns undefined when errorDetails is missing', () => {
		expect(resolveCompilationFailureReason('COMPILATION_FAILED', undefined)).toBeUndefined();
	});

	it('returns undefined when reason is not a string', () => {
		const result = resolveCompilationFailureReason('COMPILATION_FAILED', { reason: 404 });
		expect(result).toBeUndefined();
	});

	it('returns undefined when reason is an empty string', () => {
		const result = resolveCompilationFailureReason('COMPILATION_FAILED', { reason: '' });
		expect(result).toBeUndefined();
	});
});
