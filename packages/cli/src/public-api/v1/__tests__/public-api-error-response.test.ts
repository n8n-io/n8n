import type { Response } from 'express';
import { BadRequest, Unauthorized } from 'express-openapi-validator/dist/framework/types';
import { UnexpectedError, UserError, OperationalError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowPublishBlockedError } from '@/errors/response-errors/workflow-publish-blocked.error';

import { sendPublicApiErrorResponse } from '../public-api-error-response';

describe('sendPublicApiErrorResponse', () => {
	const createMockRes = () => {
		const payload: { statusCode?: number; body?: unknown } = {};
		const res = {
			_payload: payload,
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

	it('maps express-openapi-validator HttpError using status', () => {
		const res = createMockRes();
		const err = new BadRequest({ path: '/x', message: 'schema failed' });
		sendPublicApiErrorResponse(res, err);
		expect(res._payload.statusCode).toBe(400);
		expect(res._payload.body).toEqual({ message: 'schema failed' });
	});

	describe('Unauthorized', () => {
		it('includes error message from express-openpapi-validator in response when no token header or session cookie sent', () => {
			const res = createMockRes();
			const err = new Unauthorized({
				path: '/api/v1/insights/summary',
				message: "'X-N8N-API-KEY' header required",
			});
			sendPublicApiErrorResponse(res, err);
			expect(res._payload.statusCode).toBe(401);
			expect(res._payload.body).toEqual({ message: "'X-N8N-API-KEY' header required" });
		});

		it('does not tell user who tried to authorize to public API with session cookie that token is required for auth', () => {
			const res = createMockRes();
			const err = new Unauthorized({
				path: '/api/v1/insights/summary',
				message: "'X-N8N-API-KEY' header required",
			});
			sendPublicApiErrorResponse(res, err, { hasSessionCookie: true });
			expect(res._payload.statusCode).toBe(401);
			expect(res._payload.body).toEqual({ message: 'Unauthorized' });
		});
	});

	it('maps unknown errors to 500 with a generic message', () => {
		const res = createMockRes();
		sendPublicApiErrorResponse(res, new Error('plain'));
		expect(res._payload.statusCode).toBe(500);
		expect(res._payload.body).toEqual({ message: 'Internal server error' });
	});
});
