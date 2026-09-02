import { escapeLike, LIKE_ESCAPE_CLAUSE } from '@n8n/db';

import { ASK_USER_TOOL_NAME, TOOL_CALL_PART_TYPES } from '../conversation-history-content';

export const ASK_USER_CONTENT_MARKER = `%"toolName":"${ASK_USER_TOOL_NAME}"%`;

export function buildSearchLikePattern(query: string): string {
	return `%${escapeLike(query.toLowerCase())}%`;
}

export function buildVisibleRowCondition(alias: string): string {
	return (
		`(${alias}.role = 'user'` +
		` OR (${alias}.content NOT LIKE :toolCallMarker AND ${alias}.content NOT LIKE :invalidToolCallMarker)` +
		` OR ${alias}.content LIKE :askUserMarker)`
	);
}

export const VISIBLE_ROW_MARKERS = {
	askUserMarker: ASK_USER_CONTENT_MARKER,
	toolCallMarker: `%"type":"${TOOL_CALL_PART_TYPES[0]}"%`,
	invalidToolCallMarker: `%"type":"${TOOL_CALL_PART_TYPES[1]}"%`,
};

export function buildMessageMatchCondition(alias: string): string {
	return (
		`((${alias}.role = 'user' AND LOWER(${alias}.content) LIKE :pattern ${LIKE_ESCAPE_CLAUSE})` +
		` OR (${alias}.role = 'assistant' AND ${alias}.content LIKE :askUserMarker` +
		` AND LOWER(${alias}.content) LIKE :pattern ${LIKE_ESCAPE_CLAUSE}))`
	);
}
