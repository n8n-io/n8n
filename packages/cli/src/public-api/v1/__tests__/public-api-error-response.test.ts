import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { Response } from 'express';
import { ErrorReporter } from 'n8n-core';
import { UnexpectedError, UserError, OperationalError } from 'n8n-workflow';

import { BadRequestError, ConflictError, InternalServerError, NotFoundError } from '@n8n/errors';
import { WorkflowPublishBlockedError } from '@/errors/response-errors/workflow-publish-blocked.error';

import { sendPublicApiErrorResponse } from '../public-api-error-response';

describe('sendPublicApiErrorResponse', () => {
	const logger = mockInstance(Logger);
	const errorReporter = mockInstance(ErrorReporter);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	const createMockRes = (req?: object) => {
		const payload: { statusCode?: number; body?: unknown } = {};
		const res = {
			_payload: payload,
			req,
			status: vi.fn(),
			json: vi.fn(),
		};
		res.status.mockImplementation((code: number) => {
			payload.statusCode = code;
			return res;
		});
		res.json.mockImplementation((body: unknown) => {
			payload.body = body;
			return res;
		});
		return res as typeof res & Response;
	};

	it('maps ResponseError using httpStatusCode', () => {
		const res = createMockRes();
		sendPublicApiErrorResponse(res, new NotFoundError('missing'));
		expect(res._payload.statusCode).toBe(404);
		expect(res._payload.body).toEqual({ message: 'missing' });
	});

	it('maps BadRequestError (ResponseError) to 400', () => {
		const res = createMockRes();
		sendPublicApiErrorResponse(res, new BadRequestError('invalid'));
		expect(res._payload.statusCode).toBe(400);
		expect(res._payload.body).toEqual({ message: 'invalid' });
	});

	it('maps ConflictError to 409', () => {
		const res = createMockRes();
		sendPublicApiErrorResponse(res, new ConflictError('managed declaratively'));
		expect(res._payload.statusCode).toBe(409);
		expect(res._payload.body).toEqual({ message: 'managed declaratively' });
	});

	it('returns the review request that is blocking publication', () => {
		const res = createMockRes();
		sendPublicApiErrorResponse(
			res,
			new WorkflowPublishBlockedError({
				reason: 'review_pending',
				workflowReviewRequestId: 'review-1',
			}),
		);

		expect(res._payload.statusCode).toBe(409);
		expect(res._payload.body).toEqual({
			message: expect.stringContaining('review is open'),
			reason: 'review_pending',
			workflowReviewRequestId: 'review-1',
		});
	});

	it('maps UserError to 400', () => {
		const res = createMockRes();
		sendPublicApiErrorResponse(res, new UserError('bad input'));
		expect(res._payload.statusCode).toBe(400);
		expect(res._payload.body).toEqual({ message: 'bad input' });
	});

	it('maps OperationalError to 500 with a generic message', () => {
		const res = createMockRes();
		sendPublicApiErrorResponse(res, new OperationalError('temporarily down'));
		expect(res._payload.statusCode).toBe(500);
		expect(res._payload.body).toEqual({ message: 'Internal server error' });
	});

	it('maps UnexpectedError to 500 with a generic message', () => {
		const res = createMockRes();
		sendPublicApiErrorResponse(res, new UnexpectedError('internal bug'));
		expect(res._payload.statusCode).toBe(500);
		expect(res._payload.body).toEqual({ message: 'Internal server error' });
	});

	it('maps unknown errors to 500 with a generic message', () => {
		const res = createMockRes();
		sendPublicApiErrorResponse(res, new Error('plain'));
		expect(res._payload.statusCode).toBe(500);
		expect(res._payload.body).toEqual({ message: 'Internal server error' });
	});

	describe('reporting', () => {
		it('logs and reports an unknown error, and keeps the generic body', () => {
			const res = createMockRes();
			sendPublicApiErrorResponse(res, new Error('plain'));

			expect(res._payload.statusCode).toBe(500);
			expect(res._payload.body).toEqual({ message: 'Internal server error' });
			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(errorReporter.error).toHaveBeenCalledTimes(1);
			expect(errorReporter.error).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'plain' }),
				expect.objectContaining({ shouldBeLogged: false, tags: { source: 'public-api' } }),
			);
		});

		it('logs and reports an UnexpectedError', () => {
			const res = createMockRes();
			sendPublicApiErrorResponse(res, new UnexpectedError('internal bug'));

			expect(res._payload.body).toEqual({ message: 'Internal server error' });
			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(errorReporter.error).toHaveBeenCalledTimes(1);
		});

		it('logs and reports an OperationalError, which maps to a server error', () => {
			const res = createMockRes();
			sendPublicApiErrorResponse(res, new OperationalError('temporarily down'));

			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(errorReporter.error).toHaveBeenCalledTimes(1);
		});

		it('logs and reports a 5xx ResponseError', () => {
			const res = createMockRes();
			sendPublicApiErrorResponse(res, new InternalServerError('database exploded'));

			expect(res._payload.statusCode).toBe(500);
			expect(logger.error).toHaveBeenCalledTimes(1);
			expect(errorReporter.error).toHaveBeenCalledTimes(1);
		});

		it.each([
			['NotFoundError', new NotFoundError('missing')],
			['BadRequestError', new BadRequestError('invalid')],
			['ConflictError', new ConflictError('conflict')],
			['UserError', new UserError('bad input')],
		])('does not log or report a client error (%s)', (_name, error) => {
			const res = createMockRes();
			sendPublicApiErrorResponse(res, error);

			expect(logger.error).not.toHaveBeenCalled();
			expect(errorReporter.error).not.toHaveBeenCalled();
		});

		it('scrubs secrets from the logged message and stack', () => {
			const res = createMockRes();
			sendPublicApiErrorResponse(
				res,
				new Error(
					'Upstream call to https://api.example.com/hook?token=abc failed with Bearer abcdefghijklmnop',
				),
			);

			const [loggedMessage, loggedMeta] = logger.error.mock.calls[0];
			const loggedStack = loggedMeta?.stack;
			expect(loggedMessage).not.toContain('abcdefghijklmnop');
			expect(loggedMessage).not.toContain('token=');
			expect(loggedStack).toEqual(expect.any(String));
			expect(loggedStack).not.toContain('abcdefghijklmnop');
			expect(loggedStack).not.toContain('token=abc');
		});

		it('logs method, route and userId, and no request URL, headers or body', () => {
			const res = createMockRes({
				method: 'POST',
				baseUrl: '/api/v1',
				path: '/workflows/123',
				route: { path: '/workflows/:workflowId' },
				originalUrl: '/api/v1/workflows/123?apiKey=query-secret-value',
				headers: { 'x-n8n-api-key': 'header-secret-value' },
				body: { password: 'body-secret-value' },
				user: { id: 'user-1' },
			});
			sendPublicApiErrorResponse(res, new Error('boom'));

			expect(logger.error).toHaveBeenCalledWith(
				'Public API request failed (POST /api/v1/workflows/:workflowId): Error: boom',
				{
					method: 'POST',
					route: '/api/v1/workflows/:workflowId',
					userId: 'user-1',
					errorName: 'Error',
					stack: expect.any(String),
				},
			);
			expect(errorReporter.error).toHaveBeenCalledWith(
				expect.any(Error),
				expect.objectContaining({
					extra: {
						method: 'POST',
						route: '/api/v1/workflows/:workflowId',
						userId: 'user-1',
					},
				}),
			);

			const serialized = JSON.stringify([logger.error.mock.calls, errorReporter.error.mock.calls]);
			expect(serialized).not.toContain('query-secret-value');
			expect(serialized).not.toContain('header-secret-value');
			expect(serialized).not.toContain('body-secret-value');
			expect(serialized).not.toContain('originalUrl');
		});

		it('falls back to the request path when no route template is set', () => {
			const res = createMockRes({
				method: 'GET',
				baseUrl: '/api/v1',
				path: '/workflows/123',
			});
			sendPublicApiErrorResponse(res, new Error('boom'));

			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining('GET /api/v1/workflows/123'),
				expect.objectContaining({ route: '/api/v1/workflows/123', userId: undefined }),
			);
		});

		it('still sends the response when the logger throws', () => {
			logger.error.mockImplementation(() => {
				throw new Error('logger unavailable');
			});
			const res = createMockRes();
			sendPublicApiErrorResponse(res, new Error('plain'));

			expect(res._payload.statusCode).toBe(500);
			expect(res._payload.body).toEqual({ message: 'Internal server error' });
		});

		it('reports an error when the response has no request', () => {
			const res = createMockRes();
			sendPublicApiErrorResponse(res, new Error('plain'));

			expect(logger.error).toHaveBeenCalledWith(
				'Public API request failed (undefined ): Error: plain',
				expect.objectContaining({ method: undefined, route: '', userId: undefined }),
			);
			expect(errorReporter.error).toHaveBeenCalledTimes(1);
		});
	});
});
