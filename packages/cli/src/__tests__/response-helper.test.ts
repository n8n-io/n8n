import { mockInstance } from '@n8n/backend-test-utils';
import { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import express, { type Request, type Response } from 'express';
import { ErrorReporter } from 'n8n-core';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ConflictError, ForbiddenError, InternalServerError, NotFoundError } from '@n8n/errors';
import { LicenseEulaRequiredError } from '@/errors/response-errors/license-eula-required.error';
import { PolicyViolationError } from '@/policy/policy-violation.error';
import {
	reportError,
	send,
	sendErrorResponse,
	sendStreamToResponse,
	sendSuccessResponse,
} from '@/response-helper';
import { setRouteSandboxSetting } from '@/webhooks/webhook-response-headers';
import {
	createLargeTempFile,
	disconnectBeforeResponse,
	failingStream,
	readFirstChunkAndDisconnect,
	readWholeBody,
	startServer,
	waitForClose,
} from '@test/file-stream-server';

describe('sendErrorResponse', () => {
	let mockResponse: Response;

	beforeEach(() => {
		mockResponse = mock<Response>({
			headersSent: false,
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		});
	});

	it('should destroy the response instead of writing to it when the headers are already sent', () => {
		const startedResponse = mock<Response>({ headersSent: true });

		sendErrorResponse(startedResponse, new Error('read failed'));

		expect(startedResponse.destroy).toHaveBeenCalled();
		expect(startedResponse.status).not.toHaveBeenCalled();
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
			headersSent: false,
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
				headersSent: false,
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

describe('sendSuccessResponse', () => {
	describe('with a file stream', () => {
		let file: Awaited<ReturnType<typeof createLargeTempFile>>;
		let server: Awaited<ReturnType<typeof startServer>> | undefined;

		beforeAll(async () => {
			file = await createLargeTempFile();
		});

		afterEach(async () => {
			await server?.close();
			server = undefined;
		});

		afterAll(async () => {
			await file.remove();
		});

		it('should send the whole file', async () => {
			const stream = await file.openStream();
			server = await startServer((_req, res) => {
				sendSuccessResponse(res as unknown as Response, stream);
			});

			expect(await readWholeBody(server.url)).toBe(file.sizeInBytes);
			expect(await waitForClose(stream)).toBe(true);
		});

		it('should close the file when the client disconnects during the download', async () => {
			const stream = await file.openStream();
			server = await startServer((_req, res) => {
				sendSuccessResponse(res as unknown as Response, stream);
			});

			await readFirstChunkAndDisconnect(server.url);

			expect(await waitForClose(stream)).toBe(true);
		});

		it('should end the response when the file fails during the download', async () => {
			const stream = failingStream(3);
			server = await startServer((_req, res) => {
				sendSuccessResponse(res as unknown as Response, stream);
			});

			await expect(readWholeBody(server.url)).rejects.toThrow();
			expect(stream.destroyed).toBe(true);
		});

		it('should resolve when the client disconnects after the whole file was read', async () => {
			const stream = await file.openStream();
			let sending: Promise<void> | undefined;
			server = await startServer((_req, res) => {
				stream.once('end', () => res.destroy());
				sending = sendStreamToResponse(res as unknown as Response, stream);
			});

			await readWholeBody(server.url).catch(() => {});

			await expect(sending).resolves.toBeUndefined();
		});

		it('should reject with the file error when the file fails as the client disconnects', async () => {
			const stream = await file.openStream();
			let sending: Promise<void> | undefined;
			server = await startServer((_req, res) => {
				res.once('close', () => stream.destroy(new Error('read failed')));
				sending = sendStreamToResponse(res as unknown as Response, stream);
			});

			await readFirstChunkAndDisconnect(server.url);

			await expect(sending).rejects.toThrow('read failed');
		});

		it('should send an error response when the file fails before the first chunk', async () => {
			const app = express();
			app.get('/', (_req, res) => sendSuccessResponse(res, failingStream(0)));
			server = await startServer(app);

			const response = await fetch(server.url);

			expect(response.status).toBe(500);
			expect(await response.json()).toMatchObject({ message: 'read failed' });
		});

		it('should close the file when the client disconnected before the response started', async () => {
			const stream = await file.openStream();
			let startedHandling = () => {};
			const handling = new Promise<undefined>((resolve) => {
				startedHandling = () => resolve(undefined);
			});
			server = await startServer((_req, res) => {
				res.once('close', () => sendSuccessResponse(res as unknown as Response, stream));
				startedHandling();
			});

			await disconnectBeforeResponse(server.url, handling);

			expect(await waitForClose(stream)).toBe(true);
		});
	});
});

describe('send', () => {
	let server: Awaited<ReturnType<typeof startServer>> | undefined;

	afterEach(async () => {
		await server?.close();
		server = undefined;
	});

	it('should end the response without an error response when the handler fails after the response started', async () => {
		let handled: Promise<void> | undefined;
		const app = express();
		app.get('/', (req, res) => {
			handled = send(async (_req, startedRes) => {
				startedRes.write('partial');
				throw new Error('read failed');
			})(req, res);
		});
		server = await startServer(app);

		await expect(readWholeBody(server.url)).rejects.toThrow();
		await expect(handled).resolves.toBeUndefined();
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
