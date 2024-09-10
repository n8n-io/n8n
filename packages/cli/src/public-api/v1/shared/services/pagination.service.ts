import { jsonParse } from 'n8n-workflow';
import type {
	CursorPagination,
	OffsetPagination,
	PaginationCursorDecoded,
	PaginationOffsetDecoded,
} from '../../../types';

export const decodeCursor = (cursor: string): PaginationOffsetDecoded | PaginationCursorDecoded => {
	return jsonParse(Buffer.from(cursor, 'base64').toString());
};

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
