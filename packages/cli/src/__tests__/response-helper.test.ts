import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { LicenseEulaRequiredError } from '@/errors/response-errors/license-eula-required.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { sendErrorResponse } from '@/response-helper';

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

	describe('form pages', () => {
		const responseFor = (originalUrl: string) =>
			mock<Response>({
				req: mock<Request>({ originalUrl }),
				status: vi.fn().mockReturnThis(),
				json: vi.fn().mockReturnThis(),
				render: vi.fn().mockReturnThis(),
			});

		it('should sandbox the form 404 page', () => {
			const res = responseFor('/form/does-not-exist');

			sendErrorResponse(res, new NotFoundError('not found'));

			expect(res.render).toHaveBeenCalledWith('form-trigger-404', { isTestWebhook: false });
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Security-Policy',
				expect.stringContaining('sandbox'),
			);
		});

		it('should sandbox the form 409 page', () => {
			const res = responseFor('/form-waiting/123');

			sendErrorResponse(res, new ConflictError('already finished'));

			expect(res.render).toHaveBeenCalledWith('form-trigger-409', { message: 'already finished' });
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Security-Policy',
				expect.stringContaining('sandbox'),
			);
		});
	});
});
