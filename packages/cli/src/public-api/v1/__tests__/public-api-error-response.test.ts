import { BadRequest } from 'express-openapi-validator/dist/framework/types';
import type { Response } from 'express';
import { UnexpectedError, UserError, OperationalError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { sendPublicApiErrorResponse } from '../public-api-error-response';

describe('sendPublicApiErrorResponse', () => {
	const createMockRes = () => {
		const payload: { statusCode?: number; body?: unknown } = {};
		const res = {
			_payload: payload,
			status: jest.fn(),
			json: jest.fn(),
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

	it('maps unknown errors to 500 with a generic message', () => {
		const res = createMockRes();
		sendPublicApiErrorResponse(res, new Error('plain'));
		expect(res._payload.statusCode).toBe(500);
		expect(res._payload.body).toEqual({ message: 'Internal server error' });
	});
});
