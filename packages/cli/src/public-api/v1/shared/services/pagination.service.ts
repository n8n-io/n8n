import { MAX_ITEMS_PER_PAGE } from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type {
	CursorPagination,
	OffsetPagination,
	PaginationCursorDecoded,
	PaginationOffsetDecoded,
} from '../../../types';

export const decodeCursor = (cursor: string): PaginationOffsetDecoded | PaginationCursorDecoded => {
	return jsonParse(Buffer.from(cursor, 'base64').toString());
};

/**
 * Resolves the offset and limit to query with for a list endpoint either from defaults
 * or from a provided cursor.
 */
export function resolveOffsetPagination(query: {
	cursor?: string;
	limit: number;
	offset?: number;
}): { offset: number; limit: number } {
	let { limit } = query;
	let offset = query.offset ?? 0;

	if (query.cursor) {
		try {
			const decoded = decodeCursor(query.cursor);
			if (!('offset' in decoded)) {
				throw new BadRequestError('An invalid cursor was provided');
			}
			offset = decoded.offset;
			limit = decoded.limit;
		} catch {
			throw new BadRequestError('An invalid cursor was provided');
		}
	}

	return { offset, limit };
}

/**
 * Like `resolveOffsetPagination`, but re-validates the decoded cursor's `offset`/`limit`
 * against the same bounds already enforced on the raw query params. A cursor is unsigned
 * base64 a client can forge, so a cursor-only endpoint (no DB-backed `offset`/`limit`
 * validation downstream) must not trust it blindly.
 */
export function resolveOffsetPaginationStrict(query: {
	cursor?: string;
	limit: number;
	offset?: number;
}): { offset: number; limit: number } {
	const { offset, limit } = resolveOffsetPagination(query);

	if (query.cursor) {
		if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1) {
			throw new BadRequestError('An invalid cursor was provided');
		}
		return { offset, limit: Math.min(limit, MAX_ITEMS_PER_PAGE) };
	}

	return { offset, limit };
}

const encodeOffSetPagination = (pagination: OffsetPagination): string | null => {
	if (pagination.numberOfTotalRecords > pagination.offset + pagination.limit) {
		return Buffer.from(
			JSON.stringify({
				limit: pagination.limit,
				offset: pagination.offset + pagination.limit,
			}),
		).toString('base64');
	}
	return null;
};

const encodeCursorPagination = (pagination: CursorPagination): string | null => {
	if (pagination.numberOfNextRecords) {
		return Buffer.from(
			JSON.stringify({
				lastId: pagination.lastId,
				limit: pagination.limit,
			}),
		).toString('base64');
	}
	return null;
};

export const encodeNextCursor = (
	pagination: OffsetPagination | CursorPagination,
): string | null => {
	if ('offset' in pagination) {
		return encodeOffSetPagination(pagination);
	}
	return encodeCursorPagination(pagination);
};

export function paginateArray<T>(
	items: T[],
	{ offset, limit }: { offset: number; limit: number },
): { data: T[]; nextCursor: string | null } {
	return {
		data: items.slice(offset, offset + limit),
		nextCursor: encodeNextCursor({
			offset,
			limit,
			numberOfTotalRecords: items.length,
		}),
	};
}
