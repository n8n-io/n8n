import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

vi.mock('../multipart-parser', () => ({ loadMultipartParser: vi.fn() }));

import { loadMultipartParser } from '../multipart-parser';
import { multipartRequestBody } from '../multipart.request-body';

const mockLoadMultipartParser = vi.mocked(loadMultipartParser);

function fakeFile(fieldname: string): Express.Multer.File {
	return mock<Express.Multer.File>({ fieldname });
}

describe('multipartRequestBody.readInput', () => {
	it('merges text fields with files', () => {
		const req = {
			body: { workflowConflictPolicy: 'new-version' },
			files: [fakeFile('package')],
		} as unknown as Request;

		const input = multipartRequestBody.readInput(req) as Record<string, unknown>;

		expect(input.workflowConflictPolicy).toBe('new-version');
		expect(input.package).toMatchObject({ fieldname: 'package' });
	});

	it('collects several files under the same field name into an array', () => {
		const req = {
			body: {},
			files: [fakeFile('selectedWorkflowIds'), fakeFile('selectedWorkflowIds')],
		} as unknown as Request;

		const input = multipartRequestBody.readInput(req) as Record<string, unknown>;

		expect(Array.isArray(input.selectedWorkflowIds)).toBe(true);
		expect((input.selectedWorkflowIds as unknown[]).length).toBe(2);
	});

	it('merges a files map (req.files as a Record) the same way as an array', () => {
		const req = {
			body: {},
			files: { package: [fakeFile('package')] },
		} as unknown as Request;

		const input = multipartRequestBody.readInput(req) as Record<string, unknown>;

		expect(input.package).toMatchObject({ fieldname: 'package' });
	});

	it('handles a request with no files at all', () => {
		const req = { body: { a: '1' }, files: undefined } as unknown as Request;

		expect(multipartRequestBody.readInput(req)).toEqual({ a: '1' });
	});

	it('turns a part literally named __proto__ into an own key rather than the object prototype', () => {
		// Matches how multer actually builds `req.body` (`Object.create(null)`, then an assignment
		// per field) - a plain `{ __proto__: 'evil' }` literal wouldn't reproduce the same hazard,
		// since object-literal syntax special-cases that key as a prototype-setter instead of a key.
		const body: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
		body.__proto__ = 'evil';
		const req = { body, files: undefined } as unknown as Request;

		const input = multipartRequestBody.readInput(req) as Record<string, unknown>;

		expect(Object.getPrototypeOf(input)).toBeNull();
		expect(Object.prototype.hasOwnProperty.call(input, '__proto__')).toBe(true);
		expect(input.__proto__).toBe('evil');
	});

	it('turns a file part named __proto__ into an own key as well', () => {
		const req = {
			body: {},
			files: [fakeFile('__proto__')],
		} as unknown as Request;

		const input = multipartRequestBody.readInput(req) as Record<string, unknown>;

		expect(Object.prototype.hasOwnProperty.call(input, '__proto__')).toBe(true);
		expect(input.__proto__).toMatchObject({ fieldname: '__proto__' });
	});
});

describe('multipartRequestBody.formatValidationError', () => {
	it('reports an unrecognized key as an unexpected form field', () => {
		const schema = z.object({ workflowConflictPolicy: z.string() }).strict();
		const result = schema.safeParse({ workflowConflictPolicy: 'new-version', evil: 'x' });

		assert(!result.success, 'expected an unrecognized-key error');

		expect(multipartRequestBody.formatValidationError(result.error)).toBe(
			'Unexpected form field "evil"',
		);
	});

	it('falls back to the default formatter for any other issue', () => {
		const schema = z.object({ workflowConflictPolicy: z.string() }).strict();
		const result = schema.safeParse({});

		assert(!result.success, 'expected a required-property error');

		expect(multipartRequestBody.formatValidationError(result.error)).toBe(
			"request/body must have required property 'workflowConflictPolicy'",
		);
	});
});

describe('multipartRequestBody.createMiddleware', () => {
	const media = {
		mediaType: 'multipart/form-data' as const,
		uploadLimits: () => ({ fileSize: 1024 }),
	};

	function fakeReqRes(contentType: string | undefined) {
		const req = { headers: { 'content-type': contentType } } as unknown as Request;
		const res = mock<Response>();
		res.status.mockReturnValue(res);
		const next = vi.fn();
		return { req, res, next };
	}

	beforeEach(() => {
		mockLoadMultipartParser.mockReset();
	});

	it('rejects a non-multipart Content-Type with a 415, without loading the parser', async () => {
		const { req, res, next } = fakeReqRes('application/json');
		const middleware = multipartRequestBody.createMiddleware(media, true);

		await middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(415);
		expect(next).not.toHaveBeenCalled();
		expect(mockLoadMultipartParser).not.toHaveBeenCalled();
	});

	it('skips parsing and calls next() when the body is optional and absent', async () => {
		const { req, res, next } = fakeReqRes(undefined);
		const middleware = multipartRequestBody.createMiddleware(media, false);

		await middleware(req, res, next);

		expect(next).toHaveBeenCalledWith();
		expect(mockLoadMultipartParser).not.toHaveBeenCalled();
	});

	it('parses the body and calls next() on success', async () => {
		mockLoadMultipartParser.mockResolvedValue(
			(_req: Request, _res: Response, done: (e?: unknown) => void) => done(),
		);
		const { req, res, next } = fakeReqRes('multipart/form-data; boundary=XYZ');
		const middleware = multipartRequestBody.createMiddleware(media, true);

		await middleware(req, res, next);

		expect(mockLoadMultipartParser).toHaveBeenCalledWith({ fileSize: 1024 });
		expect(next).toHaveBeenCalledWith();
		expect(res.status).not.toHaveBeenCalled();
	});

	it('maps a parser error to its public API response instead of calling next()', async () => {
		class FakeMulterError extends Error {
			code = 'LIMIT_FILE_SIZE';
			constructor() {
				super('File too large');
				this.name = 'MulterError';
			}
		}
		mockLoadMultipartParser.mockResolvedValue(
			(_req: Request, _res: Response, done: (e?: unknown) => void) => done(new FakeMulterError()),
		);
		const { req, res, next } = fakeReqRes('multipart/form-data; boundary=XYZ');
		const middleware = multipartRequestBody.createMiddleware(media, true);

		await middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(413);
		expect(next).not.toHaveBeenCalled();
	});
});
