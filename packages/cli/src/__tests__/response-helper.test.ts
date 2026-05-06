import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { LicenseEulaRequiredError } from '@/errors/response-errors/license-eula-required.error';
import { sendErrorResponse } from '@/response-helper';

describe('sendErrorResponse', () => {
	let mockResponse: Response;

	beforeEach(() => {
		mockResponse = mock<Response>({
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
			render: jest.fn().mockReturnThis(),
			req: { originalUrl: '' } as any,
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

	it('should escape HTML in message when rendering form-trigger-409', () => {
		mockResponse.req.originalUrl = '/form-waiting/abc123';
		const error = new ConflictError('<img src=x onerror=alert(1)>');

		sendErrorResponse(mockResponse, error);

		expect(mockResponse.render).toHaveBeenCalledWith('form-trigger-409', {
			message: '&lt;img src=x onerror=alert(1)&gt;',
		});
	});

	it('should escape template syntax in message when rendering form-trigger-409', () => {
		mockResponse.req.originalUrl = '/form-waiting/abc123';
		const error = new ConflictError('{{constructor.constructor("return this")()}}');

		sendErrorResponse(mockResponse, error);

		expect(mockResponse.render).toHaveBeenCalledWith('form-trigger-409', {
			message: '{{constructor.constructor(&quot;return this&quot;)()}}',
		});
	});
});
