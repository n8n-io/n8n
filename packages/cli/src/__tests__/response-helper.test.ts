import { QueryFailedError } from '@n8n/typeorm';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import { LicenseEulaRequiredError } from '@/errors/response-errors/license-eula-required.error';
import { isUniqueConstraintError, sendErrorResponse } from '@/response-helper';

describe('sendErrorResponse', () => {
	let mockResponse: Response;

	beforeEach(() => {
		mockResponse = mock<Response>({
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		});
	});

	it('should include meta field for LicenseEulaRequiredError', () => {
		const eulaUrl = 'https://n8n.io/legal/eula/';
		const error = new LicenseEulaRequiredError('License activation requires EULA acceptance', {
			eulaUrl,
		});

		sendErrorResponse(mockResponse, error);

		expect(mockResponse.status).toHaveBeenCalledWith(400);
		expect(mockResponse.json).toHaveBeenCalledWith(
			expect.objectContaining({
				code: 400,
				message: 'License activation requires EULA acceptance',
				meta: { eulaUrl },
			}),
		);
	});

	it('should not include meta field for regular errors', () => {
		const error = new Error('Regular error');

		sendErrorResponse(mockResponse, error);

		expect(mockResponse.status).toHaveBeenCalledWith(500);
		expect(mockResponse.json).toHaveBeenCalledWith(
			expect.objectContaining({
				code: 0,
				message: 'Regular error',
			}),
		);
		expect(mockResponse.json).toHaveBeenCalledWith(
			expect.not.objectContaining({
				meta: expect.anything(),
			}),
		);
	});
});

describe('isUniqueConstraintError', () => {
	// Helper to create a QueryFailedError with a specific driverError
	const createQueryFailedError = (
		message: string,
		driverError: { code?: string; errno?: number } = {},
	): QueryFailedError => {
		const error = new QueryFailedError('Query', [], driverError as Error);
		error.message = message;
		return error;
	};

	describe('should return true for actual database constraint violations', () => {
		it('returns true for SQLite SQLITE_CONSTRAINT error', () => {
			const error = createQueryFailedError('SQLITE_CONSTRAINT: UNIQUE constraint failed', {
				code: 'SQLITE_CONSTRAINT',
			});
			expect(isUniqueConstraintError(error)).toBe(true);
		});

		it('returns true for SQLite SQLITE_CONSTRAINT_UNIQUE error', () => {
			const error = createQueryFailedError('UNIQUE constraint failed: table.column', {
				code: 'SQLITE_CONSTRAINT_UNIQUE',
			});
			expect(isUniqueConstraintError(error)).toBe(true);
		});

		it('returns true for PostgreSQL unique_violation (code 23505)', () => {
			const error = createQueryFailedError(
				'duplicate key value violates unique constraint "users_email_key"',
				{ code: '23505' },
			);
			expect(isUniqueConstraintError(error)).toBe(true);
		});

		it('returns true for MySQL ER_DUP_ENTRY error', () => {
			const error = createQueryFailedError("Duplicate entry 'value' for key 'PRIMARY'", {
				code: 'ER_DUP_ENTRY',
			});
			expect(isUniqueConstraintError(error)).toBe(true);
		});

		it('returns true for MySQL errno 1062', () => {
			const error = createQueryFailedError("Duplicate entry 'value' for key 'PRIMARY'", {
				errno: 1062,
			});
			expect(isUniqueConstraintError(error)).toBe(true);
		});

		it('returns true for QueryFailedError with "unique constraint" in message', () => {
			const error = createQueryFailedError('unique constraint violation on column "name"');
			expect(isUniqueConstraintError(error)).toBe(true);
		});

		it('returns true for QueryFailedError with "duplicate key value" in message', () => {
			const error = createQueryFailedError('duplicate key value violates constraint');
			expect(isUniqueConstraintError(error)).toBe(true);
		});

		it('returns true for QueryFailedError with "violates unique constraint" in message', () => {
			const error = createQueryFailedError('ERROR: violates unique constraint "idx_name"');
			expect(isUniqueConstraintError(error)).toBe(true);
		});
	});

	describe('should return false for non-database errors (fixes #25012)', () => {
		it('returns false for regular Error with "duplicate" in message', () => {
			const error = new Error('Cannot publish workflow: references workflow "Duplicate Detection"');
			expect(isUniqueConstraintError(error)).toBe(false);
		});

		it('returns false for regular Error with "unique" in message', () => {
			const error = new Error('The value must be unique across all entries');
			expect(isUniqueConstraintError(error)).toBe(false);
		});

		it('returns false for validation error with workflow name containing "Duplicate"', () => {
			const error = new Error(
				'Cannot publish workflow: Node "Execute Workflow" references workflow "Duplicate Detection" which is not published',
			);
			expect(isUniqueConstraintError(error)).toBe(false);
		});

		it('returns false for regular Error even with multiple trigger words', () => {
			const error = new Error('Unique identifier duplicate found in configuration');
			expect(isUniqueConstraintError(error)).toBe(false);
		});

		it('returns false for QueryFailedError without constraint-related error codes or patterns', () => {
			const error = createQueryFailedError('Connection timeout after 30000ms');
			expect(isUniqueConstraintError(error)).toBe(false);
		});

		it('returns false for QueryFailedError with unrelated error code', () => {
			const error = createQueryFailedError('Table not found', { code: 'ER_NO_SUCH_TABLE' });
			expect(isUniqueConstraintError(error)).toBe(false);
		});
	});
});
