import { BadRequestError } from '@/errors/response-errors/bad-request.error';

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
});
