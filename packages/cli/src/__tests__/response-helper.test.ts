import { QueryFailedError } from '@n8n/db';
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

	describe('returns false for errors that previously triggered false positives (#25012)', () => {
		it('plain Error whose message mentions a workflow named "Duplicate Detection"', () => {
			const error = new Error(
				'Cannot publish workflow: Node "Execute Workflow" references workflow "Duplicate Detection" which is not published',
			);
			expect(isUniqueConstraintError(error)).toBe(false);
		});

		it('plain Error whose message mentions "unique"', () => {
			const error = new Error('The value must be unique across all entries');
			expect(isUniqueConstraintError(error)).toBe(false);
		});

		it('plain Error mentioning both trigger words', () => {
			const error = new Error('Unique identifier duplicate found in configuration');
			expect(isUniqueConstraintError(error)).toBe(false);
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
