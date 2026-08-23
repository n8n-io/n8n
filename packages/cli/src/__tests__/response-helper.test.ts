import { mockInstance } from '@n8n/backend-test-utils';
import type { Response } from 'express';
import { ErrorReporter } from 'n8n-core';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { LicenseEulaRequiredError } from '@/errors/response-errors/license-eula-required.error';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import { reportError, sendErrorResponse } from '@/response-helper';

describe('sendErrorResponse', () => {
	let mockResponse: Response;

	beforeEach(() => {
		mockResponse = mock<Response>({
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
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

describe('reportError', () => {
	const errorReporter = mockInstance(ErrorReporter);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('skips a client error that extends ResponseError', () => {
		reportError(new ForbiddenError('Nope'));

		expect(errorReporter.error).not.toHaveBeenCalled();
	});

	it('skips a client error that only duck-types ResponseError', () => {
		reportError(
			new PolicyViolationError([
				{ kind: 'node-type-unavailable', checkId: 'check', message: 'blocked' },
			]),
		);

		expect(errorReporter.error).not.toHaveBeenCalled();
	});

	it('reports a server error', () => {
		const error = new InternalServerError('Broken');

		reportError(error);

		expect(errorReporter.error).toHaveBeenCalledWith(error, undefined);
	});

	it('reports an error carrying no response fields', () => {
		const error = new UserError('Something the user did');

		reportError(error);

		expect(errorReporter.error).toHaveBeenCalledWith(error, undefined);
	});
});
