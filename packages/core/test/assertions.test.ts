import { assertValidDate } from '@/assertions';
import { ApplicationError } from 'n8n-workflow';

describe('assertions', () => {
	describe('assertValidDate', () => {
		it('should throw if the candidate is not a date', () => {
			expect(() => assertValidDate(null)).toThrowError(
				new ApplicationError('Found invalid date', { extra: { date: null } }),
			);
		});

		it('should throw if the candidate is an invalid date', () => {
			expect(() => assertValidDate(new Date('invalid'))).toThrowError(
				new ApplicationError('Found invalid date', { extra: { date: new Date('invalid') } }),
			);
		});

		it('should not throw if the candidate is a valid date', () => {
			expect(() => assertValidDate(new Date())).not.toThrow();
		});
	});
});
