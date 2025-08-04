'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.encodeNextCursor = exports.decodeCursor = void 0;
const n8n_workflow_1 = require('n8n-workflow');
const decodeCursor = (cursor) => {
	return (0, n8n_workflow_1.jsonParse)(Buffer.from(cursor, 'base64').toString());
};
exports.decodeCursor = decodeCursor;
const encodeOffSetPagination = (pagination) => {
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
const encodeCursorPagination = (pagination) => {
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
const encodeNextCursor = (pagination) => {
	if ('offset' in pagination) {
		return encodeOffSetPagination(pagination);
	}
	return encodeCursorPagination(pagination);
};
exports.encodeNextCursor = encodeNextCursor;
//# sourceMappingURL=pagination.service.js.map
