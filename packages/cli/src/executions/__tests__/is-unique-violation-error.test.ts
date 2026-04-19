import { QueryFailedError } from '@n8n/typeorm';

import { isUniqueViolationError } from '@/executions/is-unique-violation-error';

describe('isUniqueViolationError', () => {
	const makeQueryFailedError = (code?: string, driverMessage = 'driver error') => {
		const driverError =
			code !== undefined
				? Object.assign(new Error(driverMessage), { code })
				: new Error(driverMessage);
		return new QueryFailedError('Query', [], driverError);
	};

	it('returns true for Postgres unique-violation code "23505"', () => {
		const error = makeQueryFailedError('23505');
		expect(isUniqueViolationError(error)).toBe(true);
	});

	it('returns true for SQLite unique-violation code "SQLITE_CONSTRAINT_UNIQUE"', () => {
		const error = makeQueryFailedError('SQLITE_CONSTRAINT_UNIQUE');
		expect(isUniqueViolationError(error)).toBe(true);
	});

	it('returns true for SQLite base code "SQLITE_CONSTRAINT" when the message indicates a unique violation', () => {
		const error = makeQueryFailedError(
			'SQLITE_CONSTRAINT',
			'SQLITE_CONSTRAINT: UNIQUE constraint failed: execution_entity.deduplicationKey',
		);
		expect(isUniqueViolationError(error)).toBe(true);
	});

	it('returns false for SQLite base code "SQLITE_CONSTRAINT" when the message indicates a non-unique violation', () => {
		const error = makeQueryFailedError(
			'SQLITE_CONSTRAINT',
			'SQLITE_CONSTRAINT: FOREIGN KEY constraint failed',
		);
		expect(isUniqueViolationError(error)).toBe(false);
	});

	it('returns false for unrelated QueryFailedError code', () => {
		const error = makeQueryFailedError('23502'); // not-null violation
		expect(isUniqueViolationError(error)).toBe(false);
	});

	it('returns false for QueryFailedError without a driver error code', () => {
		const error = makeQueryFailedError();
		expect(isUniqueViolationError(error)).toBe(false);
	});

	it('returns false for a plain Error', () => {
		expect(isUniqueViolationError(new Error('boom'))).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(isUniqueViolationError(undefined)).toBe(false);
	});

	it('returns false for null', () => {
		expect(isUniqueViolationError(null)).toBe(false);
	});
});
