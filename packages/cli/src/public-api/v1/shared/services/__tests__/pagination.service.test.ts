import { BadRequestError } from '@n8n/errors';

import { resolveOffsetPagination } from '../pagination.service';

function encodeCursor(payload: object): string {
	return Buffer.from(JSON.stringify(payload)).toString('base64');
}

describe('resolveOffsetPagination', () => {
	it('defaults offset to 0 when no cursor or offset is given', () => {
		expect(resolveOffsetPagination({ limit: 50 })).toEqual({ offset: 0, limit: 50 });
	});

	it('uses the query offset when no cursor is given', () => {
		expect(resolveOffsetPagination({ limit: 50, offset: 20 })).toEqual({ offset: 20, limit: 50 });
	});

	it('treats an empty cursor string as no cursor', () => {
		expect(resolveOffsetPagination({ limit: 50, offset: 10, cursor: '' })).toEqual({
			offset: 10,
			limit: 50,
		});
	});

	it('overrides the query offset and limit with the decoded cursor', () => {
		const cursor = encodeCursor({ offset: 40, limit: 25 });

		expect(resolveOffsetPagination({ limit: 50, offset: 10, cursor })).toEqual({
			offset: 40,
			limit: 25,
		});
	});

	it('keeps the query limit when the decoded cursor has a limit of 0', () => {
		const cursor = encodeCursor({ offset: 40, limit: 0 });

		expect(resolveOffsetPagination({ limit: 100, cursor })).toEqual({ offset: 40, limit: 100 });
	});

	it('throws BadRequestError for an undecodable cursor', () => {
		expect(() => resolveOffsetPagination({ limit: 50, cursor: 'not-a-valid-cursor' })).toThrow(
			BadRequestError,
		);
	});

	it('throws BadRequestError for a cursor that decodes to valid but unexpected JSON', () => {
		const cursor = Buffer.from('null').toString('base64');

		expect(() => resolveOffsetPagination({ limit: 50, cursor })).toThrow(BadRequestError);
	});

	it('throws BadRequestError for a cursor without an offset (lastId-shaped)', () => {
		const cursor = encodeCursor({ lastId: 'abc123', limit: 25 });

		expect(() => resolveOffsetPagination({ limit: 50, cursor })).toThrow(
			'An invalid cursor was provided',
		);
	});

	it('throws BadRequestError for a cursor with a negative offset', () => {
		const cursor = encodeCursor({ offset: -1, limit: 25 });

		expect(() => resolveOffsetPagination({ limit: 50, cursor })).toThrow(BadRequestError);
	});

	it('throws BadRequestError for a cursor with a non-integer offset', () => {
		for (const offset of [2.5, '0', null]) {
			const cursor = encodeCursor({ offset, limit: 25 });

			expect(() => resolveOffsetPagination({ limit: 50, cursor })).toThrow(BadRequestError);
		}
	});

	it('throws BadRequestError for a cursor with a limit beyond the page cap', () => {
		const cursor = encodeCursor({ offset: 0, limit: 1000000 });

		expect(() => resolveOffsetPagination({ limit: 50, cursor })).toThrow(BadRequestError);
	});

	it('throws BadRequestError for a cursor with a non-integer or negative limit', () => {
		for (const limit of [1.5, -5]) {
			const cursor = encodeCursor({ offset: 0, limit });

			expect(() => resolveOffsetPagination({ limit: 50, cursor })).toThrow(BadRequestError);
		}
	});

	it('accepts a cursor carrying the maximum page limit', () => {
		const cursor = encodeCursor({ offset: 250, limit: 250 });

		expect(resolveOffsetPagination({ limit: 50, cursor })).toEqual({ offset: 250, limit: 250 });
	});
});
