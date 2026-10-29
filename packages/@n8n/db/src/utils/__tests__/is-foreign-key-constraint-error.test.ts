import { QueryFailedError } from '@n8n/typeorm';

import { isForeignKeyConstraintError } from '../is-foreign-key-constraint-error';

describe('isForeignKeyConstraintError', () => {
	const makeQueryFailedError = (
		message: string,
		driverError: { code?: string } = {},
	): QueryFailedError => {
		return new QueryFailedError('Query', [], Object.assign(new Error(message), driverError));
	};

	describe('returns true for actual database foreign-key-constraint violations', () => {
		it('SQLite extended code SQLITE_CONSTRAINT_FOREIGNKEY', () => {
			const error = makeQueryFailedError('FOREIGN KEY constraint failed', {
				code: 'SQLITE_CONSTRAINT_FOREIGNKEY',
			});
			expect(isForeignKeyConstraintError(error)).toBe(true);
		});

		it('SQLite base code SQLITE_CONSTRAINT when message mentions FOREIGN KEY constraint', () => {
			const error = makeQueryFailedError('SQLITE_CONSTRAINT: FOREIGN KEY constraint failed', {
				code: 'SQLITE_CONSTRAINT',
			});
			expect(isForeignKeyConstraintError(error)).toBe(true);
		});

		it('PostgreSQL foreign_key_violation (code 23503)', () => {
			const error = makeQueryFailedError(
				'insert or update on table "annotation_tag_mapping" violates foreign key constraint',
				{ code: '23503' },
			);
			expect(isForeignKeyConstraintError(error)).toBe(true);
		});
	});

	describe('returns false for non-QueryFailedError values', () => {
		it('plain Error whose message mentions "foreign key"', () => {
			const error = new Error('foreign key lookup failed upstream');
			expect(isForeignKeyConstraintError(error)).toBe(false);
		});

		it('non-error values', () => {
			expect(isForeignKeyConstraintError(null)).toBe(false);
			expect(isForeignKeyConstraintError(undefined)).toBe(false);
			expect(isForeignKeyConstraintError('FOREIGN KEY constraint failed')).toBe(false);
		});
	});

	describe('returns false for unrelated database errors', () => {
		it('SQLite base code SQLITE_CONSTRAINT for a UNIQUE violation', () => {
			const error = makeQueryFailedError('UNIQUE constraint failed: workflow_entity.name', {
				code: 'SQLITE_CONSTRAINT',
			});
			expect(isForeignKeyConstraintError(error)).toBe(false);
		});

		it('PostgreSQL unique_violation (code 23505)', () => {
			const error = makeQueryFailedError(
				'duplicate key value violates unique constraint "users_email_key"',
				{ code: '23505' },
			);
			expect(isForeignKeyConstraintError(error)).toBe(false);
		});

		it('QueryFailedError with no driver code', () => {
			const error = makeQueryFailedError('Connection timeout after 30000ms');
			expect(isForeignKeyConstraintError(error)).toBe(false);
		});
	});
});
