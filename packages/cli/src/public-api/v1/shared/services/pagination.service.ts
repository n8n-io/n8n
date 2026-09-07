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
export function resolveOffsetPagination({
	cursor,
	limit: queryLimit,
	offset: queryOffset,
}: {
	cursor?: string;
	limit: number;
	offset?: number;
}): { offset: number; limit: number } {
	let limit = queryLimit;
	let offset = queryOffset ?? 0;

	if (cursor) {
		try {
			const decoded = decodeCursor(cursor);
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
