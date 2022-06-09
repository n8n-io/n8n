import {
	CursorPagination,
	OffsetPagination,
	PaginationCursorDecoded,
	PaginationOffsetDecoded,
} from '../../../types';

export const decodeCursor = (cursor: string): PaginationOffsetDecoded | PaginationCursorDecoded => {
	return JSON.parse(Buffer.from(cursor, 'base64').toString()) as
		| PaginationCursorDecoded
		| PaginationOffsetDecoded;
};

const encodeOffSetPagination = (pagination: OffsetPagination): string | null => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
