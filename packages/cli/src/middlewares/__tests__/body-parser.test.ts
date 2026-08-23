import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';
import { Readable } from 'stream';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { rawBodyReader } from '../body-parser';

/** Build a request backed by a real readable stream carrying `payload`. */
const mockRequest = (payload = '', headers: Record<string, string> = {}) => {
	const req = Readable.from([Buffer.from(payload)]) as unknown as Request;
	req.headers = headers;
	return req;
};

describe('rawBodyReader', () => {
	const next = vi.fn();

	const readRawBody = async (req: Request) => {
		void rawBodyReader(req, mock<Response>(), next);
		await req.readRawBody();
	};

	it('reads the body from a readable stream', async () => {
		const req = mockRequest('hello');
		await readRawBody(req);
		expect(req.rawBody.toString()).toBe('hello');
		expect(req._body).toBe(true);
	});

	it('rejects a non-readable stream with BadRequestError', async () => {
		const req = mockRequest('hello');
		req.destroy();
		await expect(readRawBody(req)).rejects.toThrow(BadRequestError);
	});

	it('maps a raw-body "stream.not.readable" rejection to BadRequestError', async () => {
		const req = mockRequest('hello');
		// Simulate the abort racing the read: readable when our guard checks, but
		// no longer readable by the time raw-body reads it (its own guard rejects
		// with type 'stream.not.readable').
		let reads = 0;
		Object.defineProperty(req, 'readable', { get: () => ++reads === 1 });
		await expect(readRawBody(req)).rejects.toThrow(BadRequestError);
	});

	it('maps a raw-body "request.aborted" rejection to BadRequestError', async () => {
		// A stream that aborts mid-read: raw-body rejects with type 'request.aborted'.
		const req = new Readable({ read() {} }) as unknown as Request;
		req.headers = {};
		const promise = readRawBody(req);
		req.emit('aborted');

		await expect(promise).rejects.toMatchObject({
			constructor: BadRequestError,
			cause: { type: 'request.aborted' },
		});
	});
});
