import { QueryFailedError } from '@n8n/typeorm';

import { isUniqueConstraintError } from '../is-unique-constraint-error';

describe('isUniqueConstraintError', () => {
	const makeQueryFailedError = (
		message: string,
		driverError: { code?: string } = {},
	): QueryFailedError => {
		return new QueryFailedError('Query', [], Object.assign(new Error(message), driverError));
	};

	describe('returns true for actual database unique-constraint violations', () => {
		it('SQLite extended code SQLITE_CONSTRAINT_UNIQUE', () => {
			const error = makeQueryFailedError('UNIQUE constraint failed: workflow_entity.name', {
				code: 'SQLITE_CONSTRAINT_UNIQUE',
			});
			expect(isUniqueConstraintError(error)).toBe(true);
		});

		it('SQLite base code SQLITE_CONSTRAINT when message mentions UNIQUE constraint', () => {
			const error = makeQueryFailedError(
				'SQLITE_CONSTRAINT: UNIQUE constraint failed: workflow_entity.name',
				{ code: 'SQLITE_CONSTRAINT' },
			);
			expect(isUniqueConstraintError(error)).toBe(true);
		});

		it('PostgreSQL unique_violation (code 23505)', () => {
			const error = makeQueryFailedError(
				'duplicate key value violates unique constraint "users_email_key"',
				{ code: '23505' },
			);
			expect(isUniqueConstraintError(error)).toBe(true);
		});
	});

	describe('returns false for non-QueryFailedError values', () => {
		it('plain Error whose message mentions "unique" and "duplicate"', () => {
			const error = new Error('Unique identifier duplicate found in configuration');
			expect(isUniqueConstraintError(error)).toBe(false);
		});

		it('non-error values', () => {
			expect(isUniqueConstraintError(null)).toBe(false);
			expect(isUniqueConstraintError(undefined)).toBe(false);
			expect(isUniqueConstraintError('UNIQUE constraint failed')).toBe(false);
		});
	});

	describe('returns false for unrelated database errors', () => {
		it('SQLite base code SQLITE_CONSTRAINT for a NOT NULL violation', () => {
			const error = makeQueryFailedError('NOT NULL constraint failed: workflow_entity.name', {
				code: 'SQLITE_CONSTRAINT',
			});
			expect(isUniqueConstraintError(error)).toBe(false);
		});

		it('PostgreSQL not_null_violation (code 23502)', () => {
			const error = makeQueryFailedError('null value in column violates not-null constraint', {
				code: '23502',
			});
			expect(isUniqueConstraintError(error)).toBe(false);
		});

		it('QueryFailedError with no driver code', () => {
			const error = makeQueryFailedError('Connection timeout after 30000ms');
			expect(isUniqueConstraintError(error)).toBe(false);
		});
	});
});
