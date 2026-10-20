import { mockInstance } from '@n8n/backend-test-utils';
import { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { ErrorReporter } from 'n8n-core';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ConflictError, ForbiddenError, InternalServerError, NotFoundError } from '@n8n/errors';
import { LicenseEulaRequiredError } from '@/errors/response-errors/license-eula-required.error';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import { reportError, sendErrorResponse } from '@/response-helper';
import { setRouteSandboxSetting } from '@/webhooks/webhook-response-headers';

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

	it('should declare a JSON content type on error responses', () => {
		// Simulate an earlier handler having declared an HTML content type.
		const res = mock<Response>({
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
			get: vi.fn().mockReturnValue('text/html; charset=utf-8'),
		});

		sendErrorResponse(res, new Error('Regular error'));

		expect(res.setHeader).toHaveBeenCalledWith(
			'Content-Type',
			expect.stringContaining('application/json'),
		);
		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				code: 0,
				message: 'Regular error',
			}),
		);
	});

	describe('form pages', () => {
		const responseFor = (originalUrl: string) =>
			mock<Response>({
				req: mock<Request>({ originalUrl }),
				locals: {},
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

		describe('when only form sandboxing is disabled', () => {
			const securityConfig = Container.get(SecurityConfig);

			beforeEach(() => {
				securityConfig.disableFormHtmlSandboxing = true;
			});

			afterEach(() => {
				securityConfig.disableFormHtmlSandboxing = false;
			});

			it('should keep the webhook sandbox on a webhook path that looks like a form path', () => {
				const res = responseFor('/webhook/n8n-form-demo');
				setRouteSandboxSetting(res, 'webhook');

				sendErrorResponse(res, new NotFoundError('not found'));

				expect(res.render).toHaveBeenCalledWith('form-trigger-404', { isTestWebhook: false });
				expect(res.setHeader).toHaveBeenCalledWith(
					'Content-Security-Policy',
					expect.stringContaining('sandbox'),
				);
				expect(res.removeHeader).not.toHaveBeenCalled();
			});

			it('should not sandbox the form 404 page on a form route', () => {
				const res = responseFor('/form/does-not-exist');
				setRouteSandboxSetting(res, 'form');

				sendErrorResponse(res, new NotFoundError('not found'));

				expect(res.render).toHaveBeenCalledWith('form-trigger-404', { isTestWebhook: false });
				expect(res.setHeader).not.toHaveBeenCalledWith(
					'Content-Security-Policy',
					expect.stringContaining('sandbox'),
				);
			});
		});
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
