import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { scimBodyParser } from '../scim-body-parser';

/**
 * RFC 7644 section 3.1 requires `application/scim+json`, which the global body
 * parser treats as unknown. Without this middleware every SCIM write arrives
 * with an empty body and fails DTO validation, which is how a real identity
 * provider meets it.
 */
describe('scimBodyParser', () => {
	// A plain object, not a deep mock: vitest-mock-extended would stub `body`
	// with a function, so "was it left alone?" could not be observed.
	const run = (contentType: string | undefined, raw: string | undefined) => {
		const req = {
			contentType,
			encoding: 'utf-8' as const,
			rawBody: raw === undefined ? undefined : Buffer.from(raw),
		} as unknown as Request;
		const next = vi.fn();
		void scimBodyParser(req, mock<Response>(), next);
		return { req, next };
	};

	it('parses an application/scim+json body', () => {
		const { req, next } = run('application/scim+json', '{"userName":"ada@example.com"}');

		expect(req.body).toEqual({ userName: 'ada@example.com' });
		expect(next).toHaveBeenCalledWith();
	});

	it('ignores a leading byte order mark', () => {
		const { req } = run('application/scim+json', '﻿{"userName":"ada@example.com"}');

		expect(req.body).toEqual({ userName: 'ada@example.com' });
	});

	it.each(['application/json', 'text/plain', undefined])(
		'leaves %p alone for the global parser',
		(contentType) => {
			const { req, next } = run(contentType, '{"userName":"ada@example.com"}');

			expect(req.body).toBeUndefined();
			expect(next).toHaveBeenCalledWith();
		},
	);

	it('passes a parse failure to the error handler rather than throwing', () => {
		const { next } = run('application/scim+json', '{not json');

		expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
	});
});
